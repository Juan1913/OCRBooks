from app.domain.repositories import BookRepository
from app.application.dtos import BookSummaryDTO
from app.application.mappers.book_dto_mapper import BookDtoMapper


class ListBooksUseCase:
    def __init__(self, book_repo: BookRepository) -> None:
        self._books = book_repo

    async def execute(self) -> list[BookSummaryDTO]:
        books = await self._books.get_all()
        return [BookDtoMapper.to_summary(b) for b in books]
