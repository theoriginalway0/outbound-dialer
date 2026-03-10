from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Campaign, CampaignContact, Contact
from schemas import (
    CampaignCreate, CampaignUpdate, CampaignOut,
    CampaignListOut, CampaignContactOut,
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
