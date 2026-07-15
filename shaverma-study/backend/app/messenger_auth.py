from __future__ import annotations

import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from urllib.parse import parse_qsl

from fastapi import HTTPException, status

from app.config import get_settings


@dataclass(frozen=True)
class MessengerUser:
    external_id: str
    name: str


def _parse_unique(init_data: str) -> list[tuple[str, str]]:
    pairs = parse_qsl(init_data, keep_blank_values=True, strict_parsing=True)
    keys = [key for key, _ in pairs]
    if len(keys) != len(set(keys)):
        raise ValueError("duplicate initData keys")
    return pairs


def _validate_signed_data(init_data: str, token: str) -> dict[str, str]:
    pairs = _parse_unique(init_data)
    data = dict(pairs)
    received_hash = data.pop("hash", "")
    if not token or not received_hash:
        raise ValueError("missing token or hash")

    check_string = "\n".join(f"{key}={value}" for key, value in sorted(data.items()))
    secret = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    calculated = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calculated, received_hash):
        raise ValueError("bad initData signature")

    auth_date = int(data.get("auth_date", "0"))
    max_age = get_settings().init_data_max_age_seconds
    if auth_date <= 0 or abs(int(time.time()) - auth_date) > max_age:
        raise ValueError("expired initData")
    return data


def validate_messenger_user(platform: str, init_data: str) -> MessengerUser:
    settings = get_settings()
    if settings.dev_auth and init_data.startswith("dev:"):
        parts = init_data.split(":", 2)
        if len(parts) != 3 or not parts[1]:
            raise HTTPException(status_code=400, detail="Invalid dev initData")
        return MessengerUser(external_id=parts[1], name=parts[2] or "Demo User")

    token = settings.telegram_bot_token if platform == "telegram" else settings.max_bot_token
    try:
        data = _validate_signed_data(init_data, token)
        user = json.loads(data["user"])
        external_id = str(user["id"])
        full_name = " ".join(filter(None, [user.get("first_name"), user.get("last_name")])).strip()
        return MessengerUser(external_id=external_id, name=full_name or user.get("username") or external_id)
    except (ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Messenger data validation failed") from exc
