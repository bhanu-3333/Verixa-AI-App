import os, sys, json, urllib.request, urllib.error
sys.path.insert(0, ".")
from app.config.config import settings
tok = (settings.WHATSAPP_ACCESS_TOKEN or "").strip()
phone_id = (settings.WHATSAPP_PHONE_NUMBER_ID or "").strip()
print("=== BACKEND RUNTIME DIAGNOSTIC ===")
print("Token loaded        :", bool(tok))
print("Token length        :", len(tok))
print("Token prefix (6)    :", repr(tok[:6]))
print("Token suffix (4)    :", repr(tok[-4:]))
print("Phone Number ID     :", repr(phone_id))
print("Template name       :", repr(settings.WHATSAPP_TEMPLATE_NAME))
print()
if not tok:
    print("ERROR: token is empty")
    sys.exit(1)
url = "https://graph.facebook.com/v22.0/" + phone_id + "?access_token=" + tok
print("=== META GRAPH API TEST ===")
try:
    with urllib.request.urlopen(url, timeout=12) as r:
        data = json.loads(r.read())
        print("Meta HTTP           : 200 OK - TOKEN IS VALID")
        print("Phone ID confirmed  :", data.get("id"))
        print("Display number      :", data.get("display_phone_number"))
except urllib.error.HTTPError as e:
    body = json.loads(e.read())
    err = body.get("error", {})
    print("Meta HTTP           :", e.code)
    print("Meta error code     :", err.get("code"))
    print("Meta error type     :", err.get("type"))
    print("Meta error message  :", err.get("message"))
    print("Meta error subcode  :", err.get("error_subcode", "none"))
except Exception as ex:
    print("Network error:", ex)
