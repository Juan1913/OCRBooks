from fastapi import APIRouter
from app.infrastructure.ai import config_store
from app.infrastructure.ai.provider import AIProvider, PROVIDER_URLS

router = APIRouter()

_MASK = "••••"


def _mask_key(key: str) -> str:
    if not key:
        return ""
    return _MASK + key[-4:] if len(key) > 4 else _MASK


def _is_masked(key: str) -> bool:
    return key.startswith(_MASK)


@router.get("/status")
async def ai_status():
    cfg = config_store.load()
    p = AIProvider(cfg)
    return {
        "configured": p.is_configured,
        "provider": p.provider_name,
        "model": p.model,
    }


@router.get("/config")
async def get_config():
    cfg = config_store.load()
    out = dict(cfg)
    if out.get("api_key"):
        out["api_key"] = _mask_key(out["api_key"])
    return out


@router.post("/config")
async def save_config(body: dict):
    existing = config_store.load()

    # Keep the real API key if the frontend sent back the masked version
    if _is_masked(body.get("api_key", "")):
        body["api_key"] = existing.get("api_key", "")

    # Auto-fill base_url if provider changed and user left it empty
    if not body.get("base_url") and body.get("provider") in PROVIDER_URLS:
        body["base_url"] = PROVIDER_URLS[body["provider"]]

    config_store.save(body)
    return {"status": "saved"}


@router.post("/test")
async def test_connection():
    cfg = config_store.load()
    provider = AIProvider(cfg)
    if not provider.is_configured:
        return {"ok": False, "error": "Proveedor no configurado"}
    try:
        preview = await provider.test()
        return {"ok": True, "preview": preview}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}
