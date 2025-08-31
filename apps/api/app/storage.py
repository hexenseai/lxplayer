import os
import json
from datetime import timedelta
from minio import Minio
from minio.error import S3Error

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "lxplayer")
MINIO_SECURE = os.getenv("MINIO_SECURE", "false").lower() == "true"

# Nginx proxy URL'i (browser'dan erişilebilir)
NGINX_PROXY_URL = os.getenv("NGINX_PROXY_URL", "http://yodea.hexense.ai")


def get_minio() -> Minio:
    if not MINIO_ACCESS_KEY or not MINIO_SECRET_KEY:
        raise RuntimeError("MINIO_ACCESS_KEY and MINIO_SECRET_KEY must be set in environment")
    client = Minio(MINIO_ENDPOINT, access_key=MINIO_ACCESS_KEY, secret_key=MINIO_SECRET_KEY, secure=MINIO_SECURE)
    return client


def ensure_bucket(client: Minio) -> None:
    """Bucket'ı oluştur ve gerekli ayarları yap"""
    found = client.bucket_exists(MINIO_BUCKET)
    if not found:
        client.make_bucket(MINIO_BUCKET)
        print(f"✅ Bucket '{MINIO_BUCKET}' oluşturuldu")
        
        # Bucket policy ayarla (public read access)
        try:
            bucket_policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {"AWS": "*"},
                        "Action": [
                            "s3:GetBucketLocation",
                            "s3:ListBucket"
                        ],
                        "Resource": f"arn:aws:s3:::{MINIO_BUCKET}"
                    },
                    {
                        "Effect": "Allow",
                        "Principal": {"AWS": "*"},
                        "Action": [
                            "s3:GetObject"
                        ],
                        "Resource": f"arn:aws:s3:::{MINIO_BUCKET}/*"
                    }
                ]
            }
            client.set_bucket_policy(MINIO_BUCKET, json.dumps(bucket_policy))
            print("✅ Bucket policy ayarlandı (public read access)")
        except S3Error as e:
            print(f"⚠️  Bucket policy ayarlanamadı: {e}")
        
        # CORS ayarlarını yapılandır
        try:
            cors_rules = [
                {
                    "AllowedOrigins": ["*"],
                    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
                    "AllowedHeaders": ["*"],
                    "ExposeHeaders": ["ETag", "Content-Length"],
                    "MaxAgeSeconds": 3600
                }
            ]
            client.set_bucket_cors(MINIO_BUCKET, cors_rules)
            print("✅ CORS ayarları yapılandırıldı")
        except S3Error as e:
            print(f"⚠️  CORS ayarları yapılandırılamadı: {e}")
    else:
        print(f"✅ Bucket '{MINIO_BUCKET}' zaten mevcut")


def presign_put_url(client: Minio, object_name: str, content_type: str | None = None, expires: int = 10800) -> str:
    """Presigned PUT URL oluştur (sadece backend içi kullanım için)"""
    return client.presigned_put_object(MINIO_BUCKET, object_name, expires=timedelta(seconds=expires))


def presign_get_url(client: Minio, object_name: str, expires: int = 10800) -> str:
    """Presigned GET URL oluştur (Nginx proxy üzerinden - browser erişimi için)"""
    # MinIO'dan presign URL al
    minio_url = client.presigned_get_object(MINIO_BUCKET, object_name, expires=timedelta(seconds=expires))
    
    # MinIO URL'ini Nginx proxy URL'ine dönüştür
    proxy_url = minio_url.replace(f"http://{MINIO_ENDPOINT}", NGINX_PROXY_URL)
    return proxy_url

