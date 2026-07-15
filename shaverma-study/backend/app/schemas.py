from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class MessengerLogin(BaseModel):
    platform: Literal["telegram", "max"]
    init_data: str = Field(min_length=1)


class StaffLogin(BaseModel):
    username: str
    password: str


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, le=20)


class OrderCreate(BaseModel):
    customer_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(default="", max_length=30)
    items: list[OrderItemCreate] = Field(min_length=1, max_length=50)


class OrderStatusUpdate(BaseModel):
    status: Literal["new", "cooking", "ready", "completed", "cancelled"]


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str | None = None
    name: str


class ProductOut(BaseModel):
    id: int
    category: str
    name: str
    description: str
    image_url: str = ""
    price: Decimal

    model_config = {"from_attributes": True}
