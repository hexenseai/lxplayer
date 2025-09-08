# 🔓 Quick Authentication Bypass

Bu bypass sistemi geliştirme sırasında login gerektirmeden tüm sayfalara erişim sağlar.

## 🚀 Hızlı Başlangıç

### Yöntem 1: Otomatik Script (Önerilen)
```bash
node quick-bypass.js
```

### Yöntem 2: Manuel Başlatma
```bash
# Terminal 1: API'yi başlat
cd apps/api
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend'i bypass ile başlat
cd apps/web
BYPASS_AUTH=true npm run dev
```

## ✨ Özellikler

- 🔓 **Otomatik Giriş**: Login sayfasına yönlendirme yok
- 👤 **Süper Admin**: Otomatik olarak superadmin@example.com olarak giriş yapar
- 🌐 **Tüm Sayfalar**: Admin panelleri dahil tüm sayfalara erişim
- 🚀 **Hızlı**: Tek komutla başlatma

## 🔧 Nasıl Çalışır

1. **Middleware Bypass**: `apps/web/middleware.ts` dosyasında authentication kontrolü devre dışı
2. **Auto-Login**: `apps/web/lib/api.ts` dosyasında otomatik superadmin girişi
3. **Environment Variable**: `BYPASS_AUTH=true` ile kontrol ediliyor

## 📁 Değiştirilen Dosyalar

- `apps/web/middleware.ts` - Authentication kontrolü bypass
- `apps/web/lib/api.ts` - Otomatik login sistemi
- `quick-bypass.js` - Kolay başlatma scripti

## 🛡️ Güvenlik

⚠️ **ÖNEMLİ**: Bu bypass sadece geliştirme ortamında kullanılmalıdır!

- Production'da `BYPASS_AUTH` environment variable'ı set edilmemeli
- Sadece local development için kullanın
- Gerçek authentication sistemi production'da aktif olacak

## 🎯 Kullanım

Bypass aktif olduğunda:

1. `http://localhost:3000` adresine gidin
2. Login sayfasına yönlendirilmezsiniz
3. Otomatik olarak superadmin olarak giriş yaparsınız
4. Tüm admin panellerine erişebilirsiniz

## 🔄 Normal Moda Dönüş

Bypass'ı kapatmak için:

```bash
# Environment variable'ı kaldırın
unset BYPASS_AUTH

# Normal şekilde başlatın
cd apps/web
npm run dev
```

Artık normal authentication sistemi aktif olacak.




