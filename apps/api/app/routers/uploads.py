from fastapi import APIRouter, Query, Depends, HTTPException, UploadFile, File
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlmodel import Session, select
from ..storage import get_minio, ensure_bucket, presign_put_url, presign_get_url
from ..db import get_session
from ..models import Asset, User
from ..auth import get_current_user
import uuid
import io

router = APIRouter(prefix="/uploads", tags=["uploads"])


class UploadRequest(BaseModel):
    object_name: str
    content_type: str | None = None
    title: str | None = None
    description: str | None = None


@router.options("/upload-file")
async def upload_file_options():
    """CORS preflight for upload endpoint"""
    return {"message": "CORS preflight successful"}

@router.post("/upload-file")
async def upload_file_direct(
    file: UploadFile = File(...),  # File upload
    title: str = None,
    description: str = None,
    session: Session = Depends(get_session)
):
    """Backend üzerinden dosya yükleme"""
    print(f"🚀 Upload endpoint çağrıldı: {file.filename}")
    try:
        # Dosya adını güvenli hale getir
        safe_filename = file.filename.replace(" ", "_").replace("/", "_")
        object_name = f"assets/{uuid.uuid4()}_{safe_filename}"
        
        # Content type'ı belirle
        content_type = file.content_type or "application/octet-stream"
        
        # MinIO client oluştur
        client = get_minio()
        ensure_bucket(client)
        
        # Dosyayı MinIO'ya yükle
        file_content = await file.read()
        data = io.BytesIO(file_content)
        
        client.put_object(
            'lxplayer',
            object_name,
            data,
            len(file_content),
            content_type=content_type
        )
        
        # Asset kaydı oluştur
        kind = "doc"
        if content_type.startswith("image/"):
            kind = "image"
        elif content_type.startswith("video/"):
            kind = "video"
        elif content_type.startswith("audio/"):
            kind = "audio"
        
        asset = Asset(
            title=title or file.filename,
            kind=kind,
            uri=object_name,
            description=description
        )
        session.add(asset)
        session.commit()
        session.refresh(asset)
        
        # GET URL oluştur (domain üzerinden)
        get_url = presign_get_url(client, object_name)
        
        return {
            "status": "success",
            "asset_id": asset.id,
            "object_name": object_name,
            "get_url": get_url,
            "asset": {
                "id": asset.id,
                "title": asset.title,
                "kind": asset.kind,
                "uri": asset.uri,
                "description": asset.description
            }
        }
        
    except Exception as e:
        print(f"❌ Direct upload hatası: {e}")
        raise HTTPException(500, f"Upload hatası: {e}")


@router.get("/test-minio")
def test_minio_connection():
    """MinIO bağlantısını test et"""
    try:
        client = get_minio()
        print(f"✅ MinIO client oluşturuldu")
        
        # Bucket'ı kontrol et ve oluştur
        ensure_bucket(client)
        
        # Test dosyası yükle
        test_object_name = "test-connection.txt"
        test_content = "MinIO bağlantı testi başarılı!"
        
        from io import BytesIO
        data = BytesIO(test_content.encode('utf-8'))
        client.put_object(
            'lxplayer',
            test_object_name,
            data,
            len(test_content),
            content_type="text/plain"
        )
        print(f"✅ Test dosyası yüklendi: {test_object_name}")
        
        # Presigned URL oluştur
        get_url = presign_get_url(client, test_object_name)
        print(f"✅ Presigned URL oluşturuldu: {get_url[:100]}...")
        
        # Test dosyasını sil
        client.remove_object('lxplayer', test_object_name)
        print(f"✅ Test dosyası silindi")
        
        return {
            "status": "success",
            "message": "MinIO bağlantısı başarılı",
            "bucket": "lxplayer",
            "test_url": get_url[:100] + "..."
        }
        
    except Exception as e:
        print(f"❌ MinIO test hatası: {e}")
        raise HTTPException(500, f"MinIO test hatası: {e}")


@router.post("/presign")
def presign_upload(body: UploadRequest, session: Session = Depends(get_session)):
    print(f"🚀 Presign isteği alındı: {body.object_name}, content_type: {body.content_type}")
    try:
        client = get_minio()
        print(f"✅ MinIO client oluşturuldu")
        ensure_bucket(client)
        print(f"✅ Bucket kontrol edildi")
        
        # Sadece GET URL oluştur (domain üzerinden)
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
            "get_url": get_url, 
            "bucket": 'lxplayer', 
            "object": body.object_name,
            "asset_id": asset.id,
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


@router.post("/avatar-image")
async def upload_avatar_image(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Avatar görseli yükleme"""
    print(f"🚀 Avatar image upload: {file.filename}")
    
    # Sadece Admin ve SuperAdmin yükleyebilir
    if current_user.role not in ["Admin", "SuperAdmin"]:
        raise HTTPException(status_code=403, detail="Only Admin and SuperAdmin can upload avatar images")
    
    try:
        # Dosya tipini kontrol et
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Only image files are allowed")
        
        # Dosya boyutunu kontrol et (max 5MB)
        file_content = await file.read()
        if len(file_content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size must be less than 5MB")
        
        # Dosya adını güvenli hale getir
        safe_filename = file.filename.replace(" ", "_").replace("/", "_")
        object_name = f"avatars/{uuid.uuid4()}_{safe_filename}"
        
        # MinIO client oluştur
        client = get_minio()
        ensure_bucket(client)
        
        # Dosyayı MinIO'ya yükle
        data = io.BytesIO(file_content)
        client.put_object(
            'lxplayer',
            object_name,
            data,
            len(file_content),
            content_type=file.content_type
        )
        
        # GET URL oluştur
        get_url = presign_get_url(client, object_name)
        
        return {
            "status": "success",
            "image_url": get_url,
            "object_name": object_name,
            "filename": file.filename,
            "content_type": file.content_type,
            "size": len(file_content)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Avatar upload hatası: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


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

