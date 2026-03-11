from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Call, Contact, CampaignContact
from schemas import CallCreate, CallDisposition, CallOut

router = APIRouter(prefix="/api/calls", tags=["calls"])

# Dialer service will be injected at app startup
_dialer_service = None


def set_dialer_service(service):
    global _dialer_service
    _dialer_service = service


def get_dialer():
    if _dialer_service is None:
        raise HTTPException(status_code=500, detail="Dialer service not initialized")
    return _dialer_service


@router.get("/active", response_model=CallOut | None)
def get_active_call(db: Session = Depends(get_db)):
    call = (
        db.query(Call)
        .options(joinedload(Call.contact))
        .filter(Call.status.in_(["initiated", "ringing", "in_progress"]))
        .order_by(Call.created_at.desc())
        .first()
    )
    return call


@router.get("/", response_model=list[CallOut])
def list_calls(
    contact_id: int | None = None,
    campaign_id: int | None = None,
    disposition: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(Call).options(joinedload(Call.contact))
    if contact_id:
        q = q.filter(Call.contact_id == contact_id)
    if campaign_id:
        q = q.filter(Call.campaign_id == campaign_id)
    if disposition:
        q = q.filter(Call.disposition == disposition)
    return q.order_by(Call.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{call_id}", response_model=CallOut)
def get_call(call_id: int, db: Session = Depends(get_db)):
    call = db.query(Call).options(joinedload(Call.contact)).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    return call


@router.post("/initiate", response_model=CallOut, status_code=201)
async def initiate_call(data: CallCreate, db: Session = Depends(get_db)):
    dialer = get_dialer()

    contact = db.query(Contact).filter(Contact.id == data.contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    # Check for existing active call
    active = (
        db.query(Call)
        .filter(Call.status.in_(["initiated", "ringing", "in_progress"]))
        .first()
    )
    if active:
        raise HTTPException(status_code=409, detail="Another call is already active")

    call = Call(
        contact_id=data.contact_id,
        campaign_id=data.campaign_id,
        status="initiated",
    )
    db.add(call)
    db.commit()
    db.refresh(call)

    # Start the call via the dialer service
    try:
        await dialer.initiate_call(call.id, contact.phone, db)
    except Exception as e:
        call.status = "failed"
        db.commit()
        raise HTTPException(status_code=502, detail=f"Failed to initiate call: {e}")

    db.refresh(call)
    call.contact = contact
    return call


@router.post("/{call_id}/hangup", response_model=CallOut)
async def hangup_call(call_id: int, db: Session = Depends(get_db)):
    dialer = get_dialer()

    call = db.query(Call).options(joinedload(Call.contact)).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    if call.status not in ("initiated", "ringing", "in_progress"):
        raise HTTPException(status_code=400, detail="Call is not active")

    await dialer.hangup_call(call.id, db)

    db.refresh(call)
    return call


@router.post("/{call_id}/end", response_model=CallOut)
def end_call(call_id: int, data: CallDisposition, db: Session = Depends(get_db)):
    call = db.query(Call).options(joinedload(Call.contact)).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    call.disposition = data.disposition
    if data.notes:
        call.notes = data.notes
    if not call.ended_at:
        call.ended_at = datetime.now(timezone.utc)
    if call.started_at and call.ended_at:
        call.duration_seconds = int((call.ended_at - call.started_at).total_seconds())
    call.status = "completed"

    # Update campaign contact status if applicable
    if call.campaign_id:
        cc = (
            db.query(CampaignContact)
            .filter(
                CampaignContact.campaign_id == call.campaign_id,
                CampaignContact.contact_id == call.contact_id,
            )
            .first()
        )
        if cc:
            cc.status = "called"
            cc.last_call_id = call.id

    db.commit()
    db.refresh(call)
    return call
