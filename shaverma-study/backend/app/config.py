from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Shaverma Study API"
    database_url: str = "sqlite:///./shaverma-study.db"
    jwt_secret: str = "dev-secret-change-me"
    jwt_ttl_minutes: int = 720
    dev_auth: bool = True
    telegram_bot_token: str = ""
    max_bot_token: str = ""
    init_data_max_age_seconds: int = 3600
    manager_url: str = ""
    internal_key: str = "local-internal-key"
    cors_origins: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
