"""
Dependency injection container.
Wires concrete infrastructure implementations to application use cases.
FastAPI resolves these automatically via Depends().
"""
from functools import lru_cache
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import STORAGE_PATH
from app.infrastructure.persistence.database import get_db
from app.infrastructure.persistence.book_repo import SqlAlchemyBookRepository
from app.infrastructure.persistence.page_repo import SqlAlchemyPageRepository
from app.infrastructure.storage.local_file_storage import LocalFileStorage
from app.infrastructure.tasks.celery_dispatcher import CeleryTaskDispatcher

from app.application.use_cases.upload_book import UploadBookUseCase
from app.application.use_cases.list_books import ListBooksUseCase
from app.application.use_cases.get_book import GetBookUseCase
from app.application.use_cases.get_page import GetPageUseCase
from app.application.use_cases.update_page_latex import UpdatePageLatexUseCase
from app.application.use_cases.compile_book import CompileBookUseCase


# ── Singletons (stateless infra objects) ─────────────────────────────────────

@lru_cache(maxsize=1)
def get_file_storage() -> LocalFileStorage:
    return LocalFileStorage(STORAGE_PATH)


@lru_cache(maxsize=1)
def get_task_dispatcher() -> CeleryTaskDispatcher:
    return CeleryTaskDispatcher()


# ── Per-request repositories ──────────────────────────────────────────────────

def get_book_repo(db: AsyncSession = Depends(get_db)) -> SqlAlchemyBookRepository:
    return SqlAlchemyBookRepository(db)


def get_page_repo(db: AsyncSession = Depends(get_db)) -> SqlAlchemyPageRepository:
    return SqlAlchemyPageRepository(db)


# ── Use case factories ────────────────────────────────────────────────────────

def upload_book_uc(
    books: SqlAlchemyBookRepository = Depends(get_book_repo),
    storage: LocalFileStorage = Depends(get_file_storage),
    dispatcher: CeleryTaskDispatcher = Depends(get_task_dispatcher),
) -> UploadBookUseCase:
    return UploadBookUseCase(books, storage, dispatcher)


def list_books_uc(
    books: SqlAlchemyBookRepository = Depends(get_book_repo),
) -> ListBooksUseCase:
    return ListBooksUseCase(books)


def get_book_uc(
    books: SqlAlchemyBookRepository = Depends(get_book_repo),
    pages: SqlAlchemyPageRepository = Depends(get_page_repo),
    storage: LocalFileStorage = Depends(get_file_storage),
) -> GetBookUseCase:
    return GetBookUseCase(books, pages, storage)


def get_page_uc(
    pages: SqlAlchemyPageRepository = Depends(get_page_repo),
    storage: LocalFileStorage = Depends(get_file_storage),
) -> GetPageUseCase:
    return GetPageUseCase(pages, storage)


def update_page_latex_uc(
    pages: SqlAlchemyPageRepository = Depends(get_page_repo),
) -> UpdatePageLatexUseCase:
    return UpdatePageLatexUseCase(pages)


def compile_book_uc(
    books: SqlAlchemyBookRepository = Depends(get_book_repo),
    dispatcher: CeleryTaskDispatcher = Depends(get_task_dispatcher),
) -> CompileBookUseCase:
    return CompileBookUseCase(books, dispatcher)
