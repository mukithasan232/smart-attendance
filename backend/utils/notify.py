"""
notify.py — Async email notification module for the Security System.

Sends SMTP email alerts (with optional snapshot attachment) when unknown or
known faces are detected. All SMTP credentials are read from config.py /
environment variables so they can be updated at runtime via the settings API.

Usage:
    from notify import send_email_alert
    await send_email_alert(
        subject="🚨 Unknown Person Detected",
        body="An unregistered face was detected at 10:45 AM.",
        image_path="http://.../snapshot.jpg",
    )
"""

import asyncio
import smtplib
import importlib
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Optional

from loguru import logger


def _get_smtp_config() -> dict:
    """Re-import config each call so runtime updates via the settings API take effect."""
    from backend.core import config
    importlib.reload(config)
    return {
        "enabled": config.SMTP_ENABLED,
        "host": config.SMTP_HOST,
        "port": config.SMTP_PORT,
        "use_tls": config.SMTP_USE_TLS,
        "user": config.SMTP_USER,
        "password": config.SMTP_PASSWORD,
        "from_addr": config.SMTP_FROM or config.SMTP_USER,
        "to_emails": config.SMTP_TO_EMAILS,
    }


def _build_message(
    subject: str,
    body: str,
    from_addr: str,
    to_emails: list[str],
    image_path: Optional[str] = None,
) -> MIMEMultipart:
    """Construct a MIME email message, optionally attaching a JPEG snapshot."""
    msg = MIMEMultipart("related")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = ", ".join(to_emails)

    # HTML body with optional inline image
    if image_path:
        is_url = image_path.startswith("http")
        img_tag = f'<img src="{image_path}" style="max-width:600px;border-radius:8px;" />' if is_url else '<img src="cid:snapshot" style="max-width:600px;border-radius:8px;" />'
        html_body = f"""
        <html><body>
          <p style="font-family:sans-serif;font-size:14px;">{body}</p>
          <br/>
          {img_tag}
        </body></html>
        """
    else:
        html_body = f"""
        <html><body>
          <p style="font-family:sans-serif;font-size:14px;">{body}</p>
        </body></html>
        """

    msg.attach(MIMEText(html_body, "html"))

    # Attach snapshot as inline image if it's a local file
    if image_path and not image_path.startswith("http"):
        p = Path(image_path)
        if p.exists():
            try:
                with open(p, "rb") as f:
                    img = MIMEImage(f.read(), name=p.name)
                img.add_header("Content-ID", "<snapshot>")
                img.add_header("Content-Disposition", "inline", filename=p.name)
                msg.attach(img)
            except Exception as exc:
                logger.warning("Could not attach snapshot to email: {}", exc)

    return msg


def _send_sync(cfg: dict, msg: MIMEMultipart) -> None:
    """Blocking SMTP send — called from thread executor so it doesn't block the event loop."""
    if cfg["use_tls"]:
        server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=15)
        server.ehlo()
        server.starttls()
        server.ehlo()
    else:
        server = smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=15)

    if cfg["user"] and cfg["password"]:
        server.login(cfg["user"], cfg["password"])

    server.sendmail(cfg["from_addr"], cfg["to_emails"], msg.as_string())
    server.quit()


async def send_email_alert(
    subject: str,
    body: str,
    image_path: Optional[str] = None,
) -> bool:
    """
    Send an email alert asynchronously.

    Returns True on success, False on failure or if SMTP is disabled.
    Never raises — failures are logged as warnings.
    """
    cfg = _get_smtp_config()

    if not cfg["enabled"]:
        return False

    if not cfg["to_emails"]:
        logger.warning("SMTP_TO_EMAILS is empty — skipping email alert.")
        return False

    if not cfg["user"] or not cfg["password"]:
        logger.warning("SMTP credentials not configured — skipping email alert.")
        return False

    try:
        msg = _build_message(subject, body, cfg["from_addr"], cfg["to_emails"], image_path)
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _send_sync, cfg, msg)
        logger.info("Email alert sent → {}", cfg["to_emails"])
        return True
    except Exception as exc:
        logger.warning("Email alert failed: {}", exc)
        return False
