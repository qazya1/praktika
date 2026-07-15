from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models  # noqa: F401
from app.config import get_settings
from app.db import Base, SessionLocal, engine, ensure_product_image_column
from app.routers import auth, health, menu, orders, staff
from app.seed import seed


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_product_image_column()
    with SessionLocal() as db:
        seed(db)
    yield


settings = get_settings()
app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (health.router, menu.router, auth.router, orders.router, staff.router):
    app.include_router(router, prefix="/api")
