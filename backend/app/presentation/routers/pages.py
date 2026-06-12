from dataclasses import asdict
from fastapi import APIRouter, Depends, HTTPException

from app.application.commands import UpdatePageLatexCommand
from app.application.use_cases.get_page import GetPageUseCase
from app.application.use_cases.update_page_latex import UpdatePageLatexUseCase
from app.domain.exceptions import PageNotFound
from app.presentation.dependencies import get_page_uc, update_page_latex_uc

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
