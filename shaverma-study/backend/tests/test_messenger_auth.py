import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

import pytest

from app.config import get_settings
from app.messenger_auth import validate_messenger_user


def signed_init_data(token: str, user_id: int) -> str:
    data = {
        "auth_date": str(int(time.time())),
        "query_id": "test-query",
        "user": json.dumps({"id": user_id, "first_name": "Иван", "last_name": "Тестов"}, separators=(",", ":"), ensure_ascii=False),
    }
    check_string = "\n".join(f"{key}={value}" for key, value in sorted(data.items()))
    secret = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    data["hash"] = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
    return urlencode(data)


@pytest.mark.parametrize(
    ("platform", "env_name"),
    [("telegram", "TELEGRAM_BOT_TOKEN"), ("max", "MAX_BOT_TOKEN")],
)
def test_signed_messenger_data(platform: str, env_name: str, monkeypatch: pytest.MonkeyPatch):
    token = f"{platform}-test-token"
    monkeypatch.setenv("DEV_AUTH", "false")
    monkeypatch.setenv(env_name, token)
    get_settings.cache_clear()
    try:
        user = validate_messenger_user(platform, signed_init_data(token, 777))
        assert user.external_id == "777"
        assert user.name == "Иван Тестов"
    finally:
        get_settings.cache_clear()
