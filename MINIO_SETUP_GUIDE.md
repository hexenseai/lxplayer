# MinIO Bucket Setup Rehberi

Bu rehber Ubuntu sunucuda MinIO bucket ayarlarını yapılandırmak için kullanılır.

## 🔍 Sorun Analizi

"Access Denied" hatası genellikle şu sebeplerden kaynaklanır:

1. **Bucket Policy**: Bucket'ın public read/write izinleri yok
2. **CORS Ayarları**: Cross-origin istekler için CORS yapılandırılmamış
3. **Güvenlik**: HTTPS/HTTP karışıklığı
4. **Bucket Oluşturma**: Bucket mevcut değil

## 🛠️ Çözüm Adımları

### 1. MinIO Client Kurulumu

```bash
# MinIO client indir
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/

# Kurulumu doğrula
mc --version
```

### 2. MinIO Server'a Bağlanma

```bash
# Environment variables (sunucunuzdaki değerlerle değiştirin)
export MINIO_ENDPOINT="your-server-ip:9000"
export MINIO_ACCESS_KEY="your-access-key"
export MINIO_SECRET_KEY="your-secret-key"
export MINIO_BUCKET="lxplayer"

# MinIO server'a bağlan
mc alias set myminio http://$MINIO_ENDPOINT $MINIO_ACCESS_KEY $MINIO_SECRET_KEY
```

### 3. Bucket Oluşturma

```bash
# Bucket'ı oluştur
mc mb myminio/$MINIO_BUCKET --ignore-existing
```

### 4. Bucket Policy Ayarlama (Public Read Access)

```bash
# Policy dosyası oluştur
cat > /tmp/bucket-policy.json << 'EOF'
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
            "Resource": "arn:aws:s3:::lxplayer"
        },
        {
            "Effect": "Allow",
            "Principal": {"AWS": "*"},
            "Action": [
                "s3:GetObject"
            ],
            "Resource": "arn:aws:s3:::lxplayer/*"
        }
    ]
}
EOF

# Policy'yi uygula
mc policy set myminio/$MINIO_BUCKET /tmp/bucket-policy.json
```

### 5. CORS Ayarları

```bash
# CORS dosyası oluştur
cat > /tmp/cors.json << 'EOF'
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

# CORS ayarlarını uygula
mc admin config set myminio cors:mycors /tmp/cors.json
mc admin service restart myminio
```

### 6. Test ve Doğrulama

```bash
# Test dosyası oluştur
echo "Test dosyası" > /tmp/test.txt

# Dosyayı yükle
mc cp /tmp/test.txt myminio/$MINIO_BUCKET/

# Presigned URL oluştur
mc share download myminio/$MINIO_BUCKET/test.txt --expire 1h

# Dosyayı sil
mc rm myminio/$MINIO_BUCKET/test.txt

# Temizlik
rm -f /tmp/bucket-policy.json /tmp/cors.json /tmp/test.txt
```

## 🔧 Otomatik Setup Script

Yukarıdaki adımları otomatikleştirmek için `setup-minio.sh` script'ini kullanabilirsiniz:

```bash
# Script'i çalıştırılabilir yap
chmod +x setup-minio.sh

# Environment variables ayarla
export MINIO_ENDPOINT="your-server-ip:9000"
export MINIO_ACCESS_KEY="your-access-key"
export MINIO_SECRET_KEY="your-secret-key"

# Script'i çalıştır
./setup-minio.sh
```

## 🐍 Python Script ile Setup

Alternatif olarak Python script'ini de kullanabilirsiniz:

```bash
# Environment variables ayarla
export MINIO_ENDPOINT="your-server-ip:9000"
export MINIO_ACCESS_KEY="your-access-key"
export MINIO_SECRET_KEY="your-secret-key"

# Python script'ini çalıştır
python3 setup-minio-bucket.py
```

## 🔍 Sorun Giderme

### MinIO Console'a Erişim

```bash
# MinIO Console URL'i
http://your-server-ip:9001

# Kullanıcı adı ve şifre
# Access Key: your-access-key
# Secret Key: your-secret-key
```

### Bucket Durumunu Kontrol Etme

```bash
# Bucket listesi
mc ls myminio

# Bucket policy'sini kontrol et
mc policy get myminio/$MINIO_BUCKET

# CORS ayarlarını kontrol et
mc admin config get myminio cors:mycors
```

### Log Kontrolü

```bash
# MinIO container logları
docker logs minio

# API logları
docker logs api
```

## 📋 Environment Variables

`.env` dosyanızda şu değişkenlerin doğru ayarlandığından emin olun:

```env
MINIO_ENDPOINT=your-server-ip:9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=lxplayer
MINIO_SECURE=false
```

## ✅ Başarı Kriterleri

Setup tamamlandıktan sonra şunları kontrol edin:

1. ✅ Bucket oluşturuldu
2. ✅ Public read access aktif
3. ✅ CORS ayarları yapılandırıldı
4. ✅ Presigned URL'ler çalışıyor
5. ✅ Dosya yükleme/indirme çalışıyor

## 🚨 Güvenlik Notları

- Production ortamında `MINIO_SECURE=true` kullanın
- Güçlü access key ve secret key kullanın
- Bucket policy'yi ihtiyacınıza göre sınırlayın
- CORS ayarlarını sadece gerekli domain'ler için yapılandırın
