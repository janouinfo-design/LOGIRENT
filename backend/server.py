from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
from config import client
from routes import auth, admin, projects, timeentries, leaves, finance, notifications, stats, reports, planning, hr, subscriptions

app = FastAPI(title="TimeSheet SaaS API v2.0")

# Main API router with /api prefix
api_router = APIRouter(prefix="/api")

# Include all domain routers
api_router.include_router(auth.router)
api_router.include_router(admin.router)
api_router.include_router(projects.router)
api_router.include_router(timeentries.router)
api_router.include_router(leaves.router)
api_router.include_router(finance.router)
api_router.include_router(notifications.router)
api_router.include_router(stats.router)
api_router.include_router(reports.router)
api_router.include_router(planning.router)
api_router.include_router(hr.router)
api_router.include_router(subscriptions.router)

@api_router.get("/")
async def root():
    return {
        "message": "TimeSheet SaaS API v2.0",
        "status": "online",
        "modules": [
            "users", "companies", "departments", "clients",
            "projects", "activities", "timeentries", "timer",
            "leaves", "invoices", "notifications", "audit-logs", "reports"
        ]
    }

app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
