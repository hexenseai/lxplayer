from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from datetime import datetime

from ..db import get_session
from ..models import Style, User
from ..schemas import StyleCreate, StyleUpdate, StyleResponse
from ..auth import get_current_user, is_super_admin, check_company_access

router = APIRouter(prefix="/styles", tags=["styles"])


@router.get("", response_model=List[StyleResponse])
async def list_styles(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """List available styles based on user permissions"""
    try:
        print(f"DEBUG: list_styles called by user {current_user.id} with role {current_user.role}")
        
        if is_super_admin(current_user):
            print("DEBUG: User is super admin, getting all styles")
            # Süper admin tüm stilleri görebilir
            styles = session.exec(select(Style).order_by(Style.name)).all()
        else:
            print("DEBUG: User is not super admin")
            # Geçici olarak tüm kullanıcılar default stilleri görebilir
            print("DEBUG: Getting default styles for non-super admin")
            styles = session.exec(
                select(Style).where(Style.is_default == True).order_by(Style.name)
            ).all()
        
        print(f"DEBUG: Found {len(styles)} styles")
        
        # Convert to response models
        result = []
        for style in styles:
            try:
                print(f"DEBUG: Converting style {style.id} - {style.name}")
                style_data = style.model_dump()
                print(f"DEBUG: Style data keys: {list(style_data.keys())}")
                response_style = StyleResponse.model_validate(style_data)
                result.append(response_style)
            except Exception as e:
                print(f"DEBUG: Error converting style {style.id}: {e}")
                raise
        
        print(f"DEBUG: Successfully converted {len(result)} styles")
        return result
        
    except Exception as e:
        print(f"DEBUG: Error in list_styles: {e}")
        print(f"DEBUG: Error type: {type(e)}")
        import traceback
        print(f"DEBUG: Traceback: {traceback.format_exc()}")
        raise


@router.get("/{style_id}", response_model=StyleResponse)
async def get_style(
    style_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get a specific style by ID"""
    style = session.get(Style, style_id)
    if not style:
        raise HTTPException(status_code=404, detail="Style not found")
    
    # Yetki kontrolü
    if not style.is_default and not check_company_access(current_user, style.company_id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return StyleResponse.model_validate(style.model_dump())


@router.post("/", response_model=StyleResponse)
async def create_style(
    style_data: StyleCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new style"""
    # Admin ve süper admin kullanıcılar stil oluşturabilir
    if current_user.role not in ["Admin", "SuperAdmin"]:
        raise HTTPException(status_code=403, detail="Only admins can create styles")
    
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
        created_by=current_user.id
    )
    
    session.add(style)
    session.commit()
    session.refresh(style)
    
    return StyleResponse.model_validate(style.model_dump())


@router.put("/{style_id}", response_model=StyleResponse)
async def update_style(
    style_id: str,
    style_data: StyleUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
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
    
    # Yetki kontrolü
    if not check_company_access(current_user, style.company_id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Admin kullanıcı sadece kendi şirketindeki stilleri güncelleyebilir
    if current_user.role == "Admin" and not is_super_admin(current_user):
        if style_data.company_id and style_data.company_id != current_user.company_id:
            raise HTTPException(status_code=403, detail="Admin can only update styles in their own company")
    
    # Check if new name conflicts with existing style in the same company
    if style_data.name and style_data.name != style.name:
        existing_style = session.exec(
            select(Style).where(
                Style.name == style_data.name,
                Style.company_id == style.company_id
            )
        ).first()
        
        if existing_style:
            raise HTTPException(
                status_code=400, 
                detail="A style with this name already exists in this company"
            )
    
    # Update fields
    if style_data.name is not None:
        style.name = style_data.name
    if style_data.description is not None:
        style.description = style_data.description
    if style_data.style_json is not None:
        style.style_json = style_data.style_json
    if style_data.company_id is not None:
        style.company_id = style_data.company_id
    
    style.updated_at = datetime.utcnow()
    
    session.add(style)
    session.commit()
    session.refresh(style)
    
    return StyleResponse.model_validate(style.model_dump())


@router.delete("/{style_id}")
async def delete_style(
    style_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
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
    
    # Yetki kontrolü
    if not check_company_access(current_user, style.company_id):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Sadece admin ve süper admin kullanıcılar stil silebilir
    if current_user.role not in ["Admin", "SuperAdmin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete styles")
    
    session.delete(style)
    session.commit()
    
    return {"message": "Style deleted successfully"}


@router.get("/default", response_model=List[StyleResponse])
async def list_default_styles(
    session: Session = Depends(get_session)
):
    """List all default styles (no authentication required)"""
    styles = session.exec(
        select(Style).where(Style.is_default == True).order_by(Style.name)
    ).all()
    
    return [StyleResponse.model_validate(style.model_dump()) for style in styles]


@router.post("/seed-defaults")
async def seed_default_styles(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create default styles for the system"""
    # Only super admin can seed default styles
    if not is_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Only super admin can seed default styles")
    
    # Check if default styles already exist
    existing_defaults = session.exec(
        select(Style).where(Style.is_default == True)
    ).all()
    
    if existing_defaults:
        return {"message": "Default styles already exist"}
    
    # Create default styles
    default_styles = [
        {
            "name": "Default Style",
            "description": "Default system style",
            "style_json": '{"color": "#000000", "fontSize": "14px", "fontFamily": "Arial"}',
            "is_default": True,
            "created_by": current_user.id
        },
        {
            "name": "Modern Style",
            "description": "Modern design style",
            "style_json": '{"color": "#333333", "fontSize": "16px", "fontFamily": "Helvetica", "backgroundColor": "#f5f5f5"}',
            "is_default": True,
            "created_by": current_user.id
        },
        {
            "name": "Classic Style",
            "description": "Classic design style",
            "style_json": '{"color": "#000000", "fontSize": "12px", "fontFamily": "Times New Roman", "border": "1px solid #ccc"}',
            "is_default": True,
            "created_by": current_user.id
        }
    ]
    
    for style_data in default_styles:
        style = Style(**style_data)
        session.add(style)
    
    session.commit()
    
    return {"message": "Default styles created successfully"}