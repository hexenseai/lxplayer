from fastapi import APIRouter, Query, Depends, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlmodel import Session, select
from ..storage import get_minio, ensure_bucket, presign_put_url, presign_get_url
from ..db import get_session
from ..models import Asset
import uuid

router = APIRouter(prefix="/uploads", tags=["uploads"])


class UploadRequest(BaseModel):
    object_name: str
    content_type: str | None = None
    title: str | None = None
    description: str | None = None


@router.post("/presign")
def presign_upload(body: UploadRequest, session: Session = Depends(get_session)):
    print(f"🚀 Presign isteği alındı: {body.object_name}, content_type: {body.content_type}")
    try:
        client = get_minio()
        print(f"✅ MinIO client oluşturuldu")
        ensure_bucket(client)
        print(f"✅ Bucket kontrol edildi")
        put_url = presign_put_url(client, body.object_name, content_type=body.content_type)
        print(f"✅ PUT URL oluşturuldu: {put_url[:100]}...")
        get_url = presign_get_url(client, body.object_name)
        print(f"✅ GET URL oluşturuldu: {get_url[:100]}...")
        
        # Determine content type from object name or provided content_type
        content_type = body.content_type or "application/octet-stream"
        kind = "doc"  # default
        if content_type.startswith("image/"):
            kind = "image"
        elif content_type.startswith("video/"):
            kind = "video"
        elif content_type.startswith("audio/"):
            kind = "audio"
        
        # Create asset record with unique ID
        asset = Asset(
            title=body.title or body.object_name,
            kind=kind,
            uri=body.object_name,
            description=body.description
        )
        session.add(asset)
        session.commit()
        session.refresh(asset)
        
        result = {
            "put_url": put_url, 
            "get_url": get_url, 
            "bucket": 'lxplayer', 
            "object": body.object_name,
            "asset_id": asset.id,  # Unique ID for JSON operations
            "asset": {
                "id": asset.id,
                "title": asset.title,
                "kind": asset.kind,
                "uri": asset.uri,
                "description": asset.description
            }
        }
        print(f"✅ Presign başarılı: {result}")
        return result
    except Exception as e:
        print(f"❌ Presign hatası: {e}")
        raise


@router.get("/asset/{asset_id}")
def get_asset_by_id(asset_id: str, session: Session = Depends(get_session)):
    """Get asset information by its unique ID"""
    asset = session.get(Asset, asset_id)
    if not asset:
        raise HTTPException(404, "Asset not found")
    
    # Generate fresh presigned URLs
    client = get_minio()
    get_url = presign_get_url(client, asset.uri)
    
    return {
        "id": asset.id,
        "title": asset.title,
        "kind": asset.kind,
        "uri": asset.uri,
        "description": asset.description,
        "get_url": get_url
    }


@router.post("/presign-get")
def presign_get_url_endpoint(body: UploadRequest, session: Session = Depends(get_session)):
    """Generate presigned GET URL for an object"""
    try:
        client = get_minio()
        get_url = presign_get_url(client, body.object_name)
        
        return {
            "get_url": get_url,
            "object": body.object_name
        }
    except Exception as e:
        print(f"❌ Presign GET hatası: {e}")
        raise HTTPException(500, f"Presign GET hatası: {e}")


@router.get("/presign-get-object/{object_name:path}")
def presign_get_object(object_name: str):
    """Return a 302 redirect to a fresh presigned GET URL for the given object path"""
    try:
        client = get_minio()
        url = presign_get_url(client, object_name)
        return RedirectResponse(url=url, status_code=302)
    except Exception as e:
        print(f"❌ Presign GET redirect hatası: {e}")
        raise HTTPException(500, f"Presign GET redirect hatası: {e}")


@router.get("/assets")
def list_assets(session: Session = Depends(get_session)):
    """List all assets with their unique IDs"""
    assets = session.exec(select(Asset)).all()
    
    # Generate fresh presigned URLs for each asset
    client = get_minio()
    result = []
    for asset in assets:
        get_url = presign_get_url(client, asset.uri)
        result.append({
            "id": asset.id,
            "title": asset.title,
            "kind": asset.kind,
            "uri": asset.uri,
            "description": asset.description,
            "get_url": get_url
        })
    
    return result

