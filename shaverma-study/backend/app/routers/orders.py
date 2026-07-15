from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.deps import current_user
from app.models import Order, OrderItem, Product, User
from app.notifications import notify_order_created
from app.schemas import OrderCreate
from app.serializers import order_to_dict

router = APIRouter()


@router.get("/orders/me")
def my_orders(user: User = Depends(current_user), db: Session = Depends(get_db)):
    orders = db.scalars(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.user_id == user.id)
        .order_by(Order.id.desc())
    ).all()
    return [order_to_dict(order) for order in orders]


@router.post("/orders", status_code=201)
async def create_order(
    payload: OrderCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    quantities: dict[int, int] = {}
    for item in payload.items:
        quantities[item.product_id] = quantities.get(item.product_id, 0) + item.quantity
        if quantities[item.product_id] > 20:
            raise HTTPException(status_code=422, detail="Too many units of one product")

    products = db.scalars(
        select(Product).where(Product.id.in_(quantities), Product.active.is_(True))
    ).all()
    product_map = {product.id: product for product in products}
    if set(product_map) != set(quantities):
        raise HTTPException(status_code=400, detail="Unknown or inactive product")

    total = sum((product_map[pid].price * quantity for pid, quantity in quantities.items()), Decimal("0"))
    order = Order(
        user_id=user.id,
        source=user.platform,
        customer_name=payload.customer_name,
        phone=payload.phone,
        total=total,
    )
    for product_id, quantity in quantities.items():
        product = product_map[product_id]
        order.items.append(
            OrderItem(
                product_id=product.id,
                product_name=product.name,
                price=product.price,
                quantity=quantity,
            )
        )
    db.add(order)
    db.commit()
    db.refresh(order)
    await notify_order_created(order)
    return order_to_dict(order)
