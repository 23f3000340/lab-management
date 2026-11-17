from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, users, tickets, tags, categories, dashboard
from app.config import settings

app = FastAPI(title="Lab Request Tracker", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(tickets.router, prefix="/api/tickets", tags=["tickets"])
app.include_router(tags.router, prefix="/api/tags", tags=["tags"])
app.include_router(categories.router, prefix="/api/categories", tags=["categories"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
