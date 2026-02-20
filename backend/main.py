"""
FastAPI application entry point.
Run with:
  uvicorn backend.main:app --reload --port 8000
"""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .api.routes import router
from .api.websocket import manager, strategy_broadcast_loop, ws_strategies, ws_ticker
from .notifications.telegram_bot import notifier, set_callbacks
from .agents.quant_agent import agent

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────────────
    logger.info("Starting Quant Agent System…")

    # Wire Telegram callbacks
    set_callbacks(
        status_fn=agent.status_summary,
        stop_fn=agent.emergency_stop,
    )

    # Start background tasks
    broadcast_task = asyncio.create_task(strategy_broadcast_loop())

    # Start Telegram bot (non-blocking)
    if settings.TELEGRAM_TOKEN:
        telegram_task = asyncio.create_task(notifier.start_polling())
    else:
        telegram_task = None
        logger.warning("Telegram token not set; bot disabled.")

    yield

    # ── Shutdown ──────────────────────────────────────────────────────────
    broadcast_task.cancel()
    if telegram_task:
        telegram_task.cancel()
    if settings.TELEGRAM_TOKEN:
        await notifier.stop()
    logger.info("Quant Agent System stopped.")


app = FastAPI(
    title="Quant Trading Agent API",
    description="Professional multi-asset quantitative trading engine with real-time dashboard.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the GitHub Pages frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST routes
app.include_router(router, prefix="/api/v1")


# WebSocket endpoints
@app.websocket("/ws/strategies")
async def websocket_strategies(websocket: WebSocket):
    await ws_strategies(websocket)


@app.websocket("/ws/ticker/{symbol}")
async def websocket_ticker(websocket: WebSocket, symbol: str, exchange: str = "binance"):
    await ws_ticker(websocket, symbol, exchange)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
