# backend/app/services/whatsapp_service.py
"""
WhatsApp Service abstraction for Emergency SOS.
Uses the official WhatsApp Business Cloud API (v22.0) to send template alerts.

Approved template: emergency_alert (language: en)
  {{1}} = User Name
  {{2}} = Emergency Type
  {{3}} = Live Location (maps URL)

Sandbox restriction (error 131030): messages can only be sent to phone numbers
that have been added as test recipients in Meta Business Manager.
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
        # Always strip to eliminate any stray whitespace / CR-LF from .env
        self.access_token = (settings.WHATSAPP_ACCESS_TOKEN or "").strip() or None
        self.phone_number_id = (settings.WHATSAPP_PHONE_NUMBER_ID or "").strip() or None
        self.business_account_id = (settings.WHATSAPP_BUSINESS_ACCOUNT_ID or "").strip() or None
        self.template_name = (settings.WHATSAPP_TEMPLATE_NAME or "emergency_alert").strip()

        # Safe startup diagnostic (never logs full token)
        tok = self.access_token or ""
        app_logger.info(
            f"[WhatsAppService] Init diagnostic:"
            f" token_prefix={tok[:8]!r}"
            f" token_len={len(tok)}"
            f" token_suffix={tok[-4:]!r}"
            f" phone_number_id={self.phone_number_id!r}"
            f" template={self.template_name!r}"
            f" credentials_present={bool(self.access_token and self.phone_number_id)}"
        )

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
        # If 10-digit Indian mobile number missing country code 91, prepend 91
        if len(clean_phone) == 10 and clean_phone[0] in ("6", "7", "8", "9"):
            clean_phone = f"91{clean_phone}"

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
                    "delivery_status": "mocked",
                    "message": "Development mock only. No real WhatsApp message was sent.",
                    "recipient": clean_phone,
                    "meta_response_id": None,
                }
            else:
                return {
                    "status": "failed",
                    "delivery_status": "failed",
                    "message": "AuthFailure: WhatsApp API credentials missing.",
                    "recipient": clean_phone,
                    "meta_response_id": None,
                }

        # 4. Construct Meta Graph API SEND URL BEFORE template logic / logging
        # Avoid any uninitialized variable execution paths
        graph_url = f"https://graph.facebook.com/v22.0/{self.phone_number_id}/messages"

        # 5. Template Selection & Payload Construction
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
                                # Template parameter order (MUST match approved template):
                                # {{1}} = User Name
                                # {{2}} = Live Location / Google Maps URL
                                # {{3}} = Emergency Type
                                {"type": "text", "text": user_name},
                                {"type": "text", "text": final_maps_link},
                                {"type": "text", "text": emergency_type},
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
            return {
                "status": "failed",
                "delivery_status": "failed",
                "message": f"Unsupported WhatsApp template: '{self.template_name}'.",
                "recipient": clean_phone,
                "meta_response_id": None,
            }

        # 6. Safe debug logging (NEVER log full access token)
        tok = self.access_token or ""
        app_logger.info(
            f"[WhatsAppService] Template: {self.template_name}\n"
            f"[WhatsAppService] Language: {language_code}\n"
            f"[WhatsAppService] Recipient: {clean_phone}\n"
            f"[WhatsAppService] Graph endpoint initialized: True ({graph_url})\n"
            f"[WhatsAppService] Parameter count: 3\n"
            f"[WhatsAppService] User Name: {user_name}\n"
            f"[WhatsAppService] Maps Link: {final_maps_link}\n"
            f"[WhatsAppService] Emergency Type: {emergency_type}"
        )

        # 7. Live API call using graph_url
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

        try:
            req = urllib.request.Request(
                graph_url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=15) as response:
                res_body = response.read().decode("utf-8")
                res_json = json.loads(res_body)

                # Extract Meta message ID — success ONLY when messages[0].id exists
                meta_msg_id = None
                if isinstance(res_json, dict) and "messages" in res_json:
                    msgs = res_json["messages"]
                    if isinstance(msgs, list) and len(msgs) > 0:
                        meta_msg_id = msgs[0].get("id")

                if not meta_msg_id:
                    app_logger.error(
                        f"[WhatsAppService] Meta API HTTP {response.status} returned without message ID: {res_body}"
                    )
                    return {
                        "status": "failed",
                        "delivery_status": "failed",
                        "message": "Meta API response missing message ID.",
                        "recipient": clean_phone,
                        "meta_response_id": None,
                        "response": res_json,
                    }

                app_logger.info(
                    f"[WhatsAppService] Meta API accepted request -> {clean_phone}\n"
                    f"  Meta HTTP status: {response.status}\n"
                    f"  Meta message ID: {meta_msg_id}\n"
                    f"  Full response: {res_body}"
                )
                return {
                    "status": "success",
                    "delivery_status": "accepted",
                    "message": "Emergency WhatsApp alert sent successfully.",
                    "response": res_json,
                    "recipient": clean_phone,
                    "meta_response_id": meta_msg_id,
                }

        except urllib.error.HTTPError as exc:
            err_body = exc.read().decode("utf-8")
            app_logger.error(
                f"[WhatsAppService] HTTP {exc.code} error sending to {clean_phone}:\n"
                f"  Full Meta error response: {err_body}"
            )
            try:
                err_json = json.loads(err_body)
            except Exception:
                err_json = None

            meta_code = None
            meta_msg = err_body
            if err_json and isinstance(err_json.get("error"), dict):
                meta_code = err_json["error"].get("code")
                meta_msg = err_json["error"].get("message", err_body)
                fbtrace = err_json["error"].get("fbtrace_id", "")
                app_logger.error(
                    f"[WhatsAppService] Meta error code={meta_code} | fbtrace={fbtrace} | msg={meta_msg}"
                )

            # ── Sandbox restriction (#131030) — recipient not in allowed list ──
            if meta_code == 131030 or "131030" in err_body:
                return {
                    "status": "failed",
                    "delivery_status": "failed",
                    "message": (
                        "WhatsApp sandbox restriction (#131030): The recipient's phone number is not "
                        "in the allowed list. In Meta Developer dashboard > WhatsApp > API Setup, add the "
                        "recipient phone number and send a test message."
                    ),
                    "recipient": clean_phone,
                    "meta_response_id": None,
                    "meta_error": err_json,
                }

            # ── Template/language mismatch (#132001) ─────────────────────────
            if meta_code == 132001 or "132001" in err_body or "does not exist in the translation" in err_body:
                return {
                    "status": "failed",
                    "delivery_status": "failed",
                    "message": f"WhatsApp template/language mismatch (#132001). Template='{self.template_name}', Language='{language_code}'.",
                    "recipient": clean_phone,
                    "meta_response_id": None,
                    "meta_error": err_json,
                }

            # ── Parameter count mismatch (#132000) ───────────────────────────
            if meta_code == 132000 or "132000" in err_body or "Number of parameters does not match" in err_body:
                return {
                    "status": "failed",
                    "delivery_status": "failed",
                    "message": "WhatsApp template parameter count mismatch (#132000). Check that the number of {{N}} variables sent matches the approved template.",
                    "recipient": clean_phone,
                    "meta_response_id": None,
                    "meta_error": err_json,
                }

            # ── Invalid / expired OAuth token (#190) ─────────────────────────
            if meta_code == 190 or exc.code in (401, 403):
                return {
                    "status": "failed",
                    "delivery_status": "failed",
                    "message": (
                        f"WhatsApp API authentication failed (HTTP {exc.code}, Meta code {meta_code}). "
                        "Access token is expired or invalid. Regenerate a System User token in Meta Business Manager."
                    ),
                    "recipient": clean_phone,
                    "meta_response_id": None,
                    "meta_error": err_json,
                }

            # ── Unknown phone number ID (#100) ────────────────────────────────
            if meta_code == 100:
                return {
                    "status": "failed",
                    "delivery_status": "failed",
                    "message": f"WhatsApp invalid parameter (#100): {meta_msg}. Check WHATSAPP_PHONE_NUMBER_ID in .env.",
                    "recipient": clean_phone,
                    "meta_response_id": None,
                    "meta_error": err_json,
                }

            # ── Catch-all with full Meta error ────────────────────────────────
            return {
                "status": "failed",
                "delivery_status": "failed",
                "message": f"WhatsApp API HTTP {exc.code} (Meta code {meta_code}): {meta_msg}",
                "recipient": clean_phone,
                "meta_response_id": None,
                "meta_error": err_json,
            }

        except Exception as exc:
            app_logger.error(
                f"[WhatsAppService] Connection failure for {clean_phone}: {exc}", exc_info=True
            )
            return {
                "status": "failed",
                "delivery_status": "failed",
                "message": f"WhatsApp connection error: {type(exc).__name__}: {str(exc)}",
                "recipient": clean_phone,
                "meta_response_id": None,
            }

