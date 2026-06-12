"""
Synchronous write helpers for Celery workers.
Workers operate at the infrastructure layer — they use ORM models directly
and do NOT go through application use cases (which are async).
"""
from typing import Optional
from sqlalchemy import create_engine, update, insert, select
from sqlalchemy.orm import Session

from app.domain.entities import BookStatus, PageStatus
from app.infrastructure.persistence.orm_models import OrmBook, OrmPage
from app.config import DATABASE_URL

_ENGINE = create_engine(DATABASE_URL.replace("+aiosqlite", ""), pool_pre_ping=True)


def _session() -> Session:
    return Session(_ENGINE)


# ── Book ─────────────────────────────────────────────────────────────────────

def set_book_extracting(book_id: str, total: int) -> None:
    with _session() as s:
        s.execute(update(OrmBook).where(OrmBook.id == book_id).values(
            total_pages=total, status=BookStatus.EXTRACTING
        ))
        s.commit()


def set_book_processing(book_id: str) -> None:
    with _session() as s:
        s.execute(update(OrmBook).where(OrmBook.id == book_id).values(status=BookStatus.PROCESSING))
        s.commit()


def set_book_compiling(book_id: str) -> None:
    with _session() as s:
        s.execute(update(OrmBook).where(OrmBook.id == book_id).values(status=BookStatus.COMPILING))
        s.commit()


def set_book_done(book_id: str) -> None:
    with _session() as s:
        s.execute(update(OrmBook).where(OrmBook.id == book_id).values(status=BookStatus.DONE))
        s.commit()


def set_book_error(book_id: str, message: str) -> None:
    with _session() as s:
        s.execute(update(OrmBook).where(OrmBook.id == book_id).values(
            status=BookStatus.ERROR, error_message=message[:500]
        ))
        s.commit()


def advance_book_progress(book_id: str, processed: int) -> None:
    with _session() as s:
        s.execute(update(OrmBook).where(OrmBook.id == book_id).values(processed_pages=processed))
        s.commit()


# ── Page ─────────────────────────────────────────────────────────────────────

def insert_page(book_id: str, page_number: int, image_path: str) -> None:
    with _session() as s:
        s.execute(insert(OrmPage).values(
            book_id=book_id,
            page_number=page_number,
            status=PageStatus.PENDING,
            image_path=image_path,
        ))
        s.commit()


def set_page_processing(book_id: str, page_number: int) -> None:
    with _session() as s:
        s.execute(update(OrmPage).where(
            OrmPage.book_id == book_id, OrmPage.page_number == page_number
        ).values(status=PageStatus.PROCESSING))
        s.commit()


def set_page_done(book_id: str, page_number: int, markdown_path: str, has_figures: bool) -> None:
    with _session() as s:
        s.execute(update(OrmPage).where(
            OrmPage.book_id == book_id, OrmPage.page_number == page_number
        ).values(
            status=PageStatus.OCR_DONE,
            markdown_path=markdown_path,
            has_figures=has_figures,
        ))
        s.commit()


def set_page_error(book_id: str, page_number: int, message: str) -> None:
    with _session() as s:
        s.execute(update(OrmPage).where(
            OrmPage.book_id == book_id, OrmPage.page_number == page_number
        ).values(status=PageStatus.ERROR, error_message=message))
        s.commit()


def get_page_latex_override(book_id: str, page_number: int) -> Optional[str]:
    """Workers need this when assembling the final LaTeX doc."""
    with _session() as s:
        row = s.execute(
            select(OrmPage.latex_override).where(
                OrmPage.book_id == book_id, OrmPage.page_number == page_number
            )
        ).scalar_one_or_none()
        return row


def save_celery_task_id(book_id: str, task_id: str) -> None:
    with _session() as s:
        s.execute(update(OrmBook).where(OrmBook.id == book_id).values(celery_task_id=task_id))
        s.commit()


def set_book_paused(book_id: str) -> None:
    with _session() as s:
        s.execute(update(OrmBook).where(OrmBook.id == book_id).values(status=BookStatus.PAUSED))
        s.commit()


def get_book_status_and_task(book_id: str) -> tuple[Optional[str], Optional[str]]:
    """Returns (status, celery_task_id) for the given book."""
    with _session() as s:
        row = s.execute(
            select(OrmBook.status, OrmBook.celery_task_id).where(OrmBook.id == book_id)
        ).one_or_none()
        return (row[0], row[1]) if row else (None, None)


def get_page_status(book_id: str, page_number: int) -> Optional[str]:
    with _session() as s:
        return s.execute(
            select(OrmPage.status).where(
                OrmPage.book_id == book_id, OrmPage.page_number == page_number
            )
        ).scalar_one_or_none()


def count_book_pages(book_id: str) -> int:
    with _session() as s:
        from sqlalchemy import func
        return s.execute(
            select(func.count()).where(OrmPage.book_id == book_id)
        ).scalar_one()


def delete_book(book_id: str) -> None:
    """Delete book and all pages (cascade). Storage deletion is the caller's responsibility."""
    with _session() as s:
        book = s.get(OrmBook, book_id)
        if book:
            s.delete(book)
            s.commit()
