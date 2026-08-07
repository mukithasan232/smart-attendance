"""
bot.py — Telegram Bot integration for the Smart Security System.

Alert flow for UNKNOWN faces:
  1. VisionEngine detects unknown face → save snapshot → log event in DB
  2. This module sends a photo message to the admin with inline buttons:
       [✅ Add as Known]   [❌ Ignore]
  3. Admin clicks [Add as Known] → bot asks: "Please reply with the name for this person:"
  4. Admin types: "John Smith"
  5. Bot fetches the stored embedding from the events table, creates a new
     person record, and reloads the VisionEngine cache.
  6. Admin sees a confirmation: "✅ John Smith has been registered."

  If [Ignore] is clicked, the alert is dismissed (event buffer_status → 'ignored').

Uses python-telegram-bot v22+ (async / Application pattern).
Webhook mode: FastAPI receives Telegram updates and dispatches them here.
Polling mode: Can also be used for local testing without a public URL.
"""

import asyncio
from datetime import datetime
from pathlib import Path
from typing import Optional

from loguru import logger
from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.error import TelegramError

from config import TELEGRAM_ADMIN_ID, TELEGRAM_BOT_TOKEN

# ── State machine ──────────────────────────────────────────────────────────────
# Tracks admin chats that are currently in the "waiting for name" state.
# Maps:  admin_chat_id (int)  →  event_id (int)
_pending_name_input: dict[int, int] = {}


# ── Bot factory ────────────────────────────────────────────────────────────────

def get_bot() -> Bot:
    """Return a configured Bot instance (lightweight, no polling started)."""
    if not TELEGRAM_BOT_TOKEN:
        raise RuntimeError(
            "TELEGRAM_BOT_TOKEN is not set. Configure it in your .env file."
        )
    return Bot(token=TELEGRAM_BOT_TOKEN)


# ── Sending alerts ─────────────────────────────────────────────────────────────

async def send_unknown_face_alert(
    snapshot_path: str,
    event_id: int,
    timestamp: Optional[datetime] = None,
) -> Optional[int]:
    """
    Send an unknown-face security alert to the admin chat.

    The message includes:
      • The snapshot photo
      • Timestamp and event ID in the caption
      • Two inline action buttons: [✅ Add as Known] and [❌ Ignore]

    Args:
        snapshot_path: Absolute path to the face snapshot JPEG.
        event_id:      Row ID in the events table (used in callback data).
        timestamp:     When the face was detected (defaults to now).

    Returns:
        The Telegram message_id of the sent photo, or None on failure.
    """
    if not _bot_is_configured():
        return None

    ts_str = (timestamp or datetime.now()).strftime("%Y-%m-%d %H:%M:%S")
    caption = (
        f"🚨 <b>Unknown Visitor Detected!</b>\n\n"
        f"🕐 <b>Time:</b> {ts_str}\n"
        f"📷 <b>Event ID:</b> #{event_id}\n\n"
        f"<i>Please identify this person using the buttons below.</i>"
    )

    keyboard = InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton(
                    "✅ Add as Known",
                    callback_data=f"add_known_{event_id}",
                ),
                InlineKeyboardButton(
                    "❌ Ignore",
                    callback_data=f"ignore_{event_id}",
                ),
            ]
        ]
    )

    try:
        bot = get_bot()
        if snapshot_path.startswith("http"):
            msg = await bot.send_photo(
                chat_id=TELEGRAM_ADMIN_ID,
                photo=snapshot_path,
                caption=caption,
                parse_mode="HTML",
                reply_markup=keyboard,
            )
        else:
            with open(snapshot_path, "rb") as photo_file:
                msg = await bot.send_photo(
                    chat_id=TELEGRAM_ADMIN_ID,
                    photo=photo_file,
                    caption=caption,
                    parse_mode="HTML",
                    reply_markup=keyboard,
                )
        logger.info(
            "Alert sent to Telegram | event_id={} msg_id={}", event_id, msg.message_id
        )
        return msg.message_id

    except TelegramError as exc:
        logger.error("Telegram send_photo failed: {}", exc)
        return None
    except FileNotFoundError:
        logger.error("Snapshot not found: {}", snapshot_path)
        return None


async def send_text_to_admin(text: str) -> None:
    """Send a plain-text message to the admin chat."""
    if not _bot_is_configured():
        return
    try:
        bot = get_bot()
        await bot.send_message(
            chat_id=TELEGRAM_ADMIN_ID,
            text=text,
            parse_mode="HTML",
        )
    except TelegramError as exc:
        logger.error("Telegram send_message failed: {}", exc)


# ── Update handlers ────────────────────────────────────────────────────────────

