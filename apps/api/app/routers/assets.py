from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from ..db import get_session
from ..models import Asset

router = APIRouter(prefix="/assets", tags=["assets"])


class AssetIn(BaseModel):
    title: str
    kind: str
    uri: str
    description: str | None = None
    html_content: str | None = None


@router.get("")
def list_assets(session: Session = Depends(get_session)):
    return session.exec(select(Asset)).all()


@router.get("/{asset_id}")
def get_asset(asset_id: str, session: Session = Depends(get_session)):
    asset = session.get(Asset, asset_id)
    if not asset:
        raise HTTPException(404, "Asset not found")
    return asset


@router.post("")
def create_asset(body: AssetIn, session: Session = Depends(get_session)):
    asset = Asset(**body.model_dump())
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return asset


@router.put("/{asset_id}")
def update_asset(asset_id: str, body: AssetIn, session: Session = Depends(get_session)):
    asset = session.get(Asset, asset_id)
    if not asset:
        raise HTTPException(404, "Asset not found")
    for k, v in body.model_dump().items():
        setattr(asset, k, v)
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return asset


@router.delete("/{asset_id}")
def delete_asset(asset_id: str, session: Session = Depends(get_session)):
    asset = session.get(Asset, asset_id)
    if not asset:
        raise HTTPException(404, "Asset not found")
    session.delete(asset)
    session.commit()
    return {"ok": True}
