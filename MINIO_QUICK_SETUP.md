# 🚀 MinIO Quick Setup - Ubuntu Server

Ubuntu sunucuda MinIO "Access Denied" hatasını çözmek için hızlı setup.

## ⚡ Hızlı Çözüm

### 1. MinIO Client Kurulumu
```bash
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/
```

### 2. Environment Variables
```bash
export MINIO_ENDPOINT="your-server-ip:9000"
export MINIO_ACCESS_KEY="your-access-key"
export MINIO_SECRET_KEY="your-secret-key"
export MINIO_BUCKET="lxplayer"
```

### 3. Otomatik Setup
```bash
# Script'i çalıştırılabilir yap
chmod +x setup-minio.sh

# Çalıştır
./setup-minio.sh
```

## 🔧 Manuel Setup (Alternatif)

### Bucket Oluştur ve Policy Ayarla
```bash
# MinIO'ya bağlan
mc alias set myminio http://$MINIO_ENDPOINT $MINIO_ACCESS_KEY $MINIO_SECRET_KEY

# Bucket oluştur
mc mb myminio/$MINIO_BUCKET --ignore-existing

# Public read policy ayarla
mc policy set myminio/$MINIO_BUCKET download
```

### CORS Ayarları
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

## 🧪 Test Et

### 1. API Test Endpoint
```bash
curl http://your-server-ip:8000/uploads/test-minio
```

### 2. Web Debug Sayfası
```
http://your-server-ip:3000/debug
```
"Test MinIO Connection" butonuna tıkla.

### 3. MinIO Console
```
http://your-server-ip:9001
```

## ✅ Başarı Kriterleri

- ✅ Bucket oluşturuldu
- ✅ Public read access aktif  
- ✅ CORS ayarları yapılandırıldı
- ✅ Presigned URL'ler çalışıyor
- ✅ Dosya yükleme/indirme çalışıyor

## 🚨 Sorun Giderme

### Access Denied Hatası
```bash
# Bucket policy'yi kontrol et
mc policy get myminio/$MINIO_BUCKET

# CORS ayarlarını kontrol et  
mc admin config get myminio cors:mycors
```

### Log Kontrolü
```bash
# MinIO logları
docker logs minio

# API logları
docker logs api
```

## 📋 Environment Variables (.env)

```env
MINIO_ENDPOINT=your-server-ip:9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=lxplayer
MINIO_SECURE=false
```

## 🔗 Faydalı Linkler

- [Detaylı Rehber](MINIO_SETUP_GUIDE.md)
- [Python Setup Script](setup-minio-bucket.py)
- [Shell Setup Script](setup-minio.sh)
