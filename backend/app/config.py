# config.py — Centralized settings via pydantic-settings

import os
from typing import Annotated
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from loguru import logger


class AppSettings(BaseSettings):
    """Application configuration loaded from .env file."""

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
    )

    # Database
    database_url: Annotated[str, Field(alias="DATABASE_URL")]

    # Security
    app_secret: Annotated[str, Field(min_length=32, alias="APP_SECRET")]

    # CORS — comma-separated origins
    cors_origins: Annotated[str, Field(
        alias="CORS_ORIGINS",
        default="http://localhost:5173"
    )]

    # AI Models
    model_name: Annotated[str, Field(
        alias="MODEL_NAME",
        default="TinyLlama/TinyLlama-1.1B-Chat-v1.0"
    )]
    embedding_model: Annotated[str, Field(
        alias="EMBEDDING_MODEL",
        default="all-MiniLM-L6-v2"
    )]

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS_ORIGINS string into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


def get_settings() -> AppSettings:
    """Factory function to create settings instance with error handling."""
    try:
        settings = AppSettings()
        logger.info(f"[Config] Database URL: {settings.database_url}")
        logger.info(f"[Config] CORS origins: {settings.cors_origins_list}")
        logger.info(f"[Config] LLM model: {settings.model_name}")
        logger.info(f"[Config] Embedding model: {settings.embedding_model}")
        return settings
    except Exception as e:
        logger.critical(f"[Config] Failed to load settings: {e}")
        raise


settings = get_settings()
