from dotenv import load_dotenv, find_dotenv

# Load environment variables before importing routers that may read them at import time
load_dotenv(find_dotenv(usecwd=True))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRoute
from .routers import trainings, assets, sessions, tools, users, organizations, auth, uploads, company_trainings, styles, generate, chat, frame_configs
from .db import init_db

app = FastAPI(title="LXPlayer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        # Explicitly allow the rare trailing-dot localhost form some browsers may emit
        "http://localhost.:3000",
        "http://localhost.:3001",
        # Production domains
        "https://yodea.hexense.ai",
        "http://yodea.hexense.ai",
    ],
    # Also allow any localhost/127.0.0.1 with optional trailing dot and any dev port
    allow_origin_regex=r"^https?://(localhost\.?|127\.0\.0\.1)(:\d{1,5})$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"]
)

app.include_router(trainings.router)
app.include_router(assets.router)
app.include_router(sessions.router)
app.include_router(tools.router)
app.include_router(users.router)
app.include_router(organizations.router)
app.include_router(auth.router)
app.include_router(uploads.router)
app.include_router(company_trainings.router)
app.include_router(styles.router)
app.include_router(generate.router)
app.include_router(chat.router)
app.include_router(frame_configs.router)

#print([ (r.path, r.name) for r in app.routes if "/trainings" in getattr(r, "path", "") ])

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    try:
        init_db()
        print("Application startup complete")
    except Exception as e:
        print(f"Database initialization warning (this is normal if tables already exist): {e}")
        print("Application startup complete")

@app.get("/")
def root():
    return {"status": "ok"}

@app.get("/test-cors")
def test_cors():
    return {"message": "CORS test endpoint", "timestamp": "2024-01-01T00:00:00Z"}

@app.options("/test-cors")
def test_cors_options():
    return {"message": "CORS preflight successful"}

@app.get("/debug")
def debug_info():
    """Debug endpoint to check API status"""
    return {
        "status": "ok",
        "message": "API is running",
        "timestamp": "2024-01-01T00:00:00Z",
        "endpoints": [
            "/",
            "/docs",
            "/trainings",
            "/users",
            "/organizations",
            "/assets",
            "/styles",
            "/frame-configs"
        ]
    }
