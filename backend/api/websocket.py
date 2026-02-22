"""
WebSocket endpoints for real-time data streaming.
"""
import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Set

from fastapi import WebSocket, WebSocketDisconnect

from ..agents.quant_agent import agent
from ..data.crypto import stream_ticker

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSocket connections."""

    def __init__(self):
        self.active: Set[WebSocket] = set()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active.add(ws)
        logger.info(f"WS connected. Total: {len(self.active)}")

    def disconnect(self, ws: WebSocket) -> None:
        self.active.discard(ws)
        logger.info(f"WS disconnected. Total: {len(self.active)}")

    async def broadcast(self, data: dict) -> None:
        dead = set()
        for ws in self.active:
            try:
                await ws.send_json(data)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.active.discard(ws)


manager = ConnectionManager()


async def strategy_broadcast_loop() -> None:
    """Broadcast strategy states to all connected clients every 2 seconds."""
    while True:
        if manager.active:
            states = [s.model_dump(mode="json") for s in agent.get_all_states()]
            await manager.broadcast({"type": "strategies", "data": states, "ts": datetime.now(timezone.utc).isoformat()})
        await asyncio.sleep(2)


async def ws_strategies(websocket: WebSocket) -> None:
    """WebSocket: live strategy state updates."""
    await manager.connect(websocket)
    try:
        while True:
            # Just keep the connection alive; broadcast_loop does the sending
            await asyncio.sleep(30)
    except WebSocketDisconnect:
        manager.disconnect(websocket)


async def ws_ticker(websocket: WebSocket, symbol: str, exchange: str = "binance") -> None:
    """WebSocket: live ticker for a crypto symbol."""
    await websocket.accept()
    try:
        async for tick in stream_ticker(symbol, exchange):
            await websocket.send_json({"type": "ticker", "data": tick})
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"Ticker WS error: {e}")
    finally:
        await websocket.close()
