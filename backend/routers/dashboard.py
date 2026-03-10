from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from database import get_db
from models import Call
from schemas import DashboardStats, CallOut

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    today_calls = db.query(Call).filter(Call.created_at >= today_start).all()

    calls_today = len(today_calls)
    durations = [c.duration_seconds for c in today_calls if c.duration_seconds]
    avg_duration = sum(durations) / len(durations) if durations else 0.0

    disposition_breakdown = {}
    for c in today_calls:
        d = c.disposition or "pending"
        disposition_breakdown[d] = disposition_breakdown.get(d, 0) + 1

    calls_by_hour = []
    for hour in range(24):
        count = sum(1 for c in today_calls if c.created_at and c.created_at.hour == hour)
        if count > 0:
            calls_by_hour.append({"hour": hour, "count": count})

    return DashboardStats(
        calls_today=calls_today,
        avg_duration_seconds=round(avg_duration, 1),
        disposition_breakdown=disposition_breakdown,
        calls_by_hour=calls_by_hour,
    )


@router.get("/recent-calls", response_model=list[CallOut])
def get_recent_calls(limit: int = 10, db: Session = Depends(get_db)):
    return (
        db.query(Call)
        .options(joinedload(Call.contact))
        .order_by(Call.created_at.desc())
        .limit(limit)
        .all()
    )
