from celery import Celery
from celery.signals import worker_process_init
from app.config import REDIS_URL

celery_app = Celery(
    "ocrbooks",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.workers.pipeline"],
)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)

_marker_models: dict | None = None


@worker_process_init.connect
def _preload_models(**kwargs):
    global _marker_models
    try:
        from marker.models import create_model_dict
        _marker_models = create_model_dict()
        print("[OCRBooks] Marker models loaded")
    except Exception as e:
        print(f"[OCRBooks] Could not preload Marker models: {e}")


def get_marker_models() -> dict:
    global _marker_models
    if _marker_models is None:
        from marker.models import create_model_dict
        _marker_models = create_model_dict()
    return _marker_models
