"""Seed the database with sample contacts and a campaign."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal, create_tables
from models import Contact, Campaign, CampaignContact

CONTACTS = [
    {"first_name": "Sarah", "last_name": "Johnson", "phone": "+1-555-0101", "email": "sarah.j@acme.com", "company": "Acme Corp", "title": "VP Sales"},
    {"first_name": "Michael", "last_name": "Chen", "phone": "+1-555-0102", "email": "mchen@globex.com", "company": "Globex Inc", "title": "CTO"},
    {"first_name": "Emily", "last_name": "Williams", "phone": "+1-555-0103", "email": "emily.w@initech.com", "company": "Initech", "title": "Procurement Manager"},
    {"first_name": "James", "last_name": "Brown", "phone": "+1-555-0104", "email": "jbrown@stark.com", "company": "Stark Industries", "title": "Director of Engineering"},
    {"first_name": "Olivia", "last_name": "Davis", "phone": "+1-555-0105", "email": "olivia.d@wayne.com", "company": "Wayne Enterprises", "title": "Head of IT"},
    {"first_name": "Robert", "last_name": "Miller", "phone": "+1-555-0106", "email": "rmiller@oscorp.com", "company": "Oscorp", "title": "Senior Developer"},
    {"first_name": "Jessica", "last_name": "Wilson", "phone": "+1-555-0107", "email": "jwilson@umbrella.com", "company": "Umbrella Corp", "title": "Operations Lead"},
    {"first_name": "David", "last_name": "Taylor", "phone": "+1-555-0108", "email": "dtaylor@cyberdyne.com", "company": "Cyberdyne Systems", "title": "Product Manager"},
    {"first_name": "Amanda", "last_name": "Martinez", "phone": "+1-555-0109", "email": "amartinez@lexcorp.com", "company": "LexCorp", "title": "Business Analyst"},
    {"first_name": "Thomas", "last_name": "Anderson", "phone": "+1-555-0110", "email": "tanderson@metacortex.com", "company": "Meta Cortex", "title": "Software Engineer"},
    {"first_name": "Lisa", "last_name": "Garcia", "phone": "+1-555-0111", "email": "lgarcia@weyland.com", "company": "Weyland Corp", "title": "CFO"},
    {"first_name": "Daniel", "last_name": "Lee", "phone": "+1-555-0112", "email": "dlee@tyrell.com", "company": "Tyrell Corp", "title": "Research Director"},
    {"first_name": "Rachel", "last_name": "Clark", "phone": "+1-555-0113", "email": "rclark@soylent.com", "company": "Soylent Corp", "title": "Marketing Manager"},
    {"first_name": "Kevin", "last_name": "Hall", "phone": "+1-555-0114", "email": "khall@massive.com", "company": "Massive Dynamic", "title": "VP Engineering"},
    {"first_name": "Nicole", "last_name": "Young", "phone": "+1-555-0115", "email": "nyoung@hooli.com", "company": "Hooli", "title": "Head of Sales"},
]


def seed():
    create_tables()
    db = SessionLocal()

    if db.query(Contact).count() > 0:
        print("Database already has contacts. Skipping seed.")
        db.close()
        return

    contact_objs = []
    for c in CONTACTS:
        contact = Contact(**c)
        db.add(contact)
        contact_objs.append(contact)

    db.flush()

    # Create a sample campaign with the first 8 contacts
    campaign = Campaign(name="Q1 Outreach", description="First quarter sales outreach campaign", status="active")
    db.add(campaign)
    db.flush()

    for idx, contact in enumerate(contact_objs[:8]):
        cc = CampaignContact(
            campaign_id=campaign.id,
            contact_id=contact.id,
            order_index=idx,
        )
        db.add(cc)

    # Create a second campaign
    campaign2 = Campaign(name="Product Demo Follow-up", description="Follow up with demo attendees", status="draft")
    db.add(campaign2)
    db.flush()

    for idx, contact in enumerate(contact_objs[5:12]):
        cc = CampaignContact(
            campaign_id=campaign2.id,
            contact_id=contact.id,
            order_index=idx,
        )
        db.add(cc)

    db.commit()
    db.close()
    print(f"Seeded {len(CONTACTS)} contacts and 2 campaigns.")


if __name__ == "__main__":
    seed()
