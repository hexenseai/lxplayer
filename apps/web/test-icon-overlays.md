# Icon Overlay Test Dokümantasyonu

## Genel Bakış
Bu dokümantasyon, overlay'lere eklenen icon desteğinin test edilmesi için hazırlanmıştır.

## Kurulum
1. Backend'i başlatın: `cd apps/api && py -m uvicorn app.main:app --reload --port 8000`
2. Frontend'i başlatın: `cd apps/web && npm run dev`
3. Veritabanında test verileri mevcut (Access Code: TEST123)

## Test Senaryoları

### 1. Icon Seçimi Testi
**Hedef**: Overlay formunda icon seçiminin çalıştığını doğrulamak

**Adımlar**:
1. Admin paneline gidin
2. Bir training seçin ve "Overlay'ler" sekmesine gidin
3. "Yeni Overlay" butonuna tıklayın
4. Tip olarak "Label" veya "Button" seçin
5. "Icon" alanında icon seçiciyi açın
6. Farklı iconlar seçin ve önizlemeyi kontrol edin
7. Icon'u kaldır butonunu test edin

**Beklenen Sonuç**:
- Icon seçici açılmalı
- 200+ icon arasından seçim yapılabilmeli
- Arama fonksiyonu çalışmalı
- Seçilen icon önizlemede görünmeli
- Icon kaldırma butonu çalışmalı

### 2. Icon Render Testi
**Hedef**: Seçilen iconların overlay'lerde doğru şekilde görüntülendiğini doğrulamak

**Adımlar**:
1. Interactive Player'a gidin (Access Code: TEST123)
2. Video'yu oynatın
3. Farklı zamanlarda overlay'leri gözlemleyin

**Test Zamanları ve Beklenen Iconlar**:

#### Bölüm 1 (0-60 saniye):
- **5s**: "Bu önemli bir nokta!" - Info icon
- **10s**: "Detayları göster" - Eye icon
- **20s**: "Dikkat!" - AlertCircle icon
- **25s**: "Dosyayı indir" - Download icon
- **35s**: "Başarılı!" - CheckCircle icon
- **40s**: "Devam et" - Play icon
- **50s**: "Önemli bilgi" - Book icon
- **60s**: "Tamamladım" - CheckCircle icon

#### Bölüm 2 (60+ saniye):
- **70s**: "Yeni bölüm başlıyor" - Star icon
- **80s**: "Anladım" - ThumbsUp icon
- **105s**: "Harika!" - Heart icon
- **130s**: "Daha fazla bilgi" - ExternalLink icon
- **135s**: "Bölüm tamamlandı" - Trophy icon

**Beklenen Sonuç**:
- Her overlay'de icon metnin solunda görünmeli
- Icon boyutu 16x16px olmalı
- Icon ve metin arasında uygun boşluk olmalı
- Icon'lar Lucide React iconları olmalı

### 3. Icon Olmadan Overlay Testi
**Hedef**: Icon seçilmeyen overlay'lerin normal şekilde çalıştığını doğrulamak

**Adımlar**:
1. Yeni bir overlay oluşturun
2. Icon seçmeyin
3. Overlay'i kaydedin
4. Player'da test edin

**Beklenen Sonuç**:
- Icon olmadan overlay normal şekilde görünmeli
- Sadece metin içeriği gösterilmeli

### 4. Icon Seçici UI Testi
**Hedef**: Icon seçicinin kullanıcı dostu olduğunu doğrulamak

**Adımlar**:
1. Icon seçiciyi açın
2. Arama kutusuna yazın
3. Farklı kategorilerde iconlar seçin
4. Dropdown dışına tıklayarak kapatmayı test edin

**Beklenen Sonuç**:
- Arama anında filtreleme yapmalı
- Grid layout düzenli olmalı
- Hover efektleri çalışmalı
- Seçili icon vurgulanmalı
- Dropdown dışına tıklayınca kapanmalı

## Teknik Detaylar

### Kullanılan Teknolojiler
- **Icon Kütüphanesi**: Lucide React
- **Icon Sayısı**: 200+ icon
- **Icon Boyutu**: 16x16px (4x4 Tailwind class)
- **Konum**: Metnin solunda, 8px boşluk

### CSS Sınıfları
```css
.icon-container {
  display: flex;
  align-items: center;
  gap: 8px; /* space-x-2 */
}

.icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
```

### Veritabanı Şeması
```sql
ALTER TABLE overlay ADD COLUMN icon VARCHAR;
```

## Hata Durumları

### Olası Sorunlar ve Çözümler

1. **Icon görünmüyor**
   - Lucide React import'unu kontrol edin
   - Icon adının doğru olduğunu kontrol edin
   - Console'da hata mesajı var mı kontrol edin

2. **Icon seçici açılmıyor**
   - z-index değerlerini kontrol edin
   - Click event'lerini kontrol edin
   - State yönetimini kontrol edin

3. **Icon arama çalışmıyor**
   - Filter fonksiyonunu kontrol edin
   - Case sensitivity'yi kontrol edin

## Performans Notları
- Icon'lar lazy load edilir
- Sadece kullanılan icon'lar bundle'a dahil edilir
- Icon seçici virtual scrolling kullanabilir (gelecekte)

## Gelecek Geliştirmeler
- Icon kategorileri
- Favori icon'lar
- Custom icon upload
- Icon boyut seçenekleri
- Icon renk seçenekleri
