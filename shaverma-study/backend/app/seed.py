from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Product, Staff
from app.security import hash_password


PRODUCTS = [
    ("Шаурма", "Классическая шаурма", "Курица, овощи и фирменный соус", "290.00"),
    ("Шаурма", "Сырная шаурма", "Курица, сыр, овощи и соус", "330.00"),
    ("Горячее", "Люля-кебаб", "Люля из говядины с луком", "390.00"),
    ("Горячее", "Картофель фри", "Хрустящий картофель", "160.00"),
    ("Напитки", "Морс", "Ягодный морс 0,5 л", "120.00"),
]

STAFF = [
    ("cashier", "cashier123", "cashier", "Кассир"),
    ("cook", "cook123", "cook", "Повар"),
    ("director", "director123", "director", "Директор"),
]


def seed(db: Session) -> None:
    if db.scalar(select(Product.id).limit(1)) is None:
        for category, name, description, price in PRODUCTS:
            db.add(Product(category=category, name=name, description=description, price=Decimal(price)))

    existing = set(db.scalars(select(Staff.username)).all())
    for username, password, role, name in STAFF:
        if username not in existing:
            db.add(Staff(username=username, password_hash=hash_password(password), role=role, name=name))
    db.commit()
