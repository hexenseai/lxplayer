# Overlay Sistemi Dokümantasyonu

## Genel Bakış

Overlay sistemi, video oynatma sırasında ekranda görünecek interaktif elementleri tanımlamak için kullanılır. Her overlay, belirli bir zaman damgasında görünür ve kullanıcı etkileşimine yanıt verebilir.

## JSON Yapısı

### Training JSON Yapısı
```json
{
  "id": "training-unique-id",
  "title": "Eğitim Başlığı",
  "description": "Eğitim açıklaması",
  "sections": [
    {
      "id": "section-unique-id",
      "title": "Bölüm Başlığı",
      "video_url": "video-url",
      "overlays": [
        {
          "id": "overlay-unique-id",
          "time_stamp": 15,
          "type": "button_link",
          "caption": "Önemli Bilgi",
          "content_id": "asset-id",
          "style": "{\"backgroundColor\":\"#ff0000\",\"color\":\"#ffffff\",\"fontSize\":\"16px\"}",
          "frame": "wide",
          "animation": "fade_in",
          "duration": 3.5,
          "position": "bottom_middle"
        }
      ]
    }
  ]
}
```

### Overlay JSON Yapısı (Section Altında)
```json
{
  "id": "overlay-unique-id",
  "time_stamp": 15,
  "type": "button_link",
  "caption": "Önemli Bilgi",
  "content_id": "asset-id",
  "style": "{\"backgroundColor\":\"#ff0000\",\"color\":\"#ffffff\",\"fontSize\":\"16px\"}",
  "frame": "wide",
  "animation": "fade_in",
  "duration": 3.5,
  "position": "bottom_middle"
}
```

## Alan Açıklamaları

### Zorunlu Alanlar

| Alan | Tip | Açıklama | Örnek |
|------|-----|----------|-------|
| `id` | string | Overlay'in benzersiz kimliği | `"overlay-123"` |
| `time_stamp` | number | Video'da görüneceği saniye | `15` |

### Opsiyonel Alanlar

| Alan | Tip | Açıklama | Varsayılan |
|------|-----|----------|------------|
| `type` | string | Overlay tipi | `"label"` |
| `caption` | string | Görünecek metin | `null` |
| `content_id` | string | Asset ID'si | `null` |
| `style` | string | CSS stilleri (JSON) | `null` |
| `frame` | string | Frame tipi | `null` |
| `animation` | string | Animasyon tipi | `null` |
| `duration` | number | Görünme süresi (saniye) | `null` |
| `position` | string | Ekrandaki pozisyon | `null` |

### Parent'tan Gelen Bilgiler

| Alan | Tip | Açıklama | Kaynak |
|------|-----|----------|--------|
| `training_id` | string | Eğitim ID'si | Training objesi |
| `training_section_id` | string | Bölüm ID'si | Section objesi |

## Overlay Tipleri

### 1. `frame_set`
- **Açıklama**: Video frame'ini değiştirir
- **Kullanım**: Video'nun hangi frame'de oynatılacağını belirler
- **Örnek**: `{"type": "frame_set", "frame": "wide"}`

### 2. `button_link`
- **Açıklama**: Tıklanabilir link butonu
- **Kullanım**: Kullanıcıyı harici bir URL'ye yönlendirir
- **Örnek**: `{"type": "button_link", "caption": "Detaylar", "style": "{\"backgroundColor\":\"#007bff\"}"}`

### 3. `button_message`
- **Açıklama**: Mesaj gösteren buton
- **Kullanım**: Kullanıcıya bilgi mesajı gösterir
- **Örnek**: `{"type": "button_message", "caption": "Bilgi", "style": "{\"backgroundColor\":\"#28a745\"}"}`

### 4. `label`
- **Açıklama**: Basit metin etiketi
- **Kullanım**: Bilgi metni gösterir
- **Örnek**: `{"type": "label", "caption": "Önemli Not", "style": "{\"color\":\"#dc3545\"}"}`

### 5. `content`
- **Açıklama**: Asset içeriği gösterir
- **Kullanım**: Resim, video veya diğer medya dosyalarını gösterir
- **Örnek**: `{"type": "content", "content_id": "asset-123", "style": "{\"width\":\"200px\"}"}`

## Frame Tipleri

| Değer | Açıklama |
|-------|----------|
| `wide` | Geniş frame |
| `face_left` | Sol yüz frame'i |
| `face_right` | Sağ yüz frame'i |
| `face_middle` | Orta yüz frame'i |
| `face_close` | Yakın yüz frame'i |

## Animasyon Tipleri

