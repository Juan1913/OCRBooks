"""
Domain entities — zero framework dependencies, zero I/O.
No SQLAlchemy, no file paths, no Celery references.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


class BookStatus(str, Enum):
    UPLOADING  = "uploading"
    EXTRACTING = "extracting"
    PROCESSING = "processing"
    COMPILING  = "compiling"
    PAUSED     = "paused"
    DONE       = "done"
    ERROR      = "error"

    def is_terminal(self) -> bool:
        return self in (BookStatus.DONE, BookStatus.ERROR)

    def is_active(self) -> bool:
        return self in (BookStatus.EXTRACTING, BookStatus.PROCESSING, BookStatus.COMPILING)


class PageStatus(str, Enum):
    PENDING    = "pending"
    PROCESSING = "processing"
    OCR_DONE   = "ocr_done"
    ERROR      = "error"

    def is_done(self) -> bool:
        return self == PageStatus.OCR_DONE


@dataclass
class Book:
    id: str
    title: str
    original_filename: str
    status: BookStatus = BookStatus.UPLOADING
    total_pages: int = 0
    processed_pages: int = 0
    error_message: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)

    def mark_extracting(self, total: int) -> None:
        self.total_pages = total
        self.status = BookStatus.EXTRACTING

    def mark_processing(self) -> None:
        self.status = BookStatus.PROCESSING

    def advance_page(self) -> None:
        self.processed_pages += 1

    def mark_compiling(self) -> None:
        self.status = BookStatus.COMPILING

    def mark_done(self) -> None:
        self.status = BookStatus.DONE

    def mark_error(self, message: str) -> None:
        self.status = BookStatus.ERROR
        self.error_message = message[:500]


@dataclass
class Page:
    book_id: str
    page_number: int
    id: int = 0
    status: PageStatus = PageStatus.PENDING
    has_figures: bool = False
    latex_override: Optional[str] = None
    error_message: Optional[str] = None

    def mark_processing(self) -> None:
        self.status = PageStatus.PROCESSING

    def mark_done(self, has_figures: bool) -> None:
        self.status = PageStatus.OCR_DONE
        self.has_figures = has_figures

    def mark_error(self, message: str) -> None:
        self.status = PageStatus.ERROR
        self.error_message = message

    def override_latex(self, content: str) -> None:
        self.latex_override = content
