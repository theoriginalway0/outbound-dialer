import csv
import io
import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Campaign, CampaignContact, Contact
from schemas import (
    CampaignCreate, CampaignUpdate, CampaignOut,
    CampaignListOut, CampaignContactOut, CampaignImportResponse,
)

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])


@router.get("/", response_model=list[CampaignListOut])
def list_campaigns(db: Session = Depends(get_db)):
    campaigns = db.query(Campaign).order_by(Campaign.created_at.desc()).all()
    result = []
    for c in campaigns:
        total = db.query(CampaignContact).filter(CampaignContact.campaign_id == c.id).count()
        called = (
            db.query(CampaignContact)
            .filter(CampaignContact.campaign_id == c.id, CampaignContact.status == "called")
            .count()
        )
        result.append(CampaignListOut(
            id=c.id, name=c.name, description=c.description,
            status=c.status, created_at=c.created_at, updated_at=c.updated_at,
            contact_count=total, called_count=called,
        ))
    return result


@router.post("/import", response_model=CampaignImportResponse)
async def import_campaign(
    file: UploadFile = File(...),
    campaign_name: str = Form(...),
    column_map: str = Form(...),
    db: Session = Depends(get_db),
):
    """Import contacts from a CSV file and create a campaign.

    column_map is a JSON string mapping app fields to CSV column headers, e.g.:
    {"first_name": "First Name", "last_name": "Last Name", "phone": "Phone"}
    """
    try:
        mapping = json.loads(column_map)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid column_map JSON")

    if "phone" not in mapping:
        raise HTTPException(status_code=400, detail="column_map must include a 'phone' mapping")

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    csv_headers = reader.fieldnames or []

    for field, csv_col in mapping.items():
        if csv_col not in csv_headers:
            raise HTTPException(
                status_code=400,
                detail=f"CSV column '{csv_col}' not found. Available: {csv_headers}",
            )

    campaign = Campaign(name=campaign_name)
    db.add(campaign)
    db.flush()

    contacts_created = 0
    contacts_existing = 0
    errors = []
    contact_ids = []

    for row_num, row in enumerate(reader, start=2):
        phone = (row.get(mapping.get("phone", ""), "") or "").strip()
        if not phone:
            errors.append({"row": row_num, "message": "Missing phone number"})
            continue

        first_name = (row.get(mapping.get("first_name", ""), "") or "").strip()
        last_name = (row.get(mapping.get("last_name", ""), "") or "").strip()

        if not first_name and not last_name:
            errors.append({"row": row_num, "message": "Missing both first and last name"})
            continue

        existing = db.query(Contact).filter(Contact.phone == phone).first()
        if existing:
            contacts_existing += 1
            contact_ids.append(existing.id)
            continue

        contact = Contact(
            first_name=first_name or "",
            last_name=last_name or "",
            phone=phone,
            email=(row.get(mapping.get("email", ""), "") or "").strip() or None,
            company=(row.get(mapping.get("company", ""), "") or "").strip() or None,
            title=(row.get(mapping.get("title", ""), "") or "").strip() or None,
        )
        db.add(contact)
        db.flush()
        contacts_created += 1
        contact_ids.append(contact.id)

    for idx, contact_id in enumerate(contact_ids):
        existing_cc = (
            db.query(CampaignContact)
            .filter(CampaignContact.campaign_id == campaign.id, CampaignContact.contact_id == contact_id)
            .first()
        )
        if not existing_cc:
            db.add(CampaignContact(
                campaign_id=campaign.id, contact_id=contact_id, order_index=idx,
            ))

    db.commit()

    return CampaignImportResponse(
        campaign_id=campaign.id,
        campaign_name=campaign.name,
        contacts_created=contacts_created,
        contacts_existing=contacts_existing,
        total_rows=contacts_created + contacts_existing + len(errors),
        errors=errors,
    )


@router.get("/{campaign_id}", response_model=CampaignOut)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = (
        db.query(Campaign)
        .options(joinedload(Campaign.campaign_contacts).joinedload(CampaignContact.contact))
        .filter(Campaign.id == campaign_id)
        .first()
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign.campaign_contacts.sort(key=lambda cc: cc.order_index)
    return campaign


@router.post("/", response_model=CampaignOut, status_code=201)
def create_campaign(data: CampaignCreate, db: Session = Depends(get_db)):
    campaign = Campaign(name=data.name, description=data.description)
    db.add(campaign)
    db.flush()

    for idx, contact_id in enumerate(data.contact_ids):
        contact = db.query(Contact).filter(Contact.id == contact_id).first()
        if not contact:
            raise HTTPException(status_code=400, detail=f"Contact {contact_id} not found")
        cc = CampaignContact(
            campaign_id=campaign.id, contact_id=contact_id, order_index=idx
        )
        db.add(cc)

    db.commit()
    db.refresh(campaign)
    # Reload with contacts
    return get_campaign(campaign.id, db)


@router.patch("/{campaign_id}", response_model=CampaignOut)
def update_campaign(campaign_id: int, data: CampaignUpdate, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(campaign, key, value)
    db.commit()
    db.refresh(campaign)
    return get_campaign(campaign.id, db)


@router.delete("/{campaign_id}", status_code=204)
def delete_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    db.delete(campaign)
    db.commit()


@router.post("/{campaign_id}/contacts", response_model=CampaignOut)
def add_contacts_to_campaign(campaign_id: int, contact_ids: list[int], db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    max_order = (
        db.query(CampaignContact.order_index)
        .filter(CampaignContact.campaign_id == campaign_id)
        .order_by(CampaignContact.order_index.desc())
        .first()
    )
    next_order = (max_order[0] + 1) if max_order else 0

    for idx, contact_id in enumerate(contact_ids):
        existing = (
            db.query(CampaignContact)
            .filter(CampaignContact.campaign_id == campaign_id, CampaignContact.contact_id == contact_id)
            .first()
        )
        if existing:
            continue
        cc = CampaignContact(
            campaign_id=campaign_id, contact_id=contact_id, order_index=next_order + idx
        )
        db.add(cc)

    db.commit()
    return get_campaign(campaign_id, db)


@router.delete("/{campaign_id}/contacts/{contact_id}", status_code=204)
def remove_contact_from_campaign(campaign_id: int, contact_id: int, db: Session = Depends(get_db)):
    cc = (
        db.query(CampaignContact)
        .filter(CampaignContact.campaign_id == campaign_id, CampaignContact.contact_id == contact_id)
        .first()
    )
    if not cc:
        raise HTTPException(status_code=404, detail="Contact not in campaign")
    db.delete(cc)
    db.commit()


@router.get("/{campaign_id}/next", response_model=CampaignContactOut)
def get_next_contact(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    cc = (
        db.query(CampaignContact)
        .options(joinedload(CampaignContact.contact))
        .filter(
            CampaignContact.campaign_id == campaign_id,
            CampaignContact.status == "pending",
        )
        .order_by(CampaignContact.order_index)
        .first()
    )
    if not cc:
        raise HTTPException(status_code=404, detail="No more pending contacts")
    return cc


@router.post("/{campaign_id}/skip/{contact_id}", status_code=200)
def skip_contact(campaign_id: int, contact_id: int, db: Session = Depends(get_db)):
    cc = (
        db.query(CampaignContact)
        .filter(CampaignContact.campaign_id == campaign_id, CampaignContact.contact_id == contact_id)
        .first()
    )
    if not cc:
        raise HTTPException(status_code=404, detail="Contact not in campaign")
    cc.status = "skipped"
    db.commit()
    return {"status": "skipped"}