| Değer | Açıklama | CSS Animasyonu |
|-------|----------|----------------|
| `fade_in` | Opaklık 0'dan 100'e belirme | `opacity: 0 → 1` |
| `slide_in_left` | Soldan belirerek girme | `transform: translateX(-100%) → translateX(0)` |
| `slide_in_right` | Sağdan belirerek girme | `transform: translateX(100%) → translateX(0)` |
| `scale_in` | Küçükten büyüyerek ve belirerek gözükme | `transform: scale(0) → scale(1)` |

## Pozisyon Tipleri

| Değer | Açıklama | CSS Pozisyonu |
|-------|----------|----------------|
| `left_half_content` | Sol yarım içerik | `left: 0, top: 50%, transform: translateY(-50%)` |
| `right_half_content` | Sağ yarım içerik | `right: 0, top: 50%, transform: translateY(-50%)` |
| `left_content` | Sol içerik | `left: 20px, top: 50%, transform: translateY(-50%)` |
| `right_content` | Sağ içerik | `right: 20px, top: 50%, transform: translateY(-50%)` |
| `buttom_left` | Alt sol | `bottom: 20px, left: 20px` |
| `bottom_middle` | Alt orta | `bottom: 20px, left: 50%, transform: translateX(-50%)` |
| `bottom_right` | Alt sağ | `bottom: 20px, right: 20px` |
| `bottom_face` | Alt yüz | `bottom: 20px, left: 50%, transform: translateX(-50%)` |

## Style Sistemi

`style` alanı JSON string formatında CSS benzeri stilleri içerir:

```json
{
  "backgroundColor": "#ff0000",
  "color": "#ffffff",
  "fontSize": "16px",
  "fontWeight": "bold",
  "border": "2px solid #000000",
  "borderRadius": "8px",
  "padding": "10px 20px",
  "margin": "5px",
  "boxShadow": "0 2px 4px rgba(0,0,0,0.2)",
  "fontFamily": "Arial, sans-serif"
}
```

### Desteklenen Style Özellikleri

#### Arka Plan
- `backgroundColor`: Arka plan rengi
- `backgroundImage`: Arka plan resmi

#### Metin
- `color`: Metin rengi
- `fontSize`: Font boyutu
- `fontWeight`: Font kalınlığı (normal, bold, 100-900)
- `fontFamily`: Font ailesi

#### Kenarlık
- `border`: Kenarlık (width style color)
- `borderRadius`: Köşe yuvarlaklığı
- `borderStyle`: Kenarlık stili (solid, dashed, dotted)

#### Boşluk
- `padding`: İç boşluk
- `margin`: Dış boşluk

#### Efektler
- `boxShadow`: Gölge efekti
- `opacity`: Şeffaflık (0-1)

## Player'da İşleme Mantığı

### 1. Training JSON'u Parse Etme
```javascript
// Training JSON'undan section ve overlay'leri çıkar
function parseTrainingData(trainingJson) {
  const sections = trainingJson.sections || [];
  const overlays = [];
  
  sections.forEach(section => {
    const sectionOverlays = section.overlays || [];
    sectionOverlays.forEach(overlay => {
      // Parent bilgilerini ekle
      overlay.training_id = trainingJson.id;
      overlay.training_section_id = section.id;
      overlays.push(overlay);
    });
  });
  
  return overlays;
}
```

### 2. Zaman Damgası Kontrolü
```javascript
// Video'nun currentTime'ı ile overlay'in time_stamp'ini karşılaştır
if (video.currentTime >= overlay.time_stamp) {
  showOverlay(overlay);
}
```

### 2. Animasyon Uygulama
```javascript
function applyAnimation(element, animationType) {
  switch(animationType) {
    case 'fade_in':
      element.style.opacity = '0';
      element.style.transition = 'opacity 0.5s ease-in';
      setTimeout(() => element.style.opacity = '1', 100);
      break;
    case 'slide_in_left':
      element.style.transform = 'translateX(-100%)';
      element.style.transition = 'transform 0.5s ease-out';
      setTimeout(() => element.style.transform = 'translateX(0)', 100);
      break;
    // Diğer animasyonlar...
  }
}
```

### 3. Pozisyon Hesaplama
```javascript
function calculatePosition(position) {
  const positions = {
    'bottom_middle': {
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)'
    },
    'left_content': {
      left: '20px',
      top: '50%',
      transform: 'translateY(-50%)'
    }
    // Diğer pozisyonlar...
  };
  return positions[position] || {};
}
```

