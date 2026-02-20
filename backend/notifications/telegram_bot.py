"""
Telegram Bot integration.
Supports:
  - Push notifications (trade alerts, strategy triggers, anomaly warnings)
  - Inbound command handling (/status, /stop, /strategies, /pnl, /help)
"""
import asyncio
import logging
from typing import Optional, Callable, Awaitable

from telegram import Update, Bot
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from ..config import settings

logger = logging.getLogger(__name__)

# Callbacks injected by the quant agent
_status_callback: Optional[Callable[[], Awaitable[str]]] = None
_stop_callback: Optional[Callable[[str], Awaitable[str]]] = None


def set_callbacks(
    status_fn: Callable[[], Awaitable[str]],
    stop_fn: Callable[[str], Awaitable[str]],
) -> None:
    global _status_callback, _stop_callback
    _status_callback = status_fn
    _stop_callback = stop_fn


# ── Command handlers ─────────────────────────────────────────────────────────

async def _cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "🤖 *Quant Agent Online*\n\n"
        "Available commands:\n"
        "/status — Current positions & PnL\n"
        "/pnl — Detailed PnL breakdown\n"
        "/strategies — List running strategies\n"
        "/stop <id> — Emergency close strategy\n"
        "/help — Show this message",
        parse_mode="Markdown",
    )


async def _cmd_status(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if _status_callback:
        msg = await _status_callback()
    else:
        msg = "Status service not connected."
    await update.message.reply_text(msg, parse_mode="Markdown")


async def _cmd_stop(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    args = ctx.args
    if not args:
        await update.message.reply_text("Usage: /stop <strategy_id>")
        return
    strategy_id = args[0]
    if _stop_callback:
        msg = await _stop_callback(strategy_id)
    else:
        msg = "Stop service not connected."
    await update.message.reply_text(msg, parse_mode="Markdown")


async def _cmd_help(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    await _cmd_start(update, ctx)


# ── Notification helpers ─────────────────────────────────────────────────────

class TelegramNotifier:
    """Thin wrapper around python-telegram-bot for push notifications."""

    def __init__(self):
        self.token = settings.TELEGRAM_TOKEN
        self.chat_id = settings.TELEGRAM_CHAT_ID
        self._bot: Optional[Bot] = None
        self._app: Optional[Application] = None

    def _get_bot(self) -> Bot:
        if self._bot is None:
            if not self.token:
                raise RuntimeError("TELEGRAM_TOKEN not configured")
            self._bot = Bot(token=self.token)
        return self._bot

    async def send(self, message: str, parse_mode: str = "Markdown") -> None:
        """Send a push notification to the configured chat."""
        if not self.token or not self.chat_id:
            logger.warning("Telegram not configured; skipping notification.")
            return
        bot = self._get_bot()
        await bot.send_message(
            chat_id=self.chat_id,
            text=message,
            parse_mode=parse_mode,
        )

    async def send_trade_alert(
        self,
        symbol: str,
        side: str,
        price: float,
        quantity: float,
        strategy: str,
        pnl: Optional[float] = None,
    ) -> None:
        emoji = "🟢" if side.upper() == "BUY" else "🔴"
        pnl_str = f"\nPnL: `{pnl:+.2f}`" if pnl is not None else ""
        msg = (
            f"{emoji} *{side.upper()} {symbol}*\n"
            f"Price: `{price:.4f}`\n"
            f"Qty: `{quantity:.4f}`\n"
            f"Strategy: `{strategy}`"
            f"{pnl_str}"
        )
        await self.send(msg)

    async def send_alert(self, title: str, body: str, level: str = "INFO") -> None:
        icons = {"INFO": "ℹ️", "WARNING": "⚠️", "CRITICAL": "🚨"}
        icon = icons.get(level.upper(), "ℹ️")
        msg = f"{icon} *{title}*\n{body}"
        await self.send(msg)

    async def start_polling(self) -> None:
        """Start the bot in polling mode (blocks)."""
        if not self.token:
            logger.warning("TELEGRAM_TOKEN not set; bot not started.")
            return
        self._app = Application.builder().token(self.token).build()
        self._app.add_handler(CommandHandler("start", _cmd_start))
        self._app.add_handler(CommandHandler("help", _cmd_help))
        self._app.add_handler(CommandHandler("status", _cmd_status))
        self._app.add_handler(CommandHandler("stop", _cmd_stop))
        logger.info("Telegram bot started polling…")
        await self._app.run_polling()

    async def stop(self) -> None:
        if self._app:
            await self._app.shutdown()


# Singleton
notifier = TelegramNotifier()