async def handle_callback_query(update: Update) -> dict:
    """
    Process an inline keyboard button press from the admin.

    Callback data formats:
      add_known_<event_id>  — admin clicked [✅ Add as Known]
      ignore_<event_id>     — admin clicked [❌ Ignore]

    Returns:
        A dict describing the action taken — consumed by main.py to drive
        DB updates and VisionEngine cache reloads.
    """
    query = update.callback_query
    if query is None or query.data is None:
        return {"action": "noop"}

    # Acknowledge the callback immediately (removes the Telegram spinner)
    await query.answer()

    data = query.data
    logger.info("Callback received: {}", data)

    # ── Add as Known ──────────────────────────────────────────────────────────
    if data.startswith("add_known_"):
        try:
            event_id = int(data.removeprefix("add_known_"))
        except ValueError:
            logger.error("Invalid callback data: {}", data)
            return {"action": "noop"}

        admin_id = (
            query.from_user.id if query.from_user else TELEGRAM_ADMIN_ID
        )
        # Register admin as awaiting a name reply
        _pending_name_input[admin_id] = event_id

        # Remove the action buttons so admin can't double-click
        await query.edit_message_reply_markup(reply_markup=None)

        # Prompt admin for the person's name
        bot = get_bot()
        await bot.send_message(
            chat_id=TELEGRAM_ADMIN_ID,
            text=(
                f"👤 Please reply with the <b>name</b> for this person.\n\n"
                f"<i>Example: John Smith</i>"
            ),
            parse_mode="HTML",
        )
        return {"action": "awaiting_name", "event_id": event_id}

    # ── Ignore ────────────────────────────────────────────────────────────────
    if data.startswith("ignore_"):
        try:
            event_id = int(data.removeprefix("ignore_"))
        except ValueError:
            logger.error("Invalid callback data: {}", data)
            return {"action": "noop"}

        # Update caption and remove buttons
        await query.edit_message_caption(
            caption="🚫 <i>Alert dismissed by admin.</i>",
            parse_mode="HTML",
            reply_markup=None,
        )
        return {"action": "ignore", "event_id": event_id}

    logger.warning("Unrecognised callback data: {}", data)
    return {"action": "unknown", "data": data}


async def handle_text_message(update: Update) -> dict:
    """
    Process a text reply from the admin during the name-entry state.

    Expected input:  Any non-empty string (e.g., "John Smith", "Delivery Guy")

    Returns:
        A dict with the registration info for main.py to act on, or
        {"action": "noop"} if the message is irrelevant.
    """
    if update.message is None or update.message.text is None:
        return {"action": "noop"}

    sender_id = update.message.from_user.id if update.message.from_user else None

    # Ignore messages from anyone other than the configured admin
    if sender_id != TELEGRAM_ADMIN_ID:
        logger.warning("Message from non-admin id={} — ignoring.", sender_id)
        return {"action": "noop"}

    # Not in a pending registration state
    if sender_id not in _pending_name_input:
        return {"action": "noop"}

    event_id = _pending_name_input.pop(sender_id)
    name = update.message.text.strip()

    if not name:
        # Put admin back into pending state and ask again
        _pending_name_input[sender_id] = event_id
        bot = get_bot()
        await bot.send_message(
            chat_id=TELEGRAM_ADMIN_ID,
            text=(
                "⚠️ Name cannot be empty. Please reply with the person's name.\n"
                "<i>Example: John Smith</i>"
            ),
            parse_mode="HTML",
        )
        return {"action": "invalid_input"}

    logger.info(
        "Name received for registration | event_id={} name={}", event_id, name
    )
    return {
        "action": "register",
        "event_id": event_id,
        "name": name,
    }


# ── Webhook registration ───────────────────────────────────────────────────────

async def set_webhook(webhook_url: str) -> bool:
    """
    Register the FastAPI webhook URL with Telegram.
    The endpoint path must be /api/telegram/webhook (handled in main.py).
    """
    if not _bot_is_configured():
        return False
    try:
        bot = get_bot()
        full_url = f"{webhook_url.rstrip('/')}/api/telegram/webhook"
        await bot.set_webhook(url=full_url)
        logger.info("Telegram webhook registered: {}", full_url)
        return True
    except TelegramError as exc:
        logger.error("Failed to set webhook: {}", exc)
        return False


async def delete_webhook() -> None:
    """
    Remove the webhook (switch to polling for local testing without ngrok).
    """
    if not _bot_is_configured():
        return
    try:
        bot = get_bot()
        await bot.delete_webhook()
        logger.info("Telegram webhook removed.")
    except TelegramError as exc:
        logger.error("Failed to delete webhook: {}", exc)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _bot_is_configured() -> bool:
    """Return True only if both the token and admin ID are properly set."""
    if not TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN not set — skipping Telegram operation.")
        return False
    if not TELEGRAM_ADMIN_ID:
        logger.warning("TELEGRAM_ADMIN_ID not set — skipping Telegram operation.")
        return False
    return True
