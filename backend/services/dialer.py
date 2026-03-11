import asyncio
import json
import os
import random
import logging
from datetime import datetime, timezone

from fastapi import WebSocket
from sqlalchemy.orm import Session

from models import Call

logger = logging.getLogger(__name__)


class DialerService:
    def __init__(self):
        self.active_calls: dict[int, dict] = {}
        self.ws_connections: list[WebSocket] = []
        self._tasks: dict[int, asyncio.Task] = {}
        self._configure()

    def _configure(self):
        """Load provider settings from environment variables."""
        self.mode = os.getenv("DIALER_MODE", "mock")

        if self.mode == "twilio":
            from twilio.rest import Client
            self.twilio_client = Client(
                os.getenv("TWILIO_ACCOUNT_SID"),
                os.getenv("TWILIO_AUTH_TOKEN"),
            )
            self.twilio_from = os.getenv("TWILIO_FROM_NUMBER")
            self.twilio_twiml_url = os.getenv("TWILIO_TWIML_URL")

        elif self.mode in ("ringcentral", "btcloudwork"):
            import requests as _requests
            self._requests = _requests
            self.rc_server = os.getenv("RINGCENTRAL_SERVER", "https://platform.ringcentral.com")
            self.rc_client_id = os.getenv("RINGCENTRAL_CLIENT_ID", "")
            self.rc_client_secret = os.getenv("RINGCENTRAL_CLIENT_SECRET", "")
            self.rc_from_number = os.getenv("RINGCENTRAL_FROM_NUMBER", "")
            self.rc_access_token = None
            jwt_token = os.getenv("RINGCENTRAL_JWT_TOKEN")
            if jwt_token:
                self._rc_login_jwt(jwt_token)

        logger.info(f"Dialer initialized in {self.mode} mode")

    def reconfigure(self):
        """Re-read environment and reinitialise the provider (called from Settings UI)."""
        logger.info("Reconfiguring dialer service...")
        self._configure()

    async def initiate_call(self, call_id: int, phone: str, db: Session) -> dict:
        if self.mode == "mock":
            return await self._mock_initiate(call_id, phone, db)
        elif self.mode == "twilio":
            return await self._twilio_initiate(call_id, phone, db)
        elif self.mode in ("ringcentral", "btcloudwork"):
            return await self._ringcentral_initiate(call_id, phone, db)

    async def hangup_call(self, call_id: int, db: Session) -> None:
        if self.mode == "mock":
            await self._mock_hangup(call_id, db)
        elif self.mode == "twilio":
            await self._twilio_hangup(call_id, db)
        elif self.mode in ("ringcentral", "btcloudwork"):
            await self._ringcentral_hangup(call_id, db)

    # --- Mock mode ---

    async def _mock_initiate(self, call_id: int, phone: str, db: Session) -> dict:
        self.active_calls[call_id] = {
            "phone": phone,
            "started_at": datetime.now(timezone.utc),
        }
        task = asyncio.create_task(self._simulate_call(call_id, db))
        self._tasks[call_id] = task
        return {"provider_sid": None, "status": "initiated"}

    async def _simulate_call(self, call_id: int, db: Session):
        try:
            await asyncio.sleep(random.uniform(1, 2))

            call = db.query(Call).filter(Call.id == call_id).first()
            if not call or call.status == "completed":
                return

            call.status = "ringing"
            db.commit()
            await self.broadcast_status(call_id, "ringing", {})

            await asyncio.sleep(random.uniform(2, 4))

            call = db.query(Call).filter(Call.id == call_id).first()
            if not call or call.status == "completed":
                return

            outcome = random.choices(
                ["in_progress", "no_answer", "voicemail", "busy"],
                weights=[60, 15, 15, 10],
            )[0]

            if outcome == "in_progress":
                call.status = "in_progress"
                db.commit()
                await self.broadcast_status(call_id, "in_progress", {})
                # Call stays active until agent hangs up
            else:
                now = datetime.now(timezone.utc)
                call.status = "completed"
                call.disposition = outcome
                call.ended_at = now
                call.duration_seconds = int((now - call.started_at).total_seconds()) if call.started_at else 0
                db.commit()
                await self.broadcast_status(call_id, "completed", {
                    "disposition": outcome,
                    "duration_seconds": call.duration_seconds,
                })
                self.active_calls.pop(call_id, None)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error simulating call {call_id}: {e}")

    async def _mock_hangup(self, call_id: int, db: Session):
        task = self._tasks.pop(call_id, None)
        if task:
            task.cancel()

        call = db.query(Call).filter(Call.id == call_id).first()
        if call and call.status != "completed":
            now = datetime.now(timezone.utc)
            call.status = "completed"
            call.ended_at = now
            call.duration_seconds = int((now - call.started_at).total_seconds()) if call.started_at else 0
            db.commit()
            await self.broadcast_status(call_id, "completed", {
                "duration_seconds": call.duration_seconds,
            })

        self.active_calls.pop(call_id, None)

    # --- Twilio mode ---

    async def _twilio_initiate(self, call_id: int, phone: str, db: Session) -> dict:
        twilio_call = self.twilio_client.calls.create(
            to=phone,
            from_=self.twilio_from,
            url=self.twilio_twiml_url,
            status_callback=os.getenv("TWILIO_STATUS_CALLBACK_URL", ""),
            status_callback_event=["initiated", "ringing", "answered", "completed"],
        )
        call = db.query(Call).filter(Call.id == call_id).first()
        if call:
            call.provider_sid = twilio_call.sid
            db.commit()

        self.active_calls[call_id] = {"provider_sid": twilio_call.sid}
        return {"provider_sid": twilio_call.sid, "status": "initiated"}

    async def _twilio_hangup(self, call_id: int, db: Session):
        call = db.query(Call).filter(Call.id == call_id).first()
        if call and call.provider_sid:
            self.twilio_client.calls(call.provider_sid).update(status="completed")

        now = datetime.now(timezone.utc)
        if call and call.status != "completed":
            call.status = "completed"
            call.ended_at = now
            call.duration_seconds = int((now - call.started_at).total_seconds()) if call.started_at else 0
            db.commit()
            await self.broadcast_status(call_id, "completed", {
                "duration_seconds": call.duration_seconds,
            })

        self.active_calls.pop(call_id, None)

    async def update_from_twilio_webhook(self, twilio_sid: str, twilio_status: str, db: Session):
        """Called from the Twilio webhook endpoint to update call status."""
        call = db.query(Call).filter(Call.provider_sid == twilio_sid).first()
        if not call:
            return

        status_map = {
            "queued": "initiated",
            "ringing": "ringing",
            "in-progress": "in_progress",
            "completed": "completed",
            "busy": "completed",
            "no-answer": "completed",
            "failed": "failed",
        }
        internal_status = status_map.get(twilio_status, call.status)

        call.status = internal_status
        if internal_status in ("completed", "failed"):
            now = datetime.now(timezone.utc)
            call.ended_at = now
            call.duration_seconds = int((now - call.started_at).total_seconds()) if call.started_at else 0
            if twilio_status == "busy":
                call.disposition = "busy"
            elif twilio_status == "no-answer":
                call.disposition = "no_answer"
            self.active_calls.pop(call.id, None)

        db.commit()
        await self.broadcast_status(call.id, internal_status, {
            "disposition": call.disposition,
            "duration_seconds": call.duration_seconds,
        })

    # --- RingCentral / BT Cloud Work mode (uses requests directly) ---
    # BT Cloud Work is powered by RingCentral and does not have BT-specific APIs.
    # To integrate, follow the standard RingCentral Developers documentation:
    # https://developers.ringcentral.com/
    # Use DIALER_MODE=btcloudwork to label the integration as BT Cloud Work;
    # the underlying API calls are identical to DIALER_MODE=ringcentral.

    def _rc_login_jwt(self, jwt_token: str):
        """Authenticate with RingCentral/BT Cloud Work using JWT grant."""
        try:
            resp = self._requests.post(
                f"{self.rc_server}/restapi/oauth/token",
                data={"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": jwt_token},
                auth=(self.rc_client_id, self.rc_client_secret),
            )
            resp.raise_for_status()
            self.rc_access_token = resp.json()["access_token"]
            logger.info("RingCentral/BT Cloud Work JWT authentication successful")
        except Exception as e:
            logger.error(f"RingCentral/BT Cloud Work JWT auth failed: {e}")
            raise

    def _rc_headers(self):
        return {"Authorization": f"Bearer {self.rc_access_token}", "Content-Type": "application/json"}

    async def _ringcentral_initiate(self, call_id: int, phone: str, db: Session) -> dict:
        resp = self._requests.post(
            f"{self.rc_server}/restapi/v1.0/account/~/extension/~/ring-out",
            headers=self._rc_headers(),
            json={
                "to": {"phoneNumber": phone},
                "from": {"phoneNumber": self.rc_from_number},
                "playPrompt": True,
            },
        )
        resp.raise_for_status()
        rc_data = resp.json()
        rc_session_id = rc_data.get("id", "")

        call = db.query(Call).filter(Call.id == call_id).first()
        if call:
            call.provider_sid = str(rc_session_id)
            db.commit()

        self.active_calls[call_id] = {"provider_sid": rc_session_id}

        task = asyncio.create_task(self._poll_ringcentral_status(call_id, rc_session_id, db))
        self._tasks[call_id] = task

        return {"provider_sid": rc_session_id, "status": "initiated"}

    async def _poll_ringcentral_status(self, call_id: int, rc_session_id: str, db: Session):
        """Poll RingCentral RingOut status until the call completes."""
        try:
            rc_status_map = {
                "InProgress": "ringing",
                "Success": "in_progress",
                "CannotReach": "completed",
                "NoAnswer": "completed",
                "Busy": "completed",
                "Error": "failed",
            }
            disposition_map = {
                "CannotReach": "no_answer",
                "NoAnswer": "no_answer",
                "Busy": "busy",
            }

            while True:
                await asyncio.sleep(2)
                try:
                    resp = self._requests.get(
                        f"{self.rc_server}/restapi/v1.0/account/~/extension/~/ring-out/{rc_session_id}",
                        headers=self._rc_headers(),
                    )
                    if not resp.ok:
                        logger.warning(f"RingCentral status poll returned {resp.status_code} for call {call_id}")
                        break
                    rc_data = resp.json()
                    callee_status = rc_data.get("status", {}).get("calleeStatus", "InProgress")
                except Exception as e:
                    logger.warning(f"RingCentral status poll error for call {call_id}: {e}")
                    break

                internal_status = rc_status_map.get(callee_status, "initiated")

                call = db.query(Call).filter(Call.id == call_id).first()
                if not call or call.status == "completed":
                    break

                call.status = internal_status
                if internal_status in ("completed", "failed"):
                    now = datetime.now(timezone.utc)
                    call.ended_at = now
                    call.duration_seconds = int((now - call.started_at).total_seconds()) if call.started_at else 0
                    call.disposition = disposition_map.get(callee_status)
                    db.commit()
                    await self.broadcast_status(call_id, internal_status, {
                        "disposition": call.disposition,
                        "duration_seconds": call.duration_seconds,
                    })
                    self.active_calls.pop(call_id, None)
                    break
                else:
                    db.commit()
                    await self.broadcast_status(call_id, internal_status, {})

                if callee_status == "Success":
                    break
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error polling RingCentral status for call {call_id}: {e}")

    async def _ringcentral_hangup(self, call_id: int, db: Session):
        task = self._tasks.pop(call_id, None)
        if task:
            task.cancel()

        call = db.query(Call).filter(Call.id == call_id).first()
        if call and call.provider_sid:
            try:
                self._requests.delete(
                    f"{self.rc_server}/restapi/v1.0/account/~/extension/~/ring-out/{call.provider_sid}",
                    headers=self._rc_headers(),
                )
            except Exception as e:
                logger.warning(f"Error cancelling RingCentral RingOut: {e}")

        if call and call.status != "completed":
            now = datetime.now(timezone.utc)
            call.status = "completed"
            call.ended_at = now
            call.duration_seconds = int((now - call.started_at).total_seconds()) if call.started_at else 0
            db.commit()
            await self.broadcast_status(call_id, "completed", {
                "duration_seconds": call.duration_seconds,
            })

        self.active_calls.pop(call_id, None)

    # --- WebSocket ---

    async def register_ws(self, ws: WebSocket):
        await ws.accept()
        self.ws_connections.append(ws)

    async def unregister_ws(self, ws: WebSocket):
        if ws in self.ws_connections:
            self.ws_connections.remove(ws)

    async def broadcast_status(self, call_id: int, status: str, data: dict):
        message = json.dumps({
            "type": "call_status",
            "call_id": call_id,
            "status": status,
            "data": data,
        })
        stale = []
        for ws in self.ws_connections:
            try:
                await ws.send_text(message)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.ws_connections.remove(ws)
