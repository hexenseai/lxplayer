# Sunucu Environment Variables Kurulumu

Sunucuda `.env` dosyası oluşturun ve aşağıdaki değişkenleri ayarlayın:

```bash
# Database Configuration
DATABASE_URL=postgresql+psycopg2://postgres:postgres@postgres:5432/lxplayer

# MinIO Configuration
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_ENDPOINT=minio:9000
MINIO_SECURE=false

# API Configuration
NGINX_PROXY_URL=http://yodea.hexense.ai

# Frontend Configuration - ÖNEMLİ!
NEXT_PUBLIC_API_URL=http://yodea.hexense.ai/api
NEXT_PUBLIC_CDN_URL=http://yodea.hexense.ai:9000/lxplayer
NEXT_PUBLIC_TINYMCE_API_KEY=your_tinymce_api_key_here

# Authentication
JWT_SECRET_KEY=your_jwt_secret_key_here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI Configuration
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# Development/Production
NODE_ENV=production
BYPASS_AUTH=false
```

## Önemli Notlar:

1. **NEXT_PUBLIC_API_URL** değişkeni frontend'in API'ye nasıl bağlanacağını belirler
2. Sunucu IP'si veya domain'inizi `yodea.hexense.ai` yerine yazın
3. Port 8000 API için, port 3000 frontend için kullanılır
4. `.env` dosyasını sunucuda proje kök dizininde oluşturun

## Sunucu Kurulum Komutları:

```bash
# 1. Sistem nginx'ini kaldır (eğer kuruluysa)
sudo systemctl stop nginx
sudo systemctl disable nginx
sudo apt remove nginx nginx-common nginx-core

# 2. .env dosyasını oluşturun
nano .env

# 3. Dosyayı yukarıdaki içerikle doldurun ve kaydedin

# 4. Docker container'ları başlatın
docker-compose -f docker-compose.prod.yml up -d

# 5. Migration'ları çalıştırın
docker-compose -f docker-compose.prod.yml exec api alembic upgrade head

# 6. Container'ların durumunu kontrol edin
docker-compose -f docker-compose.prod.yml ps

# 7. Nginx konfigürasyonunu kontrol edin
docker-compose -f docker-compose.prod.yml logs nginx

# 8. API endpoint'lerini test edin
curl http://yodea.hexense.ai/api/
curl http://yodea.hexense.ai/api/docs
```

## Nginx Reverse Proxy Yapılandırması:

- **Frontend**: `http://yodea.hexense.ai/` → `localhost:3000`
- **API**: `http://yodea.hexense.ai/api/` → `localhost:8000/` (path rewrite ile)
- **MinIO**: `http://yodea.hexense.ai/minio/` → `localhost:9000/`
- **Uploads**: `http://yodea.hexense.ai/uploads/` → `localhost:9000/lxplayer/`

## Test Endpoints:

```bash
# API Health Check
curl http://yodea.hexense.ai/api/

# API Documentation
curl http://yodea.hexense.ai/api/docs

# Frontend
curl http://yodea.hexense.ai/
```
