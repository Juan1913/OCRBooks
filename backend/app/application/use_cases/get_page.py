from app.domain.repositories import PageRepository
from app.domain.ports.file_storage import FileStoragePort
from app.domain.exceptions import PageNotFound
from app.application.dtos import PageDetailDTO
from app.application.mappers.page_dto_mapper import PageDtoMapper


class GetPageUseCase:
    def __init__(self, page_repo: PageRepository, storage: FileStoragePort) -> None:
        self._pages = page_repo
        self._storage = storage

    async def execute(self, book_id: str, page_number: int) -> PageDetailDTO:
        page = await self._pages.get(book_id, page_number)
        if not page:
            raise PageNotFound(book_id, page_number)
        return PageDtoMapper.to_detail(page, self._storage)
