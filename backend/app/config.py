import os
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
STORAGE_PATH = Path(os.getenv("STORAGE_PATH", str(BASE_DIR / "storage")))
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{BASE_DIR}/ocrbooks.db")
CELERY_BROKER = REDIS_URL
CELERY_BACKEND = REDIS_URL

STORAGE_PATH.mkdir(parents=True, exist_ok=True)
