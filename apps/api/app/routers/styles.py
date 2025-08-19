from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from datetime import datetime

from ..db import get_session
from ..models import Style
from ..schemas import StyleCreate, StyleUpdate, StyleResponse

router = APIRouter(prefix="/styles", tags=["styles"])


@router.get("/", response_model=List[StyleResponse])
async def list_styles(
    session: Session = Depends(get_session)
):
    """List all available styles"""
    styles = session.exec(select(Style).order_by(Style.name)).all()
    return [StyleResponse.model_validate(style.dict()) for style in styles]


@router.get("/{style_id}", response_model=StyleResponse)
async def get_style(
    style_id: str,
    session: Session = Depends(get_session)
):
    """Get a specific style by ID"""
    style = session.get(Style, style_id)
    if not style:
        raise HTTPException(status_code=404, detail="Style not found")
    return StyleResponse.model_validate(style.dict())


@router.post("/", response_model=StyleResponse)
async def create_style(
    style_data: StyleCreate,
    session: Session = Depends(get_session)
):
    """Create a new style"""
    # Check if style name already exists
    existing_style = session.exec(
        select(Style).where(Style.name == style_data.name)
    ).first()
    
    if existing_style:
        raise HTTPException(
            status_code=400, 
            detail="A style with this name already exists"
        )
    
    style = Style(
        name=style_data.name,
        description=style_data.description,
        style_json=style_data.style_json,
        created_by=None
    )
    
    session.add(style)
    session.commit()
    session.refresh(style)
    
    return StyleResponse.model_validate(style.dict())


@router.put("/{style_id}", response_model=StyleResponse)
async def update_style(
    style_id: str,
    style_data: StyleUpdate,
    session: Session = Depends(get_session)
):
    """Update an existing style"""
    style = session.get(Style, style_id)
    if not style:
        raise HTTPException(status_code=404, detail="Style not found")
    
    # Don't allow updating default styles
    if style.is_default:
        raise HTTPException(
            status_code=403, 
            detail="Cannot modify default styles"
        )
    
    # Check if new name conflicts with existing style
    if style_data.name and style_data.name != style.name:
        existing_style = session.exec(
            select(Style).where(Style.name == style_data.name)
        ).first()
        
        if existing_style:
            raise HTTPException(
                status_code=400, 
                detail="A style with this name already exists"
            )
    
    # Update fields
    if style_data.name is not None:
        style.name = style_data.name
    if style_data.description is not None:
        style.description = style_data.description
    if style_data.style_json is not None:
        style.style_json = style_data.style_json
    
    style.updated_at = datetime.utcnow()
    
    session.add(style)
    session.commit()
    session.refresh(style)
    
    return StyleResponse.model_validate(style.dict())


@router.delete("/{style_id}")
async def delete_style(
    style_id: str,
    session: Session = Depends(get_session)
):
    """Delete a style"""
    style = session.get(Style, style_id)
    if not style:
        raise HTTPException(status_code=404, detail="Style not found")
    
    # Don't allow deleting default styles
    if style.is_default:
        raise HTTPException(
            status_code=403, 
            detail="Cannot delete default styles"
        )
    
    session.delete(style)
    session.commit()
    
    return {"message": "Style deleted successfully"}


@router.post("/seed-defaults")
async def seed_default_styles(
    session: Session = Depends(get_session)
):
    """Seed default styles if they don't exist"""
    default_styles = [
        {
            "name": "Varsayılan",
            "description": "Temel varsayılan stil",
            "style_json": "{}",
            "is_default": True
        },
        {
            "name": "Başlık Stili",
            "description": "Başlıklar için uygun stil",
            "style_json": '{"fontSize":"24px","fontWeight":"bold","color":"#2c3e50","textShadow":"1px 1px 2px rgba(0,0,0,0.1)"}',
            "is_default": True
        },
        {
            "name": "Vurgu Kutusu",
            "description": "Önemli bilgiler için vurgu kutusu",
            "style_json": '{"backgroundColor":"#f8f9fa","borderColor":"#dee2e6","borderWidth":"1px","borderStyle":"solid","borderRadius":"8px","padding":"12px","boxShadow":"0 2px 4px rgba(0,0,0,0.1)"}',
            "is_default": True
        },
        {
            "name": "Uyarı Kutusu",
            "description": "Uyarı mesajları için stil",
            "style_json": '{"backgroundColor":"#fff3cd","borderColor":"#ffeaa7","borderWidth":"1px","borderStyle":"solid","borderRadius":"6px","padding":"10px","color":"#856404"}',
            "is_default": True
        },
        {
            "name": "Büyük Metin",
            "description": "Büyük ve okunabilir metin stili",
            "style_json": '{"fontSize":"18px","fontWeight":"500","color":"#495057","lineHeight":"1.6"}',
            "is_default": True
        }
    ]
    
    created_count = 0
    for default_style in default_styles:
        existing = session.exec(
            select(Style).where(Style.name == default_style["name"])
        ).first()
        
        if not existing:
            style = Style(
                name=default_style["name"],
                description=default_style["description"],
                style_json=default_style["style_json"],
                is_default=default_style["is_default"],
                created_by=None
            )
            session.add(style)
            created_count += 1
    
    session.commit()
    
    return {"message": f"{created_count} default styles created"}
