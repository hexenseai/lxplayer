# 🚀 Sunucu Migration Rehberi

## ⚠️ KRİTİK: Database Migration Stratejisi

### 1. Ön Hazırlık (Yerel)

```bash
# Değişiklikleri push et
git push origin main
```

### 2. Sunucu Bağlantısı

```bash
# Sunucuya bağlan
ssh hexense@yodea.hexense.ai

# Proje dizinine git
cd /home/hexense/lxplayer
```

### 3. Database Durumu Kontrolü

```bash
# Mevcut durumu analiz et
docker-compose -f docker-compose.prod.yml exec api python /app/check_server_db_status.py
```

**Beklenen Çıktı:**
- Mevcut alembic version
- Hangi tablolar var/yok
- Hangi sütunlar var/yok
- Mevcut veri sayıları

### 4. Güvenli Migration Süreci

#### A. Backup Al
```bash
# Database backup al
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U lxplayer lxplayer > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### B. Migration'ları Uygula
```bash
# Güvenli migration script'ini çalıştır
docker-compose -f docker-compose.prod.yml exec api python /app/safe_migration_strategy.py
```

#### C. Manuel Kontrol (Gerekirse)
```bash
# Alembic durumunu kontrol et
docker-compose -f docker-compose.prod.yml exec api alembic current

# Migration'ları uygula
docker-compose -f docker-compose.prod.yml exec api alembic upgrade head

# Durumu tekrar kontrol et
docker-compose -f docker-compose.prod.yml exec api alembic current
```

### 5. Veri Migration'ları

#### A. SuperAdmin Oluştur
```bash
docker-compose -f docker-compose.prod.yml exec api python /app/app/scripts/create_super_admin.py
```

#### B. Varsayılan İçerik Oluştur
```bash
# Varsayılan stiller
docker-compose -f docker-compose.prod.yml exec api python /app/create_default_styles.py

# Varsayılan frame configs
docker-compose -f docker-compose.prod.yml exec api python /app/create_default_frame_configs.py
```

#### C. Mevcut Verileri Düzelt
```bash
# Asset'lerin company_id'lerini düzelt
docker-compose -f docker-compose.prod.yml exec api python /app/fix_asset_company_ids.py

# User'ların company_id'lerini düzelt
docker-compose -f docker-compose.prod.yml exec api python /app/fix_user_companies.py
```

### 6. Container'ları Güncelle

```bash
# Son değişiklikleri çek
git pull origin main

# Nginx'i yeniden başlat (büyük dosya ayarları için)
docker-compose -f docker-compose.prod.yml restart nginx

# Tüm servislerin durumunu kontrol et
docker-compose -f docker-compose.prod.yml ps
```

### 7. Test

```bash
# API test
curl http://localhost/api/health

# Login test
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "superadmin@example.com", "password": "superadmin123"}'
```

## 🆘 Acil Durum Planı

### Rollback (Geri Alma)

```bash
# Migration'ı geri al
docker-compose -f docker-compose.prod.yml exec api python /app/safe_migration_strategy.py rollback backup_file.sql
```

### Manuel Rollback

```bash
# Backup'ı geri yükle
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U lxplayer lxplayer < backup_file.sql
```

## 📋 Kontrol Listesi

- [ ] Database backup alındı
- [ ] Mevcut database durumu analiz edildi
- [ ] Migration'lar güvenli şekilde uygulandı
- [ ] SuperAdmin kullanıcısı oluşturuldu
- [ ] Varsayılan içerikler oluşturuldu
- [ ] Mevcut veriler düzeltildi
- [ ] Container'lar güncellendi
- [ ] Test'ler başarılı
- [ ] Login çalışıyor
- [ ] Büyük dosya yükleme test edildi

## 🔍 Troubleshooting

### Migration Hatası
```bash
# Alembic history kontrol et
docker-compose -f docker-compose.prod.yml exec api alembic history

# Belirli bir version'a geri dön
docker-compose -f docker-compose.prod.yml exec api alembic downgrade <version>
```

### Database Bağlantı Hatası
```bash
# PostgreSQL container durumu
docker-compose -f docker-compose.prod.yml logs postgres

# Container'ı yeniden başlat
docker-compose -f docker-compose.prod.yml restart postgres
```

### API Hatası
```bash
# API logları
docker-compose -f docker-compose.prod.yml logs api

# API container'ı yeniden başlat
docker-compose -f docker-compose.prod.yml restart api
```

## 📞 Destek

Sorun yaşarsanız:
1. Backup dosyasını kontrol edin
2. Log'ları inceleyin
3. Rollback planını uygulayın
4. Adım adım tekrar deneyin
