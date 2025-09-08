# Authentication Fix - Süper Admin Sorunu Çözümü

## Sorun
Süper admin kullanıcısı giriş yaptığında "not authenticated" hatası alıyor ve tüm kayıtları getiremiyor.

## Çözüm
Frontend'te API çağrılarında authentication token'ı gönderilmiyordu. Bu sorun düzeltildi.

## Yapılan Değişiklikler

### 1. API Client Güncellemesi (`apps/web/lib/api.ts`)
- `request` fonksiyonuna token kontrolü eklendi
- localStorage'dan token alınıp Authorization header'ına ekleniyor
- Schema'lara `organization_id` alanları eklendi

### 2. Login Sayfası Güncellemesi (`apps/web/app/(auth)/login/page.tsx`)
- Token'ı localStorage'a kaydetme işlemi eklendi
- `localStorage.setItem('token', data.access_token)`

### 3. Logout Güncellemesi (`apps/web/components/UserBar.tsx`)
- Logout sırasında token'ı localStorage'dan silme işlemi eklendi
- `localStorage.removeItem('token')`

### 4. Test Sayfası Eklendi (`apps/web/app/test-auth/page.tsx`)
- Authentication'ın çalışıp çalışmadığını test etmek için
- Tüm endpoint'leri test edebilir
- Kullanıcı bilgilerini ve token durumunu gösterir

## Test Etme

### 1. API'yi Başlatın
```bash
cd apps/api
py -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend'i Başlatın
```bash
cd apps/web
npm run dev
```

### 3. Test Sayfasını Kullanın
1. `http://localhost:3000/test-auth` adresine gidin
2. Süper admin ile giriş yapın:
   - Email: `superadmin@example.com`
   - Password: `superadmin123`
3. "Test All Endpoints" butonuna tıklayın
4. Tüm verilerin yüklendiğini kontrol edin

### 4. Manuel Test
1. `http://localhost:3000/login` adresine gidin
2. Süper admin bilgileriyle giriş yapın
3. Admin sayfalarına gidin ve verilerin yüklendiğini kontrol edin

## Beklenen Sonuçlar

### Süper Admin İçin:
- ✅ Tüm kullanıcıları görebilir
- ✅ Tüm organizasyonları görebilir
- ✅ Tüm eğitimleri görebilir
- ✅ Tüm stilleri görebilir
- ✅ Tüm asset'leri görebilir

### Admin İçin:
- ✅ Sadece kendi organizasyonundaki kullanıcıları görebilir
- ✅ Sadece kendi organizasyonundaki verileri görebilir

### Normal Kullanıcı İçin:
- ✅ Sadece kendi profilini görebilir
- ✅ Sadece kendi organizasyonundaki eğitimleri görebilir

## Sorun Giderme

### "Not authenticated" Hatası Alıyorsanız:
1. Browser'da F12 açın
2. Console'da hata mesajlarını kontrol edin
3. Network tab'ında API çağrılarını kontrol edin
4. Authorization header'ının gönderilip gönderilmediğini kontrol edin

### Token Sorunu:
1. localStorage'da token'ın olup olmadığını kontrol edin
2. Token'ın geçerli olup olmadığını kontrol edin
3. Logout/login işlemini tekrar deneyin

### API Bağlantı Sorunu:
1. API'nin çalışıp çalışmadığını kontrol edin
2. `http://localhost:8000/docs` adresine gidip API dokümantasyonunu kontrol edin
3. CORS ayarlarını kontrol edin

## Güvenlik Notları

1. **Production'da şifre değiştirin**: Varsayılan süper admin şifresini production ortamında mutlaka değiştirin
2. **Token güvenliği**: JWT token'ları güvenli şekilde saklayın ve iletin
3. **HTTPS**: Production ortamında mutlaka HTTPS kullanın
4. **Token süresi**: Token'ların süresini production'da uygun şekilde ayarlayın

## Gelecek Geliştirmeler

- Token refresh mekanizması
- Daha detaylı error handling
- Loading states
- Offline support
- Token expiration handling
