import json
from app.config import STORAGE_PATH

_CONFIG_FILE = STORAGE_PATH / "ai_config.json"

def load() -> dict:
    if _CONFIG_FILE.exists():
        try:
            return json.loads(_CONFIG_FILE.read_text())
        except Exception:
            return {}
    return {}

def save(config: dict) -> None:
    _CONFIG_FILE.write_text(json.dumps(config, indent=2))