### 4. Style Uygulama
```javascript
function applyStyles(element, styleString) {
  try {
    const styles = JSON.parse(styleString);
    Object.entries(styles).forEach(([property, value]) => {
      element.style[property] = value;
    });
  } catch (error) {
    console.error('Style parsing error:', error);
  }
}
```

## Örnek Kullanım Senaryoları

### 1. Tam Training JSON Örneği
```json
{
  "id": "training-123",
  "title": "React Temel Eğitimi",
  "description": "React.js temel kavramları",
  "sections": [
    {
      "id": "section-1",
      "title": "Giriş",
      "video_url": "https://example.com/video1.mp4",
      "overlays": [
        {
          "id": "overlay-1",
          "time_stamp": 10,
          "type": "label",
          "caption": "Bu önemli bir bilgidir!",
          "style": "{\"backgroundColor\":\"#ffeb3b\",\"color\":\"#000\",\"padding\":\"10px\",\"borderRadius\":\"5px\"}",
          "position": "bottom_middle",
          "animation": "fade_in",
          "duration": 3
        },
        {
          "id": "overlay-2",
          "time_stamp": 25,
          "type": "button_link",
          "caption": "Detaylı Bilgi",
          "style": "{\"backgroundColor\":\"#007bff\",\"color\":\"#fff\",\"padding\":\"12px 24px\",\"borderRadius\":\"6px\"}",
          "position": "right_content",
          "animation": "slide_in_right",
          "duration": 5
        }
      ]
    }
  ]
}
```

### 2. Basit Bilgi Etiketi (Section Altında)
```json
{
  "id": "overlay-1",
  "time_stamp": 10,
  "type": "label",
  "caption": "Bu önemli bir bilgidir!",
  "style": "{\"backgroundColor\":\"#ffeb3b\",\"color\":\"#000\",\"padding\":\"10px\",\"borderRadius\":\"5px\"}",
  "position": "bottom_middle",
  "animation": "fade_in",
  "duration": 3
}
```

### 3. İnteraktif Buton (Section Altında)
```json
{
  "id": "overlay-2",
  "time_stamp": 25,
  "type": "button_link",
  "caption": "Detaylı Bilgi",
  "style": "{\"backgroundColor\":\"#007bff\",\"color\":\"#fff\",\"padding\":\"12px 24px\",\"borderRadius\":\"6px\",\"cursor\":\"pointer\"}",
  "position": "right_content",
  "animation": "slide_in_right",
  "duration": 5
}
```

### 4. Medya İçeriği (Section Altında)
```json
{
  "id": "overlay-3",
  "time_stamp": 45,
  "type": "content",
  "content_id": "image-123",
  "style": "{\"width\":\"300px\",\"height\":\"200px\",\"borderRadius\":\"10px\"}",
  "position": "left_half_content",
  "animation": "scale_in",
  "duration": 4
}
```

## Performans Önerileri

1. **Training JSON'u Önceden Parse Edin**: Video başlamadan önce tüm overlay'leri çıkarın
2. **Overlay'leri Önceden Yükle**: Video başlamadan önce tüm overlay'leri DOM'a ekleyin
3. **CSS Transition Kullanın**: JavaScript animasyonları yerine CSS transition'ları tercih edin
4. **Event Listener Optimizasyonu**: Overlay'ler görünmez olduğunda event listener'ları kaldırın
5. **Memory Management**: Overlay'ler tamamlandığında DOM elementlerini temizleyin
6. **Section Bazlı Yükleme**: Sadece aktif section'ın overlay'lerini işleyin

## Hata Yönetimi

```javascript
function handleOverlayError(overlay, error) {
  console.error(`Overlay error for ${overlay.id}:`, error);
  
  // Fallback davranışı
  if (overlay.type === 'content' && !overlay.content_id) {
    showFallbackMessage(overlay.caption || 'İçerik yüklenemedi');
  }
}
```

## Test Senaryoları

1. **Zaman Damgası Testi**: Overlay'lerin doğru zamanda görünmesi
2. **Animasyon Testi**: Tüm animasyon tiplerinin düzgün çalışması
3. **Pozisyon Testi**: Overlay'lerin doğru pozisyonlarda görünmesi
4. **Style Testi**: JSON style'ların doğru uygulanması
5. **Responsive Testi**: Farklı ekran boyutlarında uyumluluk
6. **Performance Testi**: Çok sayıda overlay ile performans

Bu dokümantasyon, overlay sisteminin tüm özelliklerini ve kullanım şekillerini kapsar. Player geliştirirken bu referansı kullanarak tutarlı ve güvenilir bir overlay sistemi oluşturabilirsiniz.
