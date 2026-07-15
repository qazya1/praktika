import httpx

from app.config import get_settings
from app.models import Order
from app.serializers import order_to_dict


async def notify_order_created(order: Order) -> None:
    settings = get_settings()
    if not settings.manager_url:
        return
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            await client.post(
                f"{settings.manager_url.rstrip('/')}/internal/order-created",
                headers={"X-Internal-Key": settings.internal_key},
                json=order_to_dict(order),
            )
    except httpx.HTTPError:
        # Мессенджер — вспомогательный канал. Создание заказа не должно откатываться.
        return
