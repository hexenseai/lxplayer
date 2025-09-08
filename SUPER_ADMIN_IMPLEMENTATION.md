# Süper Admin Implementasyonu

Bu dokümanda, LXPlayer sistemine eklenen süper admin kullanıcı tipi ve organizasyon bazlı yetki sistemi açıklanmaktadır.

## Genel Bakış

Sistem artık üç farklı kullanıcı tipini desteklemektedir:

1. **SuperAdmin**: Tüm organizasyonları ve verileri görebilir, yönetebilir
2. **Admin**: Sadece kendi organizasyonundaki verileri görebilir ve yönetebilir
3. **User**: Sadece kendi verilerini görebilir

## Yapılan Değişiklikler

### 1. Model Güncellemeleri

- `User` modelinde `role` alanı genişletildi
- `Style`, `FrameConfig`, `Training`, `Asset`, `Flow` modellerine `organization_id` alanı eklendi
- Yeni migration dosyası oluşturuldu (`0014_add_organization_id_to_models.py`)

### 2. Yetki Kontrolü Sistemi

- `auth.py` dosyasına yetki kontrolü fonksiyonları eklendi
- `get_current_user` dependency'si eklendi
- Tüm router'lara yetki kontrolü eklendi

### 3. Router Güncellemeleri

- **users.py**: Kullanıcı listesi, oluşturma, güncelleme ve silme işlemlerinde organizasyon bazlı yetki kontrolü
- **organizations.py**: Organizasyon yönetiminde süper admin yetkisi
- **styles.py**: Stil yönetiminde organizasyon bazlı erişim
- **frame_configs.py**: Frame konfigürasyon yönetiminde organizasyon bazlı erişim
- **trainings.py**: Eğitim yönetiminde organizasyon bazlı erişim
- **assets.py**: Asset yönetiminde organizasyon bazlı erişim

## Kurulum

### 1. Migration Çalıştırma

```bash
cd apps/api
python run_migration.py
```

### 2. Süper Admin Kullanıcısı Oluşturma

```bash
cd apps/api
python -m app.scripts.create_super_admin
```

Bu script varsayılan olarak şu bilgilerle bir süper admin kullanıcısı oluşturur:
- Email: superadmin@example.com
- Password: superadmin123
- Role: SuperAdmin

## Kullanım

### Süper Admin Özellikleri

- Tüm organizasyonları görme ve yönetme
- Tüm kullanıcıları görme ve yönetme
- Tüm stilleri, frame konfigürasyonlarını, eğitimleri ve asset'leri görme ve yönetme
- Yeni organizasyon oluşturma

### Admin Özellikleri

- Sadece kendi organizasyonundaki kullanıcıları görme ve yönetme
- Sadece kendi organizasyonundaki stilleri, frame konfigürasyonlarını, eğitimleri ve asset'leri görme ve yönetme
- Kendi organizasyonundaki kullanıcıları ekleme, güncelleme ve silme

### Normal Kullanıcı Özellikleri

- Sadece kendi profilini görme ve güncelleme
- Kendi organizasyonundaki eğitimleri görme

## API Endpoint'leri

### Kimlik Doğrulama

Tüm korumalı endpoint'ler için `Authorization: Bearer <token>` header'ı gereklidir.

### Örnek Kullanım

```bash
# Süper admin olarak giriş yapma
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "superadmin@example.com", "password": "superadmin123"}'

# Token ile kullanıcıları listeleme
curl -X GET "http://localhost:8000/users" \
  -H "Authorization: Bearer <your_token>"
```

## Güvenlik Notları

1. **Production'da şifre değiştirin**: Varsayılan süper admin şifresini production ortamında mutlaka değiştirin
2. **Token güvenliği**: JWT token'ları güvenli şekilde saklayın ve iletin
3. **HTTPS**: Production ortamında mutlaka HTTPS kullanın

## Sorun Giderme

### Migration Hatası

Eğer migration sırasında hata alırsanız:

1. Veritabanı bağlantısını kontrol edin
2. Alembic versiyonlarını kontrol edin: `alembic current`
3. Migration geçmişini kontrol edin: `alembic history`

### Yetki Hatası

Eğer "Access denied" hatası alırsanız:

1. Kullanıcının rolünü kontrol edin
2. Kullanıcının organizasyon ID'sini kontrol edin
3. Token'ın geçerli olduğundan emin olun

## Gelecek Geliştirmeler

- Role-based access control (RBAC) sistemi
- Daha granüler yetki kontrolü
- Audit logging
- Multi-tenant izolasyon
- API rate limiting
