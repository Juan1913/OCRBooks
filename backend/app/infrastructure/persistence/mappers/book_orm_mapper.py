"""
Bidirectional mapper between OrmBook (SQLAlchemy) and Book (domain).
This is the only place that knows both shapes — repositories never touch ORM fields directly.
"""
from app.domain.entities import Book, BookStatus
from app.infrastructure.persistence.orm_models import OrmBook


class BookOrmMapper:
    @staticmethod
    def to_domain(orm: OrmBook) -> Book:
        return Book(
            id=orm.id,
            title=orm.title,
            original_filename=orm.original_filename,
            status=BookStatus(orm.status),
            total_pages=orm.total_pages,
            processed_pages=orm.processed_pages,
            error_message=orm.error_message,
            created_at=orm.created_at,
        )

    @staticmethod
    def to_orm(domain: Book) -> OrmBook:
        return OrmBook(
            id=domain.id,
            title=domain.title,
            original_filename=domain.original_filename,
            status=domain.status.value,
            total_pages=domain.total_pages,
            processed_pages=domain.processed_pages,
            error_message=domain.error_message,
            created_at=domain.created_at,
        )

    @staticmethod
    def apply_to_orm(domain: Book, orm: OrmBook) -> None:
        """Update an existing ORM row in-place from a domain entity."""
        orm.title = domain.title
        orm.status = domain.status.value
        orm.total_pages = domain.total_pages
        orm.processed_pages = domain.processed_pages
        orm.error_message = domain.error_message
