"""
SQLAlchemy ORM models.
These exist ONLY in infrastructure — domain entities never import from here.
Infrastructure fields (storage_path, image_path, markdown_path, celery_task_id)
live here but are deliberately absent from the domain entities.
"""
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.infrastructure.persistence.database import Base


class OrmBook(Base):
    __tablename__ = "books"

    id: Mapped[str]              = mapped_column(String, primary_key=True)
    title: Mapped[str]           = mapped_column(String, nullable=False)
    original_filename: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str]          = mapped_column(String, default="uploading")
    total_pages: Mapped[int]     = mapped_column(Integer, default=0)
    processed_pages: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Infrastructure-only fields — not part of the domain entity
    storage_path: Mapped[str | None]     = mapped_column(String, nullable=True)
    celery_task_id: Mapped[str | None]   = mapped_column(String, nullable=True)

    pages: Mapped[list["OrmPage"]] = relationship(
        "OrmPage", back_populates="book", cascade="all, delete"
    )


class OrmPage(Base):
    __tablename__ = "pages"

    id: Mapped[int]          = mapped_column(Integer, primary_key=True, autoincrement=True)
    book_id: Mapped[str]     = mapped_column(String, ForeignKey("books.id"), nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str]      = mapped_column(String, default="pending")
    has_figures: Mapped[bool] = mapped_column(Boolean, default=False)
    latex_override: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None]  = mapped_column(Text, nullable=True)

    # Infrastructure-only fields
    image_path: Mapped[str | None]    = mapped_column(String, nullable=True)
    markdown_path: Mapped[str | None] = mapped_column(String, nullable=True)

    book: Mapped["OrmBook"] = relationship("OrmBook", back_populates="pages")
