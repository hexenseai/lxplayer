# LXPlayer

AI destekli interaktif eğitim oynatıcı (monorepo)

- apps/web: Next.js (App Router, TS, Tailwind)
- apps/api: FastAPI, SQLModel, Alembic
- packages/ui: Paylaşılan UI
- infra/docker: Postgres, Redis, MinIO

## Özellikler

- 🎥 **AI Destekli Video Oynatma**: Yapay zeka ile geliştirilmiş video oynatıcı
- 💬 **İnteraktif Sohbet**: Eğitim sırasında AI ile sohbet edebilme
- 🎯 **Overlay Sistemi**: Video üzerinde interaktif overlay'ler
- 📦 **SCORM 2004 Desteği**: Eğitimleri SCORM 2004 formatında paketleme ve indirme
- 👥 **Kullanıcı Yönetimi**: Firma bazlı kullanıcı ve eğitim yönetimi
- 🎨 **Stil Yönetimi**: Özelleştirilebilir overlay stilleri
- 📊 **Eğitim Takibi**: Kullanıcı ilerleme ve tamamlama durumu takibi

## Geliştirme

1. Bağımlılıklar

```sh
npm i
npm --workspace apps/web i
```

Python

```sh
py -m pip install --upgrade pip
py -m pip install -r apps/api/requirements.txt
```

2. Veritabanı ve servisler (Docker)

```sh
cd infra/docker
docker compose up -d postgres redis minio
```

3. Migrasyon + Seed

```sh
cd ../../apps/api
alembic upgrade head
py scripts/seed.py
```

4. Uygulamaları çalıştırma

```sh
npm run dev
```

Web: http://localhost:3000  API: http://localhost:8000

## Test

```sh
npm --workspace apps/web run test
```

## SCORM Paket Özelliği

LXPlayer, eğitimleri SCORM 2004 formatında paketleme ve indirme özelliği sunar.

### SCORM Paket İndirme

1. **Admin Paneli**: `/admin/trainings` sayfasında her eğitimin yanında "SCORM Paket" butonu
2. **Eğitim Detay Sayfası**: `/trainings/[id]` sayfasında SCORM paket indirme butonu
3. **Kütüphane Sayfası**: `/library` sayfasında her eğitim kartında SCORM paket butonu
4. **Ana Sayfa**: Firma eğitimleri bölümünde SCORM paket indirme butonu

### SCORM Paket İçeriği

İndirilen SCORM paketi şunları içerir:
- `imsmanifest.xml`: SCORM 2004 manifest dosyası
- `index.html`: Ana eğitim sayfası
- `player.js`: SCORM uyumlu JavaScript oynatıcı
- `styles.css`: Eğitim stilleri
- `training-data.json`: Eğitim verileri
- `assets/`: Video ve medya dosyaları

### SCORM Uyumluluğu

- **SCORM 2004 1.3** standardına uygun
- **LMS entegrasyonu** için hazır
- **İlerleme takibi** ve **tamamlama durumu** desteği
- **Puan sistemi** ve **zaman takibi**

### Test Etme

SCORM paket özelliğini test etmek için:

```sh
python test_scorm_package.py
```
