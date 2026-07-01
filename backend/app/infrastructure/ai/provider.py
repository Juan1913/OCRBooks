import base64
from pathlib import Path
from typing import Optional
import httpx

SYSTEM_PROMPT = (
    "You are fixing markdown extracted by OCR from a scanned mathematics textbook. "
    "Fix ONLY layout artifacts — do NOT change any mathematical content or formulas:\n"
    "1. Sub-items a), b), c), d) that appear duplicated due to 2-column layout: "
    "keep the combined version (the one that pairs two sub-items on the same line).\n"
    "2. Exercise numbers like '80*.' or '118*.' that appear alone on a line "
    "followed by their formula on the next line: join them on one line.\n"
    "3. Lines starting with '. ' (artifact from split numbering): remove the leading period.\n"
    "4. Excessive blank lines between consecutive list items: reduce to single blank line.\n"
    "Return ONLY the corrected markdown, no explanation."
)

PROVIDER_URLS: dict[str, str] = {
    "ollama":    "http://localhost:11434/v1",
    "nvidia":    "https://integrate.api.nvidia.com/v1",
    "deepseek":  "https://api.deepseek.com/v1",
    "gemini":    "https://generativelanguage.googleapis.com/v1beta/openai/",
    "openai":    "https://api.openai.com/v1",
    "anthropic": "https://api.anthropic.com",
}


class AIProvider:
    def __init__(self, config: dict) -> None:
        self._cfg = config

    @property
    def is_configured(self) -> bool:
        return bool(self._cfg.get("provider") and self._cfg.get("model"))

    @property
    def provider_name(self) -> str:
        return self._cfg.get("provider", "")

    @property
    def model(self) -> str:
        return self._cfg.get("model", "")

    async def fix_page(self, image_path: Optional[Path], markdown: str) -> str:
        if self._cfg.get("provider") == "anthropic":
            return await self._call_anthropic(image_path, markdown)
        return await self._call_openai_compat(image_path, markdown)

    async def test(self) -> str:
        result = await self.fix_page(None, "1+1=2. a) x=1 ; a) x=1 ; b) y=2.")
        return result[:200]

    def fix_page_sync(self, image_path: Optional[Path], markdown: str) -> str:
        """Synchronous wrapper for Celery workers (no event loop running)."""
        import asyncio
        return asyncio.run(self.fix_page(image_path, markdown))

    # ── OpenAI-compatible (Ollama, NVIDIA, DeepSeek, Gemini, OpenAI, Custom) ──

    async def _call_openai_compat(self, image_path: Optional[Path], markdown: str) -> str:
        base_url = (self._cfg.get("base_url") or PROVIDER_URLS.get(self._cfg.get("provider", ""), "")).rstrip("/")
        api_key  = self._cfg.get("api_key") or "none"
        vision   = self._cfg.get("vision", True)

        user_content: list = []

        if vision and image_path and image_path.exists():
            img_b64 = base64.b64encode(image_path.read_bytes()).decode()
            user_content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{img_b64}"},
            })

        user_content.append({
            "type": "text",
            "text": f"Fix this OCR markdown:\n\n{markdown}",
        })

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": user_content},
            ],
            "max_tokens": 4096,
            "temperature": 0.1,
        }

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json=payload,
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"].strip()

    # ── Anthropic ────────────────────────────────────────────────────────────

    async def _call_anthropic(self, image_path: Optional[Path], markdown: str) -> str:
        api_key = self._cfg.get("api_key", "")
        vision  = self._cfg.get("vision", True)

        content: list = []

        if vision and image_path and image_path.exists():
            img_b64 = base64.b64encode(image_path.read_bytes()).decode()
            content.append({
                "type": "image",
                "source": {"type": "base64", "media_type": "image/png", "data": img_b64},
            })

        content.append({"type": "text", "text": f"Fix this OCR markdown:\n\n{markdown}"})

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": self.model,
                    "system": SYSTEM_PROMPT,
                    "messages": [{"role": "user", "content": content}],
                    "max_tokens": 4096,
                },
            )
            resp.raise_for_status()
            return resp.json()["content"][0]["text"].strip()
