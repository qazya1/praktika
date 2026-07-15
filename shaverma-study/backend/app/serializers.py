from app.models import Order


def order_to_dict(order: Order) -> dict:
    return {
        "id": order.id,
        "source": order.source,
        "customer_name": order.customer_name,
        "phone": order.phone,
        "status": order.status,
        "total": float(order.total),
        "created_at": order.created_at.isoformat(),
        "items": [
            {
                "product_id": item.product_id,
                "name": item.product_name,
                "price": float(item.price),
                "quantity": item.quantity,
            }
            for item in order.items
        ],
    }
