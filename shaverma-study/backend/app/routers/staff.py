from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.deps import require_roles
from app.models import Order, Staff
from app.schemas import OrderStatusUpdate
from app.serializers import order_to_dict

router = APIRouter()

ALLOWED = {
    "cashier": {("new", "cooking"), ("ready", "completed")},
    "cook": {("cooking", "ready")},
    "director": {
        ("new", "cooking"),
        ("cooking", "ready"),
        ("ready", "completed"),
    },
}


@router.get("/staff/orders")
def list_orders(
    staff: Staff = Depends(require_roles("cashier", "cook", "director")),
    db: Session = Depends(get_db),
):
    orders = db.scalars(
        select(Order).options(selectinload(Order.items)).order_by(Order.id.desc()).limit(100)
    ).all()
    return [order_to_dict(order) for order in orders]


@router.patch("/staff/orders/{order_id}/status")
def update_status(
    order_id: int,
    payload: OrderStatusUpdate,
    staff: Staff = Depends(require_roles("cashier", "cook", "director")),
    db: Session = Depends(get_db),
):
    order = db.scalar(select(Order).options(selectinload(Order.items)).where(Order.id == order_id))
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status == payload.status:
        return order_to_dict(order)

    if payload.status == "cancelled":
        allowed = staff.role in {"cashier", "director"} and order.status not in {"completed", "cancelled"}
    else:
        allowed = (order.status, payload.status) in ALLOWED[staff.role]
    if not allowed:
        raise HTTPException(status_code=409, detail="Status transition is not allowed for this role")

    order.status = payload.status
    db.commit()
    db.refresh(order)
    return order_to_dict(order)
