# LXPlayer

AI destekli interaktif eğitim oynatıcı (monorepo)

- apps/web: Next.js (App Router, TS, Tailwind)
- apps/api: FastAPI, SQLModel, Alembic
- packages/ui: Paylaşılan UI
- infra/docker: Postgres, Redis, MinIO, Qdrant

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
docker compose up -d postgres redis minio qdrant
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
