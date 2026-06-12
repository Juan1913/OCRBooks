from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from app.domain.entities import BookStatus, PageStatus


@dataclass(frozen=True)
class BookSummaryDTO:
    id: str
    title: str
    status: BookStatus
    total_pages: int
    processed_pages: int
    created_at: datetime


@dataclass(frozen=True)
class PageInfoDTO:
    page_number: int
    status: PageStatus
    has_figures: bool
    image_url: Optional[str]


@dataclass(frozen=True)
class BookDetailDTO:
    id: str
    title: str
    status: BookStatus
    total_pages: int
    processed_pages: int
    error_message: Optional[str]
    created_at: datetime
    pages: tuple[PageInfoDTO, ...]
    page_width_mm: Optional[float] = None
    page_height_mm: Optional[float] = None


@dataclass(frozen=True)
class PageDetailDTO:
    page_number: int
    status: PageStatus
    has_figures: bool
    image_url: str
    content: Optional[str]
    has_override: bool
    error_message: Optional[str]


@dataclass(frozen=True)
class UploadResultDTO:
    id: str
    title: str
    status: str
