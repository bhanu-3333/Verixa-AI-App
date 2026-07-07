"""
Logger Utilities
Provides structured logging for the application
"""

import logging
from datetime import datetime


def setup_logger(name: str = "verixa") -> logging.Logger:
    """
    Setup and configure application logger
    Usage: logger = setup_logger()
           logger.info("Server started")
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    
    # Console handler with custom formatting
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "[%(levelname)s] %(asctime)s - %(name)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    handler.setFormatter(formatter)
    
    if not logger.handlers:
        logger.addHandler(handler)
    
    return logger


# Create default logger instance
logger = setup_logger()
