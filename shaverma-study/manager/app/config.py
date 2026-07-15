from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    backend_url: str = "http://localhost:8000"
    frontend_url: str = "http://localhost:5173"
    internal_key: str = "local-internal-key"
    telegram_bot_token: str = ""
    max_bot_token: str = ""
    telegram_staff_chat_ids: str = ""
    max_staff_chat_ids: str = ""
    enable_polling: bool = False
    max_api_base: str = "https://platform-api2.max.ru"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @staticmethod
    def ids(raw: str) -> list[str]:
        return [item.strip() for item in raw.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
