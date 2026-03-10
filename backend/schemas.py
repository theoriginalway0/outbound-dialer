from datetime import datetime
from pydantic import BaseModel, ConfigDict


# --- Contact ---

class ContactBase(BaseModel):
    first_name: str
    last_name: str
    phone: str
    email: str | None = None
    company: str | None = None
    title: str | None = None
    status: str = "new"
    notes: str | None = None


class ContactCreate(ContactBase):
    pass


class ContactUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    email: str | None = None
    company: str | None = None
    title: str | None = None
    status: str | None = None
    notes: str | None = None


class ContactOut(ContactBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# --- Campaign ---

class CampaignBase(BaseModel):
    name: str
    description: str | None = None


class CampaignCreate(CampaignBase):
    contact_ids: list[int] = []


class CampaignUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None


class CampaignContactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    contact_id: int
    order_index: int
    status: str
    last_call_id: int | None = None
    contact: ContactOut


class CampaignOut(CampaignBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: str
    created_at: datetime
    updated_at: datetime
    campaign_contacts: list[CampaignContactOut] = []


class CampaignListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime
    contact_count: int = 0
    called_count: int = 0


# --- Call ---

class CallCreate(BaseModel):
    contact_id: int
    campaign_id: int | None = None


class CallDisposition(BaseModel):
    disposition: str
    notes: str | None = None


class CallOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    contact_id: int
    campaign_id: int | None = None
    direction: str
    status: str
    disposition: str | None = None
    duration_seconds: int | None = None
    notes: str | None = None
    provider_sid: str | None = None
    started_at: datetime
    ended_at: datetime | None = None
    created_at: datetime
    contact: ContactOut | None = None


# --- Dashboard ---

class DashboardStats(BaseModel):
    calls_today: int
    avg_duration_seconds: float
    disposition_breakdown: dict[str, int]
    calls_by_hour: list[dict]
