import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, Form
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from database import create_tables, get_db
from services.dialer import DialerService
from routers import contacts, campaigns, calls, dashboard

dialer_service = DialerService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    calls.set_dialer_service(dialer_service)
    yield


app = FastAPI(title="Outbound Dialer", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(contacts.router)
app.include_router(campaigns.router)
app.include_router(calls.router)
app.include_router(dashboard.router)


@app.websocket("/ws/call-status")
async def call_status_ws(websocket: WebSocket):
    await dialer_service.register_ws(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await dialer_service.unregister_ws(websocket)


@app.post("/api/calls/twilio-webhook")
async def twilio_webhook(request: Request):
    form = await request.form()
    twilio_sid = form.get("CallSid", "")
    twilio_status = form.get("CallStatus", "")
    db = next(get_db())
    try:
        await dialer_service.update_from_twilio_webhook(twilio_sid, twilio_status, db)
    finally:
        db.close()
    return {"status": "ok"}


@app.get("/api/health")
def health():
    return {"status": "ok", "dialer_mode": dialer_service.mode}
