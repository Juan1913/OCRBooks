from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities import Page
from app.infrastructure.persistence.orm_models import OrmPage
from app.infrastructure.persistence.mappers.page_orm_mapper import PageOrmMapper


class SqlAlchemyPageRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, book_id: str, page_number: int) -> Optional[Page]:
        row = await self._session.execute(
            select(OrmPage).where(
                OrmPage.book_id == book_id,
                OrmPage.page_number == page_number,
            )
        )
        orm = row.scalar_one_or_none()
        return PageOrmMapper.to_domain(orm) if orm else None

    async def get_all_for_book(self, book_id: str) -> list[Page]:
        rows = await self._session.execute(
            select(OrmPage)
            .where(OrmPage.book_id == book_id)
            .order_by(OrmPage.page_number)
        )
        return [PageOrmMapper.to_domain(r) for r in rows.scalars()]

    async def save(self, page: Page) -> Page:
        orm = PageOrmMapper.to_orm(page)
        self._session.add(orm)
        await self._session.commit()
        await self._session.refresh(orm)
        return PageOrmMapper.to_domain(orm)

    async def update(self, page: Page) -> None:
        row = await self._session.execute(
            select(OrmPage).where(
                OrmPage.book_id == page.book_id,
                OrmPage.page_number == page.page_number,
            )
        )
        orm = row.scalar_one_or_none()
        if orm:
            PageOrmMapper.apply_to_orm(page, orm)
            await self._session.commit()

    async def bulk_insert(self, pages: list[Page]) -> None:
        for page in pages:
            self._session.add(PageOrmMapper.to_orm(page))
        await self._session.commit()
