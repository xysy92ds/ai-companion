"""Main FastAPI application factory and startup."""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import HOST, PORT, STATIC_DIR
from app.database import init_db
from app.routers import chat, kb, memory, settings, smart_terminal, terminal


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    await init_db()
    yield


app = FastAPI(
    title="AI Companion",
    description="Mobile AI partner with dashboard, memory, knowledge base, and smart terminal",
    version="2.0.0",
    lifespan=lifespan,
)

# Mount static files
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Include API routers
app.include_router(chat.router)
app.include_router(settings.router)
app.include_router(memory.router)
app.include_router(terminal.router)
app.include_router(kb.router)
app.include_router(smart_terminal.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "ai-companion", "version": "2.0.0"}


@app.get("/")
async def index():
    """Serve the main HTML page."""
    return FileResponse(STATIC_DIR / "index.html")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=False)
