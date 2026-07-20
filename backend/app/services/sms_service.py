# backend/app/services/sms_service.py
"""SMS Service abstraction for Emergency SOS.

- Provides a generic ``SMSProvider`` interface.
- ``Fast2SMSProvider`` is a stub that would call the real Fast2SMS API when an API key is configured.
- ``MockSMSProvider`` logs the payload and returns success when no provider/key is available.
- ``SMSService`` selects the appropriate provider at import time and exposes ``send_sms``.

The SOS flow calls ``SMSService.send_sms``; if a real provider is not configured the
call is non‑blocking and always succeeds, satisfying the requirement to not block the
SOS flow.
"""

import os
from typing import Dict

from app.utils.logger import app_logger


class SMSProvider:
    """Abstract base class for SMS providers."""

    def send_sms(self, to: str, message: str) -> Dict:
        """Send an SMS.

        Args:
            to: Destination phone number.
            message: Text message.

        Returns:
            Dict containing provider‑specific response information.
        """
        raise NotImplementedError


class Fast2SMSProvider(SMSProvider):
    """Fast2SMS provider stub.

    In a real implementation this would perform an HTTP request to the Fast2SMS API.
    Here we simply log the payload to illustrate where the integration would happen.
    """

    def __init__(self, api_key: str):
        self.api_key = api_key

    def send_sms(self, to: str, message: str) -> Dict:
        # Placeholder: log payload and pretend we succeeded.
        app_logger.info(
            f"[Fast2SMS] Sending SMS to {to}: {message} (API key present, but not actually sent)"
        )
        return {"status": "success", "provider": "Fast2SMS", "to": to, "message": message}


class MockSMSProvider(SMSProvider):
    """Fallback provider that only logs the payload and returns success."""

    def send_sms(self, to: str, message: str) -> Dict:
        app_logger.info(f"[MockSMS] SMS payload – to: {to}, message: {message}")
        return {"status": "success", "provider": "Mock", "to": to, "message": message}


class SMSService:
    """Singleton‑style service that selects an appropriate SMSProvider.

    If a FAST2SMS_API_KEY env var is present we use Fast2SMSProvider; otherwise we
    fall back to MockSMSProvider which only logs.
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SMSService, cls).__new__(cls)
            cls._instance._init_provider()
        return cls._instance

    def _init_provider(self):
        api_key = os.getenv("FAST2SMS_API_KEY")
        if api_key:
            self.provider = Fast2SMSProvider(api_key)
            app_logger.info("SMSService: Using Fast2SMSProvider (API key detected)")
        else:
            self.provider = MockSMSProvider()
            app_logger.info("SMSService: No API key – using MockSMSProvider (logging only)")

    def send_sms(self, to: str, message: str) -> Dict:
        """Send an SMS via the selected provider.

        Returns a dict with at least a ``status`` key. Errors are caught and logged
        so the SOS flow never fails because of SMS.
        """
        try:
            return self.provider.send_sms(to, message)
        except Exception as exc:
            app_logger.error(f"SMSService: Failed to send SMS – {exc}")
            return {"status": "error", "error": str(exc)}
