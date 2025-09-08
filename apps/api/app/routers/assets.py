from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from ..db import get_session
from ..models import Asset, User
from ..auth import get_current_user, is_super_admin, check_company_access

router = APIRouter(prefix="/assets", tags=["assets"])


class AssetIn(BaseModel):
    title: str
    kind: str
    uri: str
    description: str | None = None
    html_content: str | None = None
    company_id: str | None = None


@router.get("")
def list_assets(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if is_super_admin(current_user):
        # Süper admin tüm asset'leri görebilir
        return session.exec(select(Asset)).all()
    else:
        # Diğer kullanıcılar sadece kendi şirketlerindeki asset'leri görebilir
        if not current_user.company_id:
            return []
        return session.exec(
            select(Asset).where(Asset.company_id == current_user.company_id)
        ).all()


@router.get("/{asset_id}")
def get_asset(
    asset_id: str, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    asset = session.get(Asset, asset_id)
    if not asset:
        raise HTTPException(404, "Asset not found")
    
    # Yetki kontrolü
    if not check_company_access(current_user, asset.company_id):
        raise HTTPException(403, "Access denied")
    
    return asset


@router.post("")
def create_asset(
    body: AssetIn, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Admin ve süper admin kullanıcılar asset oluşturabilir
    if current_user.role not in ["Admin", "SuperAdmin"]:
        raise HTTPException(403, "Only admins can create assets")
    
    # Admin kullanıcı sadece kendi şirketine asset ekleyebilir
    if current_user.role == "Admin" and not is_super_admin(current_user):
        if body.company_id and body.company_id != current_user.company_id:
            raise HTTPException(403, "Admin can only create assets in their own company")
        if not body.company_id:
            body.company_id = current_user.company_id
    
    asset = Asset(**body.model_dump())
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return asset


@router.put("/{asset_id}")
def update_asset(
    asset_id: str, 
    body: AssetIn, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    print(f"🔍 Asset update request - Asset ID: {asset_id}")
    print(f"👤 Current user: {current_user.email}, Role: {current_user.role}, Company ID: {current_user.company_id}")
    print(f"📤 Request body: {body.model_dump()}")
    
    asset = session.get(Asset, asset_id)
    if not asset:
        print(f"❌ Asset not found: {asset_id}")
        raise HTTPException(404, "Asset not found")
    
    print(f"📁 Asset found - Title: {asset.title}, Company ID: {asset.company_id}")
    
    # Yetki kontrolü
    has_access = check_company_access(current_user, asset.company_id)
    print(f"🔐 Access check result: {has_access}")
    print(f"🔐 User role: {current_user.role}, Is SuperAdmin: {is_super_admin(current_user)}")
    
    if not has_access:
        print(f"❌ Access denied for user {current_user.email} to asset {asset_id}")
        raise HTTPException(403, "Access denied")
    
    # Admin kullanıcı sadece kendi şirketindeki asset'leri güncelleyebilir
    if current_user.role == "Admin" and not is_super_admin(current_user):
        if body.company_id and body.company_id != current_user.company_id:
            raise HTTPException(403, "Admin can only update assets in their own company")
    
    for k, v in body.model_dump().items():
        setattr(asset, k, v)
    
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return asset


@router.delete("/{asset_id}")
def delete_asset(
    asset_id: str, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    asset = session.get(Asset, asset_id)
    if not asset:
        raise HTTPException(404, "Asset not found")
    
    # Yetki kontrolü
    if not check_company_access(current_user, asset.company_id):
        raise HTTPException(403, "Access denied")
    
    # Sadece admin ve süper admin kullanıcılar asset silebilir
    if current_user.role not in ["Admin", "SuperAdmin"]:
        raise HTTPException(403, "Only admins can delete assets")
    
    session.delete(asset)
    session.commit()
    return {"ok": True}
