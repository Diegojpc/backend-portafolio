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
        extra="ignore",  # .env may also carry unrelated keys (e.g. VITE_* copied from the frontend)
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
        default="gemini-3.8-flash"
    )]
    embedding_model: Annotated[str, Field(
        alias="EMBEDDING_MODEL",
        default="models/text-embedding-004"
    )]
    
    # Provider Secrets
    gemini_api_key: Annotated[str, Field(alias="GEMINI_API_KEY")]

    # AWS — optional; if set, RAG documents are loaded from this S3 bucket
    s3_bucket: Annotated[str, Field(alias="S3_BUCKET", default="")]

    # Realtime voice (Fish Audio TTS). Disabled by default: it spends money per visitor.
    realtime_enabled: Annotated[bool, Field(alias="REALTIME_ENABLED", default=False)]
    fish_api_key: Annotated[str, Field(alias="FISH_API_KEY", default="")]
    fish_model: Annotated[str, Field(alias="FISH_MODEL", default="s2.1-pro-free")]
    # Delivery tuning that works WITHOUT re-cloning the voice. speed: 0.5-2.0 (1.0 = the clone's natural pace);
    # temperature: 0-1, higher = more expressive/variable. FISH_SPEED_EN overrides the speed for English sentences.
    fish_speed: Annotated[float, Field(alias="FISH_SPEED", default=1.15, ge=0.5, le=2.0)]
    fish_speed_en: Annotated[float | None, Field(alias="FISH_SPEED_EN", default=None, ge=0.5, le=2.0)]
    fish_temperature: Annotated[float, Field(alias="FISH_TEMPERATURE", default=0.7, ge=0.0, le=1.0)]
    fish_voice_id: Annotated[str, Field(alias="FISH_VOICE_ID", default="")]
    # Optional second clone for English (e.g. recorded with English speech); falls back to FISH_VOICE_ID.
    fish_voice_id_en: Annotated[str, Field(alias="FISH_VOICE_ID_EN", default="")]
    realtime_daily_chars: Annotated[int, Field(alias="REALTIME_DAILY_CHARS", default=20000)]
    realtime_max_turns: Annotated[int, Field(alias="REALTIME_MAX_TURNS", default=12)]
    realtime_max_input_chars: Annotated[int, Field(alias="REALTIME_MAX_INPUT_CHARS", default=500)]
    realtime_max_tts_chars: Annotated[int, Field(alias="REALTIME_MAX_TTS_CHARS", default=700)]

    # API Documentation
    enable_docs: Annotated[bool, Field(
        alias="ENABLE_DOCS",
        default=False
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
        logger.info(f"[Config] Gemini API Key configured: {'Yes' if settings.gemini_api_key else 'No'}")
        logger.info(f"[Config] Realtime voice enabled: {settings.realtime_enabled} (Fish key configured: {'Yes' if settings.fish_api_key else 'No'}, model={settings.fish_model})")
        logger.info(f"[Config] API Documentation enabled: {'Yes' if settings.enable_docs else 'No'}")
        return settings
    except Exception as e:
        logger.critical(f"[Config] Failed to load settings: {e}")
        raise


settings = get_settings()
