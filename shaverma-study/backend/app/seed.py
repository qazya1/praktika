from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Product, Staff
from app.security import hash_password


PRODUCTS = [
    ("Шаурма", "Классическая шаурма", "Курица, овощи и фирменный соус", "290.00", "/images/products/classic.svg"),
    ("Шаурма", "Сырная шаурма", "Курица, сыр, овощи и соус", "330.00", "/images/products/cheese.svg"),
    ("Горячее", "Люля-кебаб", "Люля из говядины с луком", "390.00", "/images/products/kebab.svg"),
    ("Горячее", "Картофель фри", "Хрустящий картофель", "160.00", "/images/products/fries.svg"),
    ("Напитки", "Морс", "Ягодный морс 0,5 л", "120.00", "/images/products/mors.svg"),
]

STAFF = [
    ("cashier", "cashier123", "cashier", "Кассир"),
    ("cook", "cook123", "cook", "Повар"),
    ("director", "director123", "director", "Директор"),
]


def seed(db: Session) -> None:
    existing_products = {product.name: product for product in db.scalars(select(Product)).all()}
    for category, name, description, price, image_url in PRODUCTS:
        product = existing_products.get(name)
        if product is None:
            db.add(Product(
                category=category,
                name=name,
                description=description,
                price=Decimal(price),
                image_url=image_url,
            ))
        elif not product.image_url:
            product.image_url = image_url

    existing = set(db.scalars(select(Staff.username)).all())
    for username, password, role, name in STAFF:
        if username not in existing:
            db.add(Staff(username=username, password_hash=hash_password(password), role=role, name=name))
    db.commit()
