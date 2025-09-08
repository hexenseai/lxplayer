# Role-Based Filtering Implementation - Kullanıcı Rolüne Göre İçerik Filtreleme

## Genel Bakış
Bu implementasyon, kullanıcı rollerine göre admin sayfalarında gösterilen içerikleri filtreler:

- **SuperAdmin**: Tüm organizasyonların verilerini görebilir
- **Admin**: Sadece kendi organizasyonundaki verileri görebilir
- **User**: Sadece kendi organizasyonundaki verileri görebilir

## Güncellenen Sayfalar

### 1. Firma Profili (`/admin/organizations`)
- **SuperAdmin**: Tüm organizasyonları görür
- **Admin/User**: Sadece kendi organizasyonunu görür

### 2. Stiller (`/admin/styles`)
- **SuperAdmin**: Tüm stilleri görür (varsayılan + organizasyon stilleri)
- **Admin/User**: Sadece kendi organizasyonundaki stilleri + varsayılan stilleri görür

### 3. Eğitimler (`/admin/trainings`)
- **SuperAdmin**: Tüm eğitimleri görür
- **Admin/User**: Sadece kendi organizasyonundaki eğitimleri görür

### 4. Global Frame (`/admin/frame-configs`)
- **SuperAdmin**: Tüm global frame konfigürasyonlarını görür
- **Admin/User**: Sadece kendi organizasyonundaki global frame konfigürasyonlarını görür

### 5. İçerikler (`/admin/assets`)
- **SuperAdmin**: Tüm asset'leri görür
- **Admin/User**: Sadece kendi organizasyonundaki asset'leri görür

### 6. Kullanıcılar (`/admin/users`)
- **SuperAdmin**: Tüm kullanıcıları görür
- **Admin/User**: Sadece kendi organizasyonundaki kullanıcıları görür

## Teknik Detaylar

### API Client Güncellemesi
- `getCurrentUser()` fonksiyonu eklendi
- `/auth/me` endpoint'i kullanılarak mevcut kullanıcı bilgileri alınıyor

### Sayfa Güncellemeleri
Her sayfada kullanıcı rolü kontrol ediliyor:
```typescript
// Kullanıcı bilgilerini al
let currentUser: any = null;
try {
  currentUser = await api.getCurrentUser();
} catch (error) {
  console.error('User info error:', error);
}

// Kullanıcı rolüne göre verileri al
if (currentUser?.role === 'SuperAdmin') {
  // Süper admin tüm verileri görebilir
  data = await api.listData();
} else {
  // Admin ve User sadece kendi organizasyonundaki verileri görebilir
  data = await api.listData();
  // API zaten organizasyon bazlı filtreleme yapıyor
}
```

## Test Etme

### 1. Test Sayfaları
- `/test-auth`: Authentication test
- `/test-role-filtering`: Role-based filtering test

### 2. Test Senaryoları

#### Süper Admin Test
1. `superadmin@example.com` / `superadmin123` ile giriş yapın
2. Tüm admin sayfalarına gidin
3. Tüm verilerin görüldüğünü kontrol edin

#### Admin Test
1. Admin rolünde bir kullanıcı ile giriş yapın
2. Tüm admin sayfalarına gidin
3. Sadece kendi organizasyonundaki verilerin görüldüğünü kontrol edin

#### User Test
1. Normal kullanıcı ile giriş yapın
2. Admin sayfalarına erişim olmadığını kontrol edin

### 3. Manuel Test
```bash
# API'yi başlatın
cd apps/api
py -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend'i başlatın
cd apps/web
npm run dev
```

## Beklenen Sonuçlar

### Süper Admin İçin:
- ✅ Tüm organizasyonları görebilir
- ✅ Tüm kullanıcıları görebilir
- ✅ Tüm eğitimleri görebilir
- ✅ Tüm stilleri görebilir
- ✅ Tüm asset'leri görebilir
- ✅ Tüm global frame konfigürasyonlarını görebilir

### Admin İçin:
- ✅ Sadece kendi organizasyonunu görebilir
- ✅ Sadece kendi organizasyonundaki kullanıcıları görebilir
- ✅ Sadece kendi organizasyonundaki eğitimleri görebilir
- ✅ Sadece kendi organizasyonundaki stilleri görebilir
- ✅ Sadece kendi organizasyonundaki asset'leri görebilir
- ✅ Sadece kendi organizasyonundaki global frame konfigürasyonlarını görebilir

### Normal Kullanıcı İçin:
- ✅ Admin sayfalarına erişemez
- ✅ Sadece kendi profilini görebilir

## Güvenlik Notları

1. **Backend Filtreleme**: API seviyesinde organizasyon bazlı filtreleme yapılıyor
2. **Frontend Kontrol**: Ek güvenlik için frontend'te de rol kontrolü yapılıyor
3. **Token Doğrulama**: Her API çağrısında JWT token doğrulanıyor
4. **Organizasyon Eşleştirme**: Kullanıcının organizasyon ID'si ile veri organizasyon ID'si eşleştiriliyor

## Sorun Giderme

### "Not authenticated" Hatası
1. Login sayfasında token'ın localStorage'a kaydedildiğini kontrol edin
2. API çağrılarında Authorization header'ının gönderildiğini kontrol edin
3. Token'ın geçerli olduğunu kontrol edin

### Yanlış Veri Gösterimi
1. Kullanıcı rolünü kontrol edin
2. Organizasyon ID'sini kontrol edin
3. API response'larını console'da kontrol edin

### Performans Sorunları
1. Gereksiz API çağrılarını önleyin
2. Loading state'leri kullanın
3. Error handling ekleyin

## Gelecek Geliştirmeler

- [ ] Caching mekanizması
- [ ] Real-time güncelleme
- [ ] Bulk operations
- [ ] Advanced filtering
- [ ] Export functionality
- [ ] Audit logging
