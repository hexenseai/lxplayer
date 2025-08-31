#!/usr/bin/env python3
"""
MinIO Bucket Setup Script
Bu script MinIO bucket'ını oluşturur ve gerekli policy/CORS ayarlarını yapar.
"""

import os
import json
from minio import Minio
from minio.error import S3Error

# Environment variables
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "lxplayer")
MINIO_SECURE = os.getenv("MINIO_SECURE", "false").lower() == "true"

def setup_minio_bucket():
    """MinIO bucket'ını oluştur ve ayarları yapılandır"""
    
    print(f"🔧 MinIO Bucket Setup başlıyor...")
    print(f"   Endpoint: {MINIO_ENDPOINT}")
    print(f"   Bucket: {MINIO_BUCKET}")
    print(f"   Secure: {MINIO_SECURE}")
    
    try:
        # MinIO client oluştur
        client = Minio(
            MINIO_ENDPOINT,
            access_key=MINIO_ACCESS_KEY,
            secret_key=MINIO_SECRET_KEY,
            secure=MINIO_SECURE
        )
        print("✅ MinIO client oluşturuldu")
        
        # 1. Bucket'ı oluştur (eğer yoksa)
        bucket_exists = client.bucket_exists(MINIO_BUCKET)
        if not bucket_exists:
            client.make_bucket(MINIO_BUCKET)
            print(f"✅ Bucket '{MINIO_BUCKET}' oluşturuldu")
        else:
            print(f"✅ Bucket '{MINIO_BUCKET}' zaten mevcut")
        
        # 2. Bucket Policy ayarla (public read access)
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
        
        try:
            client.set_bucket_policy(MINIO_BUCKET, json.dumps(bucket_policy))
            print("✅ Bucket policy ayarlandı (public read access)")
        except S3Error as e:
            print(f"⚠️  Bucket policy ayarlanamadı: {e}")
        
        # 3. CORS ayarlarını yapılandır
        cors_rules = [
            {
                "AllowedOrigins": ["*"],
                "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
                "AllowedHeaders": ["*"],
                "ExposeHeaders": ["ETag", "Content-Length"],
                "MaxAgeSeconds": 3600
            }
        ]
        
        try:
            client.set_bucket_cors(MINIO_BUCKET, cors_rules)
            print("✅ CORS ayarları yapılandırıldı")
        except S3Error as e:
            print(f"⚠️  CORS ayarları yapılandırılamadı: {e}")
        
        # 4. Bucket'ın public olduğunu doğrula
        try:
            policy = client.get_bucket_policy(MINIO_BUCKET)
            print("✅ Bucket policy doğrulandı")
        except S3Error as e:
            print(f"⚠️  Bucket policy doğrulanamadı: {e}")
        
        # 5. Test dosyası yükle ve erişimi test et
        test_object_name = "test-access.txt"
        test_content = "Bu dosya MinIO erişim testi için oluşturulmuştur."
        
        try:
            # Test dosyası yükle
            from io import BytesIO
            data = BytesIO(test_content.encode('utf-8'))
            client.put_object(MINIO_BUCKET, test_object_name, data, len(test_content), content_type="text/plain")
            print(f"✅ Test dosyası yüklendi: {test_object_name}")
            
            # Presigned URL oluştur ve test et
            presigned_url = client.presigned_get_object(MINIO_BUCKET, test_object_name, expires=3600)
            print(f"✅ Presigned URL oluşturuldu: {presigned_url[:100]}...")
            
            # Test dosyasını sil
            client.remove_object(MINIO_BUCKET, test_object_name)
            print(f"✅ Test dosyası silindi")
            
        except S3Error as e:
            print(f"❌ Test dosyası işlemleri başarısız: {e}")
        
        print("\n🎉 MinIO bucket setup tamamlandı!")
        print(f"   Bucket: {MINIO_BUCKET}")
        print(f"   Endpoint: {'https' if MINIO_SECURE else 'http'}://{MINIO_ENDPOINT}")
        print(f"   Access Key: {MINIO_ACCESS_KEY}")
        
    except Exception as e:
        print(f"❌ MinIO setup hatası: {e}")
        return False
    
    return True

if __name__ == "__main__":
    setup_minio_bucket()
