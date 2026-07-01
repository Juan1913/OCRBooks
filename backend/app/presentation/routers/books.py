import shutil
from dataclasses import asdict
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
from fastapi.responses import FileResponse

from app.application.commands import CompileBookCommand
from app.application.use_cases.upload_book import UploadBookUseCase
from app.application.use_cases.list_books import ListBooksUseCase
from app.application.use_cases.get_book import GetBookUseCase
from app.application.use_cases.compile_book import CompileBookUseCase
from app.domain.exceptions import BookNotFound, InvalidFileType
from app.infrastructure.storage.local_file_storage import LocalFileStorage
from app.infrastructure.tasks.celery_dispatcher import CeleryTaskDispatcher
from app.infrastructure.persistence import sync_repos as db
from app.presentation.dependencies import (
    upload_book_uc, list_books_uc, get_book_uc, compile_book_uc,
    get_file_storage, get_task_dispatcher,
)
from app.application.commands import UploadBookCommand
from app.config import STORAGE_PATH

router = APIRouter()


@router.post("", status_code=201)
async def upload_book(
    file: UploadFile = File(...),
    ai_mode: Optional[str] = Form(None),  # null | "text" | "vision"
    uc: UploadBookUseCase = Depends(upload_book_uc),
):
    try:
        data = await file.read()
        dto = await uc.execute(UploadBookCommand(
            filename=file.filename or "book.pdf",
            file_data=data,
            ai_mode=ai_mode if ai_mode in ("text", "vision") else None,
        ))
        return asdict(dto)
    except InvalidFileType as e:
        raise HTTPException(400, str(e))


@router.get("")
async def list_books(uc: ListBooksUseCase = Depends(list_books_uc)):
    return [asdict(b) for b in await uc.execute()]


@router.get("/{book_id}")
async def get_book(book_id: str, uc: GetBookUseCase = Depends(get_book_uc)):
    try:
        return asdict(await uc.execute(book_id))
    except BookNotFound as e:
        raise HTTPException(404, str(e))


@router.get("/{book_id}/pdf")
async def download_pdf(
    book_id: str,
    storage: LocalFileStorage = Depends(get_file_storage),
):
    pdf = storage.get_compiled_pdf_path(book_id)
    if not pdf:
        raise HTTPException(404, "PDF compilado no disponible")
    return FileResponse(str(pdf), media_type="application/pdf")


@router.post("/{book_id}/compile")
async def compile_book(book_id: str, uc: CompileBookUseCase = Depends(compile_book_uc)):
    try:
        await uc.execute(CompileBookCommand(book_id=book_id))
        return {"status": "compiling"}
    except BookNotFound as e:
        raise HTTPException(404, str(e))


@router.post("/{book_id}/pause")
async def pause_book(
    book_id: str,
    dispatcher: CeleryTaskDispatcher = Depends(get_task_dispatcher),
):
    status, task_id = db.get_book_status_and_task(book_id)
    if status is None:
        raise HTTPException(404, "Libro no encontrado")
    if task_id:
        try:
            dispatcher.revoke_task(task_id)
        except Exception:
            pass  # Task may have already finished
    db.set_book_paused(book_id)
    return {"status": "paused"}


@router.post("/{book_id}/resume")
async def resume_book(
    book_id: str,
    storage: LocalFileStorage = Depends(get_file_storage),
    dispatcher: CeleryTaskDispatcher = Depends(get_task_dispatcher),
):
    status, _ = db.get_book_status_and_task(book_id)
    if status is None:
        raise HTTPException(404, "Libro no encontrado")
    if status not in ("paused", "error"):
        raise HTTPException(400, f"El libro no se puede reanudar desde el estado '{status}'")
    pdf_path = storage.get_pdf_path(book_id)
    if not pdf_path.exists():
        raise HTTPException(400, "PDF original no disponible para reanudar")
    db.set_book_processing(book_id)
    dispatcher.dispatch_process_book(book_id, str(pdf_path))
    return {"status": "processing"}


@router.delete("/{book_id}")
async def delete_book(
    book_id: str,
    dispatcher: CeleryTaskDispatcher = Depends(get_task_dispatcher),
):
    status, task_id = db.get_book_status_and_task(book_id)
    if status is None:
        raise HTTPException(404, "Libro no encontrado")
    if task_id:
        try:
            dispatcher.revoke_task(task_id)
        except Exception:
            pass
    db.delete_book(book_id)
    book_dir = STORAGE_PATH / book_id
    if book_dir.exists():
        shutil.rmtree(book_dir)
    return {"status": "deleted"}
