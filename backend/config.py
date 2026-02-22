"""
Application configuration via environment variables.
All sensitive values are loaded from .env — never hardcoded.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    # ── App ────────────────────────────────────────────────────────────────
    APP_NAME: str = "Quant Trading Agent"
    APP_ENV: str = "development"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 h
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    # Regex for GitHub Pages — used separately in CORSMiddleware (allow_origins doesn't support globs)
    ALLOWED_ORIGIN_REGEX: str = r"https://.*\.github\.io"

    # ── Database ───────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://quant:quant@localhost/quantdb"

    # ── Crypto Exchange APIs ────────────────────────────────────────────────
    BINANCE_API_KEY: Optional[str] = None
    BINANCE_SECRET: Optional[str] = None
    OKX_API_KEY: Optional[str] = None
    OKX_SECRET: Optional[str] = None
    OKX_PASSPHRASE: Optional[str] = None

    # ── US Stock Data ───────────────────────────────────────────────────────
    POLYGON_API_KEY: Optional[str] = None
    ALPHA_VANTAGE_KEY: Optional[str] = None

    # ── Taiwan Stock ────────────────────────────────────────────────────────
    TW_BROKER_API_KEY: Optional[str] = None
    TW_BROKER_SECRET: Optional[str] = None

    # ── Notifications ───────────────────────────────────────────────────────
    TELEGRAM_TOKEN: Optional[str] = None
    TELEGRAM_CHAT_ID: Optional[str] = None
    LINE_CHANNEL_ACCESS_TOKEN: Optional[str] = None
    LINE_CHANNEL_SECRET: Optional[str] = None

    # ── Redis (for pub/sub, caching) ────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379"

    # ── Backtest defaults ───────────────────────────────────────────────────
    DEFAULT_INITIAL_CAPITAL: float = 100_000.0
    DEFAULT_COMMISSION: float = 0.001   # 0.1 %
    DEFAULT_SLIPPAGE: float = 0.0005    # 0.05 %

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
