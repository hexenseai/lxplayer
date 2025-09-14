# Avatar Sistemi - LXPlayer

## Genel Bakış

Avatar sistemi, LXPlayer eğitim platformunda AI asistanların kişiliklerini ve ses özelliklerini yönetmek için tasarlanmıştır. Bu sistem sayesinde eğitimlerde farklı kişiliklerde ve seslerde AI asistanlar kullanılabilir.

## Özellikler

### 🎭 Avatar Yönetimi
- **Avatar Oluşturma**: Yeni avatar oluşturma (isim, kişilik, ElevenLabs voice ID)
- **Avatar Düzenleme**: Mevcut avatarları güncelleme
- **Avatar Silme**: Kullanılmayan avatarları silme
- **Avatar Görüntüleme**: Tüm avatarları listeleme ve detaylarını görme

### 🔐 Rol Tabanlı Erişim
- **SuperAdmin**: Tüm avatarları yönetebilir, varsayılan avatarlar oluşturabilir
- **Admin**: Kendi firmasının avatarlarını yönetebilir
- **User**: Sadece varsayılan avatarları görebilir

### 📦 Import/Export
- **JSON Export**: Mevcut avatarları JSON formatında dışa aktarma
- **JSON Import**: JSON dosyasından avatar verilerini içe aktarma
- **Toplu İşlemler**: Birden fazla avatarı aynı anda import/export etme

### 🎯 Eğitim Entegrasyonu
- **Avatar Seçimi**: Eğitim oluştururken avatar seçimi
- **Avatar Görüntüleme**: Eğitim listesinde avatar bilgilerini gösterme
- **Avatar Detayları**: Eğitim detaylarında avatar bilgilerini görme

## Teknik Detaylar

### Database Yapısı

#### Avatar Tablosu
```sql
CREATE TABLE avatar (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    personality VARCHAR NOT NULL,
    elevenlabs_voice_id VARCHAR NOT NULL,
    description VARCHAR,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    company_id VARCHAR REFERENCES company(id),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

#### Training Tablosu (Güncellenmiş)
```sql
ALTER TABLE training ADD COLUMN avatar_id VARCHAR REFERENCES avatar(id);
```

### API Endpoints

#### Avatar Endpoints
- `GET /avatars/` - Tüm avatarları listele
- `GET /avatars/{avatar_id}` - Avatar detayını getir
- `POST /avatars/` - Yeni avatar oluştur
- `PUT /avatars/{avatar_id}` - Avatar güncelle
- `DELETE /avatars/{avatar_id}` - Avatar sil
- `POST /avatars/import` - Avatar import et
- `GET /avatars/export/company` - Avatar export et

#### Training Endpoints (Güncellenmiş)
- `GET /trainings/` - Avatar bilgileriyle birlikte eğitimleri listele
- `GET /trainings/{training_id}` - Avatar bilgileriyle birlikte eğitim detayını getir
- `POST /trainings/` - Avatar ID'si ile eğitim oluştur
- `PUT /trainings/{training_id}` - Avatar ID'si ile eğitim güncelle

### Frontend Bileşenleri

#### Admin Panel
- **Avatar Yönetimi Sayfası**: `/admin/avatars`
- **Avatar Oluşturma Formu**: Modal ile avatar oluşturma
- **Avatar Düzenleme Formu**: Modal ile avatar güncelleme
- **Import/Export Modal'ları**: JSON dosya işlemleri

#### Eğitim Formları
- **TrainingForm**: Avatar seçimi ile eğitim oluşturma
- **Admin Trainings**: Avatar bilgileriyle eğitim listesi

## Kullanım Kılavuzu

### 1. Avatar Oluşturma

1. Admin paneline gidin (`/admin`)
2. "Avatarlar" sekmesine tıklayın
3. "Yeni Avatar" butonuna tıklayın
4. Formu doldurun:
   - **Avatar Adı**: Avatarın görünecek adı
   - **Kişilik**: Avatarın kişilik açıklaması
   - **ElevenLabs Voice ID**: Ses için kullanılacak voice ID
   - **Açıklama**: Opsiyonel açıklama
   - **Varsayılan Avatar**: SuperAdmin için varsayılan avatar işaretleme
5. "Oluştur" butonuna tıklayın

### 2. Eğitimde Avatar Kullanma

1. Eğitim oluştururken "Avatar" dropdown'ından bir avatar seçin
2. Avatar seçimi opsiyoneldir
3. Eğitim kaydedildikten sonra avatar bilgisi eğitimle birlikte saklanır

### 3. Avatar Import/Export

#### Export
1. Avatar yönetimi sayfasında "Export" butonuna tıklayın
2. JSON dosyası otomatik olarak indirilir

#### Import
1. Avatar yönetimi sayfasında "Import" butonuna tıklayın
2. JSON dosyasını seçin
3. "Import Et" butonuna tıklayın
4. Sonuçları kontrol edin

### 4. JSON Format Örneği

```json
{
  "avatars": [
    {
      "name": "Friendly Assistant",
      "personality": "A friendly and helpful AI assistant that explains concepts clearly",
      "elevenlabs_voice_id": "voice_123456",
      "description": "Default friendly assistant for general training"
    },
    {
      "name": "Professional Trainer",
      "personality": "A professional and authoritative trainer with expertise in business topics",
      "elevenlabs_voice_id": "voice_789012",
      "description": "Professional trainer for business training"
    }
  ]
}
```

## ElevenLabs Entegrasyonu

Avatar sistemi ElevenLabs voice ID'leri ile entegre çalışır:

1. ElevenLabs hesabınızda voice oluşturun
2. Voice ID'sini kopyalayın
3. Avatar oluştururken bu ID'yi kullanın
4. Eğitim sırasında AI asistan bu sesi kullanacak

## Güvenlik ve Yetkilendirme

### Rol Tabanlı Erişim
- **SuperAdmin**: Tüm avatarları yönetebilir, varsayılan avatarlar oluşturabilir
- **Admin**: Sadece kendi firmasının avatarlarını yönetebilir
- **User**: Sadece varsayılan avatarları görebilir

### Veri Güvenliği
- Avatar silme işlemi sadece kullanılmayan avatarlar için yapılabilir
- Company ID kontrolü ile veri izolasyonu sağlanır
- Foreign key constraints ile veri bütünlüğü korunur

## Sorun Giderme

### Yaygın Sorunlar

1. **Avatar silinemiyor**
   - Avatar bir eğitimde kullanılıyorsa silinemez
   - Önce eğitimden avatarı kaldırın

2. **Import hatası**
   - JSON formatını kontrol edin
   - Gerekli alanların dolu olduğundan emin olun
   - Avatar adının benzersiz olduğunu kontrol edin

3. **Avatar görünmüyor**
   - Rol yetkilerinizi kontrol edin
   - Company ID'nizin doğru olduğundan emin olun

### Test Etme

Avatar sistemini test etmek için:

```bash
cd apps/api
python test_avatar_system.py
```

Bu script tüm avatar endpoint'lerini test eder.

## Gelecek Geliştirmeler

- [ ] Avatar önizleme özelliği
- [ ] Ses örnekleri dinleme
- [ ] Avatar kategorileri
- [ ] Toplu avatar işlemleri
- [ ] Avatar istatistikleri
- [ ] Avatar şablonları

## Katkıda Bulunma

Avatar sistemi geliştirmeleri için:

1. Feature request'ler için issue açın
2. Bug report'lar için detaylı bilgi verin
3. Pull request'ler için test coverage sağlayın

---

**Not**: Bu sistem LXPlayer eğitim platformunun bir parçasıdır ve ElevenLabs API'si ile entegre çalışır.
