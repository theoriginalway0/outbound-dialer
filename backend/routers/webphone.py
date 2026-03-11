import logging
from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webphone", tags=["webphone"])

_dialer_service = None


def set_dialer_service(service):
    global _dialer_service
    _dialer_service = service


@router.get("/sip-provision")
async def get_sip_provision():
    """Get SIP credentials for WebRTC calling via @ringcentral/web-phone."""
    if not _dialer_service or _dialer_service.mode not in ("ringcentral", "btcloudwork"):
        raise HTTPException(status_code=400, detail="RingCentral/BT Cloud Work mode required for WebRTC")
    try:
        resp = _dialer_service._requests.post(
            f"{_dialer_service.rc_server}/restapi/v1.0/client-info/sip-provision",
            headers=_dialer_service._rc_headers(),
            json={"sipInfo": [{"transport": "WSS"}]},
        )
        resp.raise_for_status()
        data = resp.json()
        data["_clientId"] = _dialer_service.rc_client_id
        data["_fromNumber"] = _dialer_service.rc_from_number
        return data
    except Exception as e:
        logger.error(f"SIP provision failed: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to get SIP credentials: {e}")
