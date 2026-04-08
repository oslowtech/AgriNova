from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    landroid_mode: str = Field(default="mock", description="mock (default) or live")
    cache_dir: str = Field(default="./.cache", description="Local cache directory")
    db_url: str = Field(default="sqlite:///./landroid.db", description="SQLAlchemy database URL")

    # API
    api_v1_prefix: str = "/api"

    model_config = SettingsConfigDict(env_prefix="LANDROID_")


settings = Settings()

