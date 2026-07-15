import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException

from app.config import get_settings
from app.messengers import max_poll_loop, notify_staff, telegram_poll_loop


@asynccontextmanager
async def lifespan(_: FastAPI):
    tasks = [asyncio.create_task(telegram_poll_loop()), asyncio.create_task(max_poll_loop())]
    yield
    for task in tasks:
        task.cancel()


app = FastAPI(title="Shaverma Study Manager", lifespan=lifespan)


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/internal/order-created")
async def order_created(order: dict, x_internal_key: str = Header(default="")) -> dict:
    if x_internal_key != get_settings().internal_key:
        raise HTTPException(status_code=403, detail="Invalid internal key")
    await notify_staff(order)
    return {"ok": True}
