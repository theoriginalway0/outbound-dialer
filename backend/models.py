from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship
from database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(255), nullable=True)
    company = Column(String(200), nullable=True)
    title = Column(String(200), nullable=True)
    status = Column(String(20), default="new")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    calls = relationship("Call", back_populates="contact")
    campaign_contacts = relationship("CampaignContact", back_populates="contact")


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), default="draft")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    campaign_contacts = relationship("CampaignContact", back_populates="campaign", cascade="all, delete-orphan")


class CampaignContact(Base):
    __tablename__ = "campaign_contacts"
    __table_args__ = (
        UniqueConstraint("campaign_id", "contact_id", name="uq_campaign_contact"),
    )

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False)
    order_index = Column(Integer, nullable=False)
    status = Column(String(20), default="pending")
    last_call_id = Column(Integer, ForeignKey("calls.id"), nullable=True)

    campaign = relationship("Campaign", back_populates="campaign_contacts")
    contact = relationship("Contact", back_populates="campaign_contacts")
    last_call = relationship("Call", foreign_keys=[last_call_id])


class Call(Base):
    __tablename__ = "calls"

    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    phone_number = Column(String(20), nullable=True)
    direction = Column(String(10), default="outbound")
    status = Column(String(20), default="initiated")
    disposition = Column(String(20), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    provider_sid = Column(String(64), nullable=True)
    started_at = Column(DateTime, default=utcnow)
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    contact = relationship("Contact", back_populates="calls")
    campaign = relationship("Campaign")
