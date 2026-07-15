from __future__ import annotations

import asyncio
from typing import Any

import httpx

from app.config import get_settings


def order_message(order: dict[str, Any]) -> str:
    items = "\n".join(f"• {item['name']} × {item['quantity']}" for item in order.get("items", []))
    return (
        f"Новый заказ №{order['id']}\n"
        f"Клиент: {order['customer_name']}\n"
        f"Источник: {order['source']}\n"
        f"Сумма: {order['total']:.2f} ₽\n\n{items}"
    )


async def send_telegram(chat_id: str, text: str) -> None:
    settings = get_settings()
    if not settings.telegram_bot_token:
        return
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
            json={"chat_id": chat_id, "text": text},
        )
        response.raise_for_status()


async def _send_max(recipient_key: str, recipient_id: str, text: str) -> None:
    settings = get_settings()
    if not settings.max_bot_token:
        return
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            f"{settings.max_api_base.rstrip('/')}/messages",
            params={recipient_key: recipient_id},
            headers={"Authorization": settings.max_bot_token},
            json={"text": text},
        )
        response.raise_for_status()


async def send_max(chat_id: str, text: str) -> None:
    await _send_max("chat_id", chat_id, text)


async def send_max_user(user_id: str, text: str) -> None:
    await _send_max("user_id", user_id, text)


async def notify_staff(order: dict[str, Any]) -> None:
    settings = get_settings()
    text = order_message(order)
    tasks = [send_telegram(chat_id, text) for chat_id in settings.ids(settings.telegram_staff_chat_ids)]
    tasks += [send_max(chat_id, text) for chat_id in settings.ids(settings.max_staff_chat_ids)]
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)


async def telegram_poll_loop() -> None:
    settings = get_settings()
    if not settings.enable_polling or not settings.telegram_bot_token:
        return
    offset = 0
    while True:
        try:
            async with httpx.AsyncClient(timeout=35) as client:
                response = await client.get(
                    f"https://api.telegram.org/bot{settings.telegram_bot_token}/getUpdates",
                    params={"offset": offset, "timeout": 25},
                )
                for update in response.json().get("result", []):
                    offset = max(offset, int(update["update_id"]) + 1)
                    message = update.get("message") or {}
                    text = str(message.get("text") or "")
                    chat_id = message.get("chat", {}).get("id")
                    if chat_id and text.startswith("/start"):
                        await send_telegram(str(chat_id), f"Откройте приложение: {settings.frontend_url}")
        except Exception:
            await asyncio.sleep(3)


async def max_poll_loop() -> None:
    settings = get_settings()
    if not settings.enable_polling or not settings.max_bot_token:
        return
    marker: str | None = None
    while True:
        try:
            params = {"timeout": "25"}
            if marker:
                params["marker"] = marker
            async with httpx.AsyncClient(timeout=35) as client:
                response = await client.get(
                    f"{settings.max_api_base.rstrip('/')}/updates",
                    params=params,
                    headers={"Authorization": settings.max_bot_token},
                )
                data = response.json()
                marker = data.get("marker") or marker
                for update in data.get("updates", []):
                    if update.get("update_type") == "bot_started":
                        user_id = update.get("user_id") or update.get("user", {}).get("user_id")
                        if user_id:
                            await send_max_user(str(user_id), f"Откройте приложение: {settings.frontend_url}")
        except Exception:
            await asyncio.sleep(3)
