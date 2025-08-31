#!/bin/bash

# MinIO Bucket Setup Script
# Bu script MinIO bucket'ını oluşturur ve gerekli ayarları yapar

set -e

echo "🔧 MinIO Bucket Setup başlıyor..."

# Environment variables
MINIO_ENDPOINT=${MINIO_ENDPOINT:-"localhost:9000"}
MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY:-"minioadmin"}
MINIO_SECRET_KEY=${MINIO_SECRET_KEY:-"minioadmin"}
MINIO_BUCKET=${MINIO_BUCKET:-"lxplayer"}

echo "   Endpoint: $MINIO_ENDPOINT"
echo "   Bucket: $MINIO_BUCKET"
echo "   Access Key: $MINIO_ACCESS_KEY"

# MinIO client'ın yüklü olup olmadığını kontrol et
if ! command -v mc &> /dev/null; then
    echo "❌ MinIO client (mc) yüklü değil. Yükleniyor..."
    
    # Linux için MinIO client indir
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        wget https://dl.min.io/client/mc/release/linux-amd64/mc
        chmod +x mc
        sudo mv mc /usr/local/bin/
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS için
        brew install minio/stable/mc
    else
        echo "❌ Desteklenmeyen işletim sistemi: $OSTYPE"
        exit 1
    fi
fi

echo "✅ MinIO client hazır"

# MinIO server'a bağlan
echo "🔗 MinIO server'a bağlanılıyor..."
mc alias set myminio http://$MINIO_ENDPOINT $MINIO_ACCESS_KEY $MINIO_SECRET_KEY

# Bucket'ı oluştur
echo "📦 Bucket oluşturuluyor..."
mc mb myminio/$MINIO_BUCKET --ignore-existing

# Bucket policy ayarla (public read access)
echo "🔓 Bucket policy ayarlanıyor..."
cat > /tmp/bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {"AWS": "*"},
            "Action": [
                "s3:GetBucketLocation",
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::$MINIO_BUCKET"
        },
        {
            "Effect": "Allow",
            "Principal": {"AWS": "*"},
            "Action": [
                "s3:GetObject"
            ],
            "Resource": "arn:aws:s3:::$MINIO_BUCKET/*"
        }
    ]
}
EOF

mc policy set myminio/$MINIO_BUCKET /tmp/bucket-policy.json

# CORS ayarlarını yapılandır
echo "🌐 CORS ayarları yapılandırılıyor..."
cat > /tmp/cors.json << EOF
{
    "CORSRules": [
        {
            "AllowedOrigins": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
            "AllowedHeaders": ["*"],
            "ExposeHeaders": ["ETag", "Content-Length"],
            "MaxAgeSeconds": 3600
        }
    ]
}
EOF

mc admin config set myminio cors:mycors /tmp/cors.json
mc admin service restart myminio

# Test dosyası yükle ve erişimi test et
echo "🧪 Test dosyası yükleniyor..."
echo "Bu dosya MinIO erişim testi için oluşturulmuştur." > /tmp/test-access.txt

mc cp /tmp/test-access.txt myminio/$MINIO_BUCKET/
echo "✅ Test dosyası yüklendi"

# Test dosyasının URL'ini al
echo "🔗 Test dosyası URL'i:"
mc share download myminio/$MINIO_BUCKET/test-access.txt --expire 1h

# Test dosyasını sil
mc rm myminio/$MINIO_BUCKET/test-access.txt
echo "✅ Test dosyası silindi"

# Temizlik
rm -f /tmp/bucket-policy.json /tmp/cors.json /tmp/test-access.txt

echo ""
echo "🎉 MinIO bucket setup tamamlandı!"
echo "   Bucket: $MINIO_BUCKET"
echo "   Endpoint: http://$MINIO_ENDPOINT"
echo "   Access Key: $MINIO_ACCESS_KEY"
echo ""
echo "📋 Bucket ayarları:"
echo "   ✅ Public read access aktif"
echo "   ✅ CORS ayarları yapılandırıldı"
echo "   ✅ Cross-origin istekler destekleniyor"
echo ""
echo "🔧 Sorun giderme:"
echo "   - MinIO Console: http://$MINIO_ENDPOINT:9001"
echo "   - Kullanıcı adı: $MINIO_ACCESS_KEY"
echo "   - Şifre: $MINIO_SECRET_KEY"
