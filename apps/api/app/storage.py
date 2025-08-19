import os
from datetime import timedelta
from minio import Minio
from minio.error import S3Error

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "lxplayer")
MINIO_SECURE = os.getenv("MINIO_SECURE", "false").lower() == "true"


def get_minio() -> Minio:
    if not MINIO_ACCESS_KEY or not MINIO_SECRET_KEY:
        raise RuntimeError("MINIO_ACCESS_KEY and MINIO_SECRET_KEY must be set in environment")
    client = Minio(MINIO_ENDPOINT, access_key=MINIO_ACCESS_KEY, secret_key=MINIO_SECRET_KEY, secure=MINIO_SECURE)
    return client


def ensure_bucket(client: Minio) -> None:
    found = client.bucket_exists(MINIO_BUCKET)
    if not found:
        client.make_bucket(MINIO_BUCKET)


def presign_put_url(client: Minio, object_name: str, content_type: str | None = None, expires: int = 3600) -> str:
    return client.presigned_put_object(MINIO_BUCKET, object_name, expires=timedelta(seconds=expires))


def presign_get_url(client: Minio, object_name: str, expires: int = 3600) -> str:
    return client.presigned_get_object(MINIO_BUCKET, object_name, expires=timedelta(seconds=expires))

