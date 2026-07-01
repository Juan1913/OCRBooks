from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities import Book
from app.infrastructure.persistence.orm_models import OrmBook
from app.infrastructure.persistence.mappers.book_orm_mapper import BookOrmMapper


class SqlAlchemyBookRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, book_id: str) -> Optional[Book]:
        orm = await self._session.get(OrmBook, book_id)
        return BookOrmMapper.to_domain(orm) if orm else None

    async def get_all(self) -> list[Book]:
        rows = await self._session.execute(
            select(OrmBook).order_by(OrmBook.created_at.desc())
        )
        return [BookOrmMapper.to_domain(r) for r in rows.scalars()]

    async def save(self, book: Book, ai_mode: str | None = None) -> Book:
        orm = BookOrmMapper.to_orm(book)
        orm.ai_mode = ai_mode
        self._session.add(orm)
        await self._session.commit()
        await self._session.refresh(orm)
        return BookOrmMapper.to_domain(orm)

    async def update(self, book: Book) -> None:
        orm = await self._session.get(OrmBook, book.id)
        if orm:
            BookOrmMapper.apply_to_orm(book, orm)
            await self._session.commit()
