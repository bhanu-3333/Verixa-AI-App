"""
Verixa AI — Structured Logger
Three dedicated loggers:
  app_logger  — general application events
  req_logger  — HTTP request / response lifecycle
  db_logger   — database operations
"""

import logging
import sys


_FMT = "[%(levelname)s] %(asctime)s | %(name)s | %(message)s"
_DATE = "%Y-%m-%d %H:%M:%S"


def _make_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(logging.DEBUG)
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter(_FMT, datefmt=_DATE))
        logger.addHandler(handler)
    return logger


# ── Public logger instances ────────────────────────────────────────────────────
app_logger = _make_logger("verixa.app")
req_logger = _make_logger("verixa.request")
db_logger  = _make_logger("verixa.db")

# Convenience alias kept for backward-compatibility with existing imports
logger = app_logger
