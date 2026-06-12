"""
Bidirectional mapper between OrmPage (SQLAlchemy) and Page (domain).
Infrastructure fields (image_path, markdown_path) are stored in ORM but
not exposed to the domain — they stay in the infrastructure layer.
"""
from app.domain.entities import Page, PageStatus
from app.infrastructure.persistence.orm_models import OrmPage


class PageOrmMapper:
    @staticmethod
    def to_domain(orm: OrmPage) -> Page:
        return Page(
            id=orm.id,
            book_id=orm.book_id,
            page_number=orm.page_number,
            status=PageStatus(orm.status),
            has_figures=orm.has_figures,
            latex_override=orm.latex_override,
            error_message=orm.error_message,
        )

    @staticmethod
    def to_orm(domain: Page) -> OrmPage:
        return OrmPage(
            book_id=domain.book_id,
            page_number=domain.page_number,
            status=domain.status.value,
            has_figures=domain.has_figures,
            latex_override=domain.latex_override,
            error_message=domain.error_message,
        )

    @staticmethod
    def apply_to_orm(domain: Page, orm: OrmPage) -> None:
        """Update an existing ORM row in-place from a domain entity."""
        orm.status = domain.status.value
        orm.has_figures = domain.has_figures
        orm.latex_override = domain.latex_override
        orm.error_message = domain.error_message
