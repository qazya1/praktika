from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Product
from app.schemas import ProductOut

router = APIRouter()


@router.get("/menu", response_model=list[ProductOut])
def menu(db: Session = Depends(get_db)):
    return db.scalars(select(Product).where(Product.active.is_(True)).order_by(Product.category, Product.id)).all()
