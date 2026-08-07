import asyncio
from bot import send_text_to_admin

async def main():
    print("Sending test alert...")
    await send_text_to_admin("✅ <b>Test Alert</b>\n\nThis is a test message from your Smart Security System. Your Telegram integration is working successfully!")
    print("Sent!")

if __name__ == "__main__":
    asyncio.run(main())
