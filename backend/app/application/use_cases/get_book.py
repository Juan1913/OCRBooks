from app.domain.repositories import BookRepository, PageRepository
from app.domain.ports.file_storage import FileStoragePort
from app.domain.exceptions import BookNotFound
from app.application.dtos import BookDetailDTO
from app.application.mappers.book_dto_mapper import BookDtoMapper


class GetBookUseCase:
    def __init__(
        self,
        book_repo: BookRepository,
        page_repo: PageRepository,
        storage: FileStoragePort,
    ) -> None:
        self._books = book_repo
        self._pages = page_repo
        self._storage = storage

    async def execute(self, book_id: str) -> BookDetailDTO:
        book = await self._books.get_by_id(book_id)
        if not book:
            raise BookNotFound(book_id)
        pages = await self._pages.get_all_for_book(book_id)
        return BookDtoMapper.to_detail(book, pages, self._storage)
