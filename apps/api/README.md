# LXPlayer API

Run locally:

```sh
uvicorn app.main:app --reload
```

Migrate:

```sh
alembic revision --autogenerate -m "init"
alembic upgrade head
```
