from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.infrastructure.persistence.database import init_db
from app.config import STORAGE_PATH
from app.presentation.routers import books, pages, ws, ai


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="OCRBooks API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(books.router, prefix="/api/books", tags=["books"])
app.include_router(pages.router, prefix="/api/books", tags=["pages"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(ws.router, tags=["websocket"])
app.mount("/storage", StaticFiles(directory=str(STORAGE_PATH)), name="storage")


@app.get("/health")
async def health():
    return {"status": "ok"}
