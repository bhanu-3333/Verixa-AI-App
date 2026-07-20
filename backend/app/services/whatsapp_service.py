# backend/app/services/whatsapp_service.py
"""
WhatsApp Service abstraction for Emergency SOS.
Uses the official WhatsApp Business Cloud API (v22.0) to send template alerts.
"""

import json
import re
import urllib.request
import urllib.error
from typing import Optional
from app.config.config import settings
from app.utils.logger import app_logger


class WhatsAppService:
    """Service to interact with the official WhatsApp Business Cloud API."""

    def __init__(self):
        self.access_token = settings.WHATSAPP_ACCESS_TOKEN
        self.phone_number_id = settings.WHATSAPP_PHONE_NUMBER_ID
        self.business_account_id = settings.WHATSAPP_BUSINESS_ACCOUNT_ID
        self.template_name = settings.WHATSAPP_TEMPLATE_NAME

    @staticmethod
    def build_maps_url(latitude: float, longitude: float) -> str:
        """Build a Google Maps URL that opens centred on the pin at street level."""
        return (
            f"https://www.google.com/maps?q={latitude},{longitude}"
            f"&ll={latitude},{longitude}&z=17"
        )

    def send_whatsapp_alert(
        self,
        to_phone: str,
        user_name: str,
        latitude: float,
        longitude: float,
        maps_link: Optional[str] = None,
        emergency_type: str = "General",
    ) -> dict:
        """Send a WhatsApp template message to the registered emergency contact.

        Parameters
        ----------
        to_phone   : Recipient phone (any format — will be normalised).
        user_name  : Display name of the user in distress.
        latitude   : GPS latitude (used as fallback to build maps_link).
        longitude  : GPS longitude (used as fallback to build maps_link).
        maps_link  : Pre-built Google Maps URL. If omitted, built from lat/lng.
        emergency_type : Type of emergency.

        Returns
        -------
        dict with keys: status ("success" | "mocked" | "failed"), message, recipient.

        If credentials are not configured the call is simulated ("mocked")
        so the rest of the SOS flow (DB write, status update) still works in dev.
        """
        # Build the Maps URL — prefer the caller-supplied link
        final_maps_link = maps_link or self.build_maps_url(latitude, longitude)

        # Normalise phone number: strip +, spaces, dashes → e.g. 919876543210
        clean_phone = (
            str(to_phone or "")
            .strip()
            .replace("+", "")
            .replace(" ", "")
            .replace("-", "")
        )

        # ── Mock mode (credentials absent) ───────────────────────────────────
        if not self.access_token or not self.phone_number_id:
            if settings.DEBUG:
                app_logger.warning(
                    f"[WhatsAppService] MOCK SEND (credentials missing) -> {clean_phone}\n"
                    f"*** EMERGENCY ALERT ***\n"
                    f"{user_name} needs immediate assistance.\n"
                    f"Live Location: {final_maps_link}\n"
                    f"Emergency Type: {emergency_type}\n"
                    f"Please contact them immediately."
                )
                return {
                    "status": "mocked",
                    "message": "WhatsApp alert simulated — credentials not configured.",
                    "recipient": clean_phone,
                }
            else:
                raise Exception("AuthFailure: WhatsApp API credentials missing.")

        # ── Template Selection Logic ─────────────────────────────────────────
        # IMPORTANT: Meta template language codes must match exactly what was
        # approved in the Meta Business Manager.
        #   emergency_alert → approved language = "en"   (NOT "en_US")
        #   hello_world     → approved language = "en_US"
        if self.template_name == "emergency_alert":
            language_code = "en"
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": clean_phone,
                "type": "template",
                "template": {
                    "name": "emergency_alert",
                    "language": {"code": language_code},
                    "components": [
                        {
                            "type": "body",
                            "parameters": [
                                {"type": "text", "text": user_name},
                                {"type": "text", "text": final_maps_link},
                                {"type": "text", "text": emergency_type}
                            ],
                        }
                    ],
                },
            }
        elif self.template_name == "hello_world":
            language_code = "en_US"
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": clean_phone,
                "type": "template",
                "template": {
                    "name": "hello_world",
                    "language": {"code": language_code},
                },
            }
        else:
            raise Exception(
                f"Unsupported WhatsApp template: '{self.template_name}'. "
                f"Only 'emergency_alert' and 'hello_world' are supported."
            )

        # ── Safe debug logging (NEVER log access token) ───────────────────────
        param_count = 0
        if self.template_name == "emergency_alert":
            param_count = len(payload["template"]["components"][0]["parameters"])
        app_logger.info(
            f"[WhatsAppService] Sending template:\n"
            f"  WhatsApp template: {self.template_name}\n"
            f"  WhatsApp template language: {language_code}\n"
            f"  Recipient: {clean_phone}\n"
            f"  Parameter count: {param_count}\n"
            f"  Maps link: {final_maps_link}"
        )

        # ── Live API call ─────────────────────────────────────────────────────
        # Meta Graph API v22.0 (latest stable as of 2025-07)
        url = f"https://graph.facebook.com/v22.0/{self.phone_number_id}/messages"

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=15) as response:
                res_body = response.read().decode("utf-8")
                res_json = json.loads(res_body)

                # Extract Meta message ID for logging
                meta_msg_id = None
                if isinstance(res_json, dict) and "messages" in res_json:
                    msgs = res_json["messages"]
                    if isinstance(msgs, list) and len(msgs) > 0:
                        meta_msg_id = msgs[0].get("id")

                app_logger.info(
                    f"[WhatsAppService] Meta API success -> {clean_phone}\n"
                    f"  Meta HTTP status: {response.status}\n"
                    f"  Meta message ID: {meta_msg_id}\n"
                    f"  Full response: {res_body}"
                )
                return {
                    "status": "success",
                    "message": "WhatsApp emergency alert sent successfully.",
                    "response": res_json,
                    "recipient": clean_phone,
                }

        except urllib.error.HTTPError as exc:
            err_body = exc.read().decode("utf-8")
            app_logger.error(
                f"[WhatsAppService] HTTP {exc.code} sending to {clean_phone}: {err_body}"
            )
            # Parse error body if possible
            try:
                err_json = json.loads(err_body)
            except Exception:
                err_json = None

            # ── Template/language mismatch (#132001) ─────────────────────────
            if "132001" in err_body or "does not exist in the translation" in err_body:
                raise Exception(
                    "WhatsApp template/language mismatch. Verify the approved template language code. "
                    f"Template='{self.template_name}', Language='{language_code}'."
                )

            # ── Parameter count mismatch (#132000) ───────────────────────────
            if "132000" in err_body or "Number of parameters does not match" in err_body:
                raise Exception("WhatsApp template variables do not match the approved Meta template.")

            # Fall back to mock simulation on authentication failure (expired/invalid token)
            if exc.code in (401, 403):
                if settings.DEBUG:
                    app_logger.warning(
                        f"[WhatsAppService] Falling back to MOCK SEND due to HTTP {exc.code} (credentials expired/invalid).\n"
                        f"*** EMERGENCY ALERT ***\n"
                        f"{user_name} needs immediate assistance.\n"
                        f"Live Location: {final_maps_link}\n"
                        f"Emergency Type: {emergency_type}\n"
                        f"Please contact them immediately."
                    )
                    return {
                        "status": "mocked",
                        "message": f"WhatsApp alert simulated — live API returned HTTP {exc.code} (token expired/invalid).",
                        "recipient": clean_phone,
                    }
                else:
                    raise Exception(f"AuthFailure: WhatsApp API Authentication Failure (HTTP {exc.code}): {err_body}")

            if exc.code in (400, 404):
                # Return the actual Meta API error — do NOT treat as success
                raise Exception(json.dumps(err_json or {"error": {"message": err_body}}))

            raise Exception(f"WhatsApp API HTTP {exc.code}: {err_body}")

        except Exception as exc:
            app_logger.error(
                f"[WhatsAppService] Connection failure for {clean_phone}: {exc}"
            )
            raise exc

