# InteractivePlayer Kullanım Kılavuzu

## Genel Bakış

InteractivePlayer, yapay zeka destekli interaktif eğitim oynatıcısıdır. OpenAI GPT-4o modeli kullanarak eğitim sürecini yönetir ve kullanıcı etkileşimlerine yanıt verir.

## Özellikler

### 🎬 Video Oynatma
- ReactPlayer tabanlı video oynatma
- Frame-based kadraj ayarlama (wide, face_left, face_right, face_middle, face_close)
- LLM kontrolü ile video yönetimi

### 🤖 AI Asistan
- OpenAI GPT-4o-mini modeli
- WebSocket tabanlı gerçek zamanlı iletişim
- Intent analizi ve aksiyon yönetimi
- Text-to-Speech (TTS) desteği

### 🎯 Overlay Sistemi
- Timestamp tabanlı overlay gösterimi
- Animasyon desteği (fade_in, slide_in_left, slide_in_right, scale_in)
- Pozisyon kontrolü (bottom_middle, left_content, right_content, vb.)
- Overlay tipleri: label, button_link, button_message, content, frame_set

### 🎤 Ses ve Mikrofon
- Ses seviyesi kontrolü
- Mikrofon açma/kapama
- Speech-to-Text (STT) desteği (gelecek sürümde)
- Audio visualizer

### 📝 Alt Yazılar
- Video script'i gösterimi
- AI yanıtlarının alt yazı olarak gösterimi
- Açma/kapama kontrolü

## Kurulum

### Backend Bağımlılıkları
```bash
cd apps/api
py -m pip install -r requirements.txt
```

### Frontend Bağımlılıkları
```bash
cd apps/web
npm install
```

### Veritabanı Kurulumu
```bash
cd apps/api
alembic upgrade head
py scripts/seed_interactive.py
```

## Çalıştırma

### Backend
```bash
cd apps/api
py -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd apps/web
npm run dev
```

## Kullanım

### 1. Erişim
InteractivePlayer'a erişmek için:
```
http://localhost:3000/player/TEST123
```

### 2. Test Verileri
Seed script'i ile oluşturulan test verileri:
- **Access Code**: `TEST123`
- **Training**: "Yapay Zeka ile Nasıl İşbirliği Yapılır"
- **Sections**: 2 bölüm
- **Overlays**: 4 farklı overlay

### 3. AI Komutları
Aşağıdaki komutları kullanarak player'ı kontrol edebilirsiniz:

#### Video Kontrolü
- "dur" / "stop" / "pause" - Videoyu durdur
- "başla" / "play" / "devam" - Videoyu başlat
- "ileri" / "next" / "sonraki" - Sonraki bölüme geç
- "geri" / "previous" / "önceki" - Önceki bölüme geç
- "tekrar" / "repeat" - Bölümü tekrarla

#### Overlay Kontrolü
- "overlay göster" - Overlay'leri göster
- "frame değiştir" - Video kadrajını değiştir

## API Endpoints

### WebSocket
```
ws://localhost:8000/llm/ws/{access_code}
```

### REST Endpoints
```
POST /llm/tts - Text-to-Speech
POST /llm/stt - Speech-to-Text
```

## Overlay Sistemi

### Overlay Tipleri
1. **label** - Basit metin etiketi
2. **button_link** - Tıklanabilir link butonu
3. **button_message** - Mesaj gönderen buton
4. **content** - Medya içeriği (resim, video)
5. **frame_set** - Video kadraj ayarlama

### Animasyonlar
- `fade_in` - Opaklık ile belirme
- `slide_in_left` - Soldan kayarak girme
- `slide_in_right` - Sağdan kayarak girme
- `scale_in` - Ölçekleme ile belirme

### Pozisyonlar
- `bottom_middle` - Alt orta
- `left_content` - Sol içerik
- `right_content` - Sağ içerik
- `top_middle` - Üst orta
- `left_half_content` - Sol yarım
- `right_half_content` - Sağ yarım

## Geliştirme

### Yeni Overlay Ekleme
```typescript
const overlay = {
  id: "unique-id",
  time_stamp: 15, // saniye
  type: "label",
  caption: "Önemli bilgi",
  style: '{"backgroundColor":"#ff0000","color":"#ffffff"}',
  position: "bottom_middle",
  animation: "fade_in",
  duration: 3
};
```

### AI Prompt Özelleştirme
`apps/api/app/routers/llm.py` dosyasında `generate_ai_response` fonksiyonunu düzenleyebilirsiniz.

### Stil Özelleştirme
Overlay'lerin `style` alanında CSS benzeri JSON formatında stiller tanımlayabilirsiniz.

## Sorun Giderme

### WebSocket Bağlantı Sorunu
- Backend'in çalıştığından emin olun
- CORS ayarlarını kontrol edin
- Access code'un doğru olduğunu kontrol edin

### Video Yükleme Sorunu
- Video URL'sinin erişilebilir olduğunu kontrol edin
- CORS politikalarını kontrol edin
- Video formatının desteklendiğini kontrol edin

### AI Yanıt Sorunu
- OpenAI API key'inin doğru olduğunu kontrol edin
- API limitlerini kontrol edin
- Network bağlantısını kontrol edin

## Gelecek Özellikler

- [ ] Speech-to-Text (STT) entegrasyonu
- [ ] Gelişmiş AI flow yönetimi
- [ ] Çoklu dil desteği
- [ ] Kullanıcı ilerleme takibi
- [ ] Analytics ve raporlama
- [ ] Mobil uyumluluk
- [ ] Offline mod desteği

## Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.
