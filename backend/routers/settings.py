import os
import json
import logging
from pathlib import Path

from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/settings", tags=["settings"])

SETTINGS_FILE = Path(__file__).resolve().parent.parent.parent / ".env.local"

# Fields that each mode requires
MODE_FIELDS = {
    "mock": [],
    "twilio": [
        "TWILIO_ACCOUNT_SID",
        "TWILIO_AUTH_TOKEN",
        "TWILIO_FROM_NUMBER",
        "TWILIO_TWIML_URL",
        "TWILIO_STATUS_CALLBACK_URL",
    ],
    "ringcentral": [
        "RINGCENTRAL_SERVER",
        "RINGCENTRAL_CLIENT_ID",
        "RINGCENTRAL_CLIENT_SECRET",
        "RINGCENTRAL_JWT_TOKEN",
        "RINGCENTRAL_FROM_NUMBER",
    ],
    "btcloudwork": [
        "RINGCENTRAL_SERVER",
        "RINGCENTRAL_CLIENT_ID",
        "RINGCENTRAL_CLIENT_SECRET",
        "RINGCENTRAL_JWT_TOKEN",
        "RINGCENTRAL_FROM_NUMBER",
    ],
}

# Secrets that should be masked when returned
SECRET_FIELDS = {"TWILIO_AUTH_TOKEN", "RINGCENTRAL_CLIENT_SECRET", "RINGCENTRAL_JWT_TOKEN"}


def _load_saved_settings() -> dict:
    """Load settings saved via the UI (stored in .env.local)."""
    settings = {}
    if SETTINGS_FILE.exists():
        for line in SETTINGS_FILE.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, value = line.partition("=")
                settings[key.strip()] = value.strip()
    return settings


def _save_settings(settings: dict):
    """Write settings to .env.local."""
    lines = ["# Dialer settings (managed by the Settings UI)\n"]
    for key, value in settings.items():
        lines.append(f"{key}={value}\n")
    SETTINGS_FILE.write_text("".join(lines))


def _effective_value(key: str, saved: dict) -> str:
    """Return saved value if present, otherwise fall back to env."""
    return saved.get(key, os.getenv(key, ""))


def _mask(value: str) -> str:
    if not value or len(value) <= 4:
        return value
    return "*" * (len(value) - 4) + value[-4:]


@router.get("/")
def get_settings():
    saved = _load_saved_settings()
    mode = saved.get("DIALER_MODE", os.getenv("DIALER_MODE", "mock"))

    # Build config for all modes so the frontend has everything
    config = {}
    all_fields = set()
    for fields in MODE_FIELDS.values():
        all_fields.update(fields)

    for field in sorted(all_fields):
        raw = _effective_value(field, saved)
        config[field] = {
            "value": _mask(raw) if field in SECRET_FIELDS and raw else raw,
            "is_set": bool(raw),
        }

    return {
        "dialer_mode": mode,
        "config": config,
        "mode_fields": MODE_FIELDS,
        "connected": _check_connected(mode, saved),
    }


def _check_connected(mode: str, saved: dict) -> bool:
    """Check if the required fields for the current mode are all set."""
    if mode == "mock":
        return True
    required = MODE_FIELDS.get(mode, [])
    for field in required:
        val = _effective_value(field, saved)
        if not val:
            return False
    return True


@router.put("/")
def update_settings(payload: dict):
    saved = _load_saved_settings()

    # Update mode
    if "dialer_mode" in payload:
        saved["DIALER_MODE"] = payload["dialer_mode"]

    # Update config fields — only write non-empty, non-masked values
    if "config" in payload and isinstance(payload["config"], dict):
        for key, value in payload["config"].items():
            if isinstance(value, str) and not value.startswith("*"):
                saved[key] = value

    _save_settings(saved)

    # Apply to current process env so the dialer can pick them up
    for key, value in saved.items():
        os.environ[key] = value

    mode = saved.get("DIALER_MODE", "mock")
    return {
        "status": "ok",
        "dialer_mode": mode,
        "connected": _check_connected(mode, saved),
        "restart_required": True,
    }


@router.post("/test-connection")
def test_connection(payload: dict):
    """Test RingCentral/BT Cloud Work credentials without restarting."""
    mode = payload.get("dialer_mode", "mock")
    config = payload.get("config", {})

    if mode == "mock":
        return {"success": True, "message": "Mock mode — no connection needed."}

    if mode == "twilio":
        return {"success": True, "message": "Twilio credentials will be validated on next call."}

    if mode in ("ringcentral", "btcloudwork"):
        import requests
        server = config.get("RINGCENTRAL_SERVER", "https://platform.ringcentral.com")
        client_id = config.get("RINGCENTRAL_CLIENT_ID", "")
        client_secret = config.get("RINGCENTRAL_CLIENT_SECRET", "")
        jwt_token = config.get("RINGCENTRAL_JWT_TOKEN", "")

        if not all([client_id, client_secret, jwt_token]):
            return {"success": False, "message": "Client ID, Client Secret, and JWT Token are all required."}

        try:
            resp = requests.post(
                f"{server}/restapi/oauth/token",
                data={"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": jwt_token},
                auth=(client_id, client_secret),
                timeout=10,
            )
            if resp.ok:
                return {"success": True, "message": "Authentication successful!"}
            else:
                detail = resp.json().get("error_description", resp.text)
                return {"success": False, "message": f"Authentication failed: {detail}"}
        except Exception as e:
            return {"success": False, "message": f"Connection error: {e}"}

    return {"success": False, "message": f"Unknown mode: {mode}"}


@router.post("/apply")
def apply_settings():
    """Reconfigure the dialer service with current settings (avoids full restart)."""
    from main import dialer_service
    saved = _load_saved_settings()

    for key, value in saved.items():
        os.environ[key] = value

    try:
        dialer_service.reconfigure()
        return {"status": "ok", "dialer_mode": dialer_service.mode}
    except Exception as e:
        return {"status": "error", "message": str(e)}
