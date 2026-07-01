from dataclasses import asdict
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException

from app.application.commands import UpdatePageLatexCommand
from app.application.use_cases.get_page import GetPageUseCase
from app.application.use_cases.update_page_latex import UpdatePageLatexUseCase
from app.domain.exceptions import PageNotFound
from app.presentation.dependencies import get_page_uc, update_page_latex_uc
from app.config import STORAGE_PATH
from app.infrastructure.ai import config_store as ai_config
from app.infrastructure.ai.provider import AIProvider

router = APIRouter()


@router.get("/{book_id}/pages/{page_number}")
async def get_page(
    book_id: str,
    page_number: int,
    uc: GetPageUseCase = Depends(get_page_uc),
):
    try:
        return asdict(await uc.execute(book_id, page_number))
    except PageNotFound as e:
        raise HTTPException(404, str(e))


@router.patch("/{book_id}/pages/{page_number}")
async def update_page(
    book_id: str,
    page_number: int,
    body: dict,
    uc: UpdatePageLatexUseCase = Depends(update_page_latex_uc),
):
    try:
        await uc.execute(UpdatePageLatexCommand(
            book_id=book_id,
            page_number=page_number,
            content=body.get("latex_override", ""),
        ))
        return {"status": "updated"}
    except PageNotFound as e:
        raise HTTPException(404, str(e))


@router.post("/{book_id}/pages/{page_number}/ai-fix")
async def ai_fix_page(
    book_id: str,
    page_number: int,
    get_uc: GetPageUseCase = Depends(get_page_uc),
    update_uc: UpdatePageLatexUseCase = Depends(update_page_latex_uc),
):
    provider = AIProvider(ai_config.load())
    if not provider.is_configured:
        raise HTTPException(503, "Proveedor de IA no configurado")

    try:
        page = await get_uc.execute(book_id, page_number)
    except PageNotFound as e:
        raise HTTPException(404, str(e))

    if page.status != "ocr_done":
        raise HTTPException(400, "La página aún no ha sido procesada por OCR")

    image_path: Path = STORAGE_PATH / book_id / "pages" / f"page_{page_number:03d}.png"

    try:
        improved = await provider.fix_page(image_path, page.content or "")
    except Exception as exc:
        raise HTTPException(500, f"Error de IA: {exc}")

    await update_uc.execute(UpdatePageLatexCommand(
        book_id=book_id,
        page_number=page_number,
        content=improved,
    ))
    return {"content": improved}
