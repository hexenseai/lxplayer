from dotenv import load_dotenv, find_dotenv

# Load environment variables before importing routers that may read them at import time
load_dotenv(find_dotenv(usecwd=True))

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRoute
from .routers import trainings, assets, sessions, tools, users, companies, auth, uploads, company_trainings, styles, generate, chat, frame_configs, imports, avatars, interactions, llm_agent, interaction_sessions, user_interactions, evaluation_criteria, evaluation_results, evaluation_reports, elevenlabs_webhook
from .db import init_db

app = FastAPI(title="LXPlayer API")

# CORS middleware'i geri ekle
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Manual CORS headers ekle
@app.middleware("http")
async def add_cors_headers(request, call_next):
    print(f"🔍 Request: {request.method} {request.url}")
    
    # OPTIONS request için özel handling
    if request.method == "OPTIONS":
        print("🔍 OPTIONS request - returning CORS headers")
        response = Response()
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Max-Age"] = "86400"
        return response
    
    try:
        response = await call_next(request)
        print(f"🔍 Response: {response.status_code}")
    except Exception as e:
        print(f"🔍 Error in request: {e}")
        response = Response(status_code=500, content=str(e))
    
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Expose-Headers"] = "*"
    return response

app.include_router(trainings.router)
app.include_router(assets.router)
app.include_router(sessions.router)
app.include_router(tools.router)
app.include_router(users.router)
app.include_router(companies.router)
app.include_router(auth.router)
app.include_router(uploads.router)
app.include_router(company_trainings.router)
app.include_router(styles.router)
app.include_router(generate.router)
app.include_router(chat.router, prefix="/chat")
app.include_router(frame_configs.router)
app.include_router(imports.router)
app.include_router(avatars.router)
app.include_router(interactions.router, prefix="/interactions")
app.include_router(llm_agent.router, prefix="/chat/llm-agent")
app.include_router(interaction_sessions.router)
app.include_router(user_interactions.router)
app.include_router(evaluation_criteria.router)
app.include_router(evaluation_results.router)
app.include_router(evaluation_reports.router)
app.include_router(elevenlabs_webhook.router)

#print([ (r.path, r.name) for r in app.routes if "/trainings" in getattr(r, "path", "") ])

# Initialize database on module import
print("Starting database initialization...")
try:
    init_db()
    print("Database initialization completed")
except Exception as e:
    print(f"Database initialization warning (this is normal if tables already exist): {e}")

print("Application startup complete")

# Force startup event
@app.on_event("startup")
async def startup_event():
    """Force startup event"""
    print("Startup event triggered")
    print("Application startup complete from event")

@app.get("/")
def root():
    print("🔍 ROOT endpoint çağrıldı!")
    return {"status": "ok", "message": "Backend is running", "timestamp": "2024-01-01T00:00:00Z"}

@app.get("/test-cors")
def test_cors():
    return {"message": "CORS test endpoint", "timestamp": "2024-01-01T00:00:00Z"}

@app.options("/test-cors")
def test_cors_options():
    return {"message": "CORS preflight successful"}

@app.get("/debug")
def debug_info():
    """Debug endpoint to check API status"""
    from .db import get_session
    from .models import User, Training, Company
    from sqlmodel import select
    
    # Get actual routes from the app
    frame_routes = [r.path for r in app.routes if hasattr(r, 'path') and 'frame' in r.path.lower()]
    
    # Get database info
    session = next(get_session())
    try:
        users = session.exec(select(User).limit(5)).all()
        trainings = session.exec(select(Training).limit(5)).all()
        companies = session.exec(select(Company).limit(5)).all()
        
        return {
            "status": "ok",
            "message": "API is running",
            "timestamp": "2024-01-01T00:00:00Z",
            "endpoints": [
                "/",
                "/docs",
                "/trainings",
                "/users",
                "/companies",
                "/assets",
                "/styles",
                "/frame-configs"
            ],
            "frame_routes": frame_routes,
            "total_routes": len(app.routes),
            "users": [{"id": u.id, "email": u.email, "role": u.role} for u in users],
            "trainings": [{"id": t.id, "title": t.title} for t in trainings],
            "companies": [{"id": c.id, "name": c.name} for c in companies]
        }
    except Exception as e:
        return {
            "status": "ok",
            "message": "API is running",
            "timestamp": "2024-01-01T00:00:00Z",
            "endpoints": [
                "/",
                "/docs",
                "/trainings",
                "/users",
                "/companies",
                "/assets",
                "/styles",
                "/frame-configs"
            ],
            "frame_routes": frame_routes,
            "total_routes": len(app.routes),
            "error": str(e)
        }

@app.get("/test-frame-configs")
def test_frame_configs_direct():
    """Direct test endpoint for frame configs - NO AUTH"""
    from .db import get_session
    from .models import GlobalFrameConfig
    from sqlmodel import select
    
    print("🔍 DIRECT TEST: List global frame configs - NO AUTH")
    
    session = next(get_session())
    configs = session.exec(select(GlobalFrameConfig).order_by(GlobalFrameConfig.name)).all()
    
    print(f"📋 DIRECT TEST: Found {len(configs)} global frame configs")
    for config in configs:
        print(f"  - {config.name} (ID: {config.id}, Company: {config.company_id})")
    
    return [{"name": config.name, "id": str(config.id), "company_id": str(config.company_id)} for config in configs]
