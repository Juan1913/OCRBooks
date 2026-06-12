"""
Maps domain Book + Page objects → application DTOs.
This is the only place that knows both the domain shape and the DTO shape.
"""
from app.domain.entities import Book, Page
from app.domain.ports.file_storage import FileStoragePort
from app.application.dtos import BookDetailDTO, BookSummaryDTO, PageInfoDTO


class BookDtoMapper:
    @staticmethod
    def to_summary(book: Book) -> BookSummaryDTO:
        return BookSummaryDTO(
            id=book.id,
            title=book.title,
            status=book.status,
            total_pages=book.total_pages,
            processed_pages=book.processed_pages,
            created_at=book.created_at,
        )

    @staticmethod
    def to_detail(book: Book, pages: list[Page], storage: FileStoragePort) -> BookDetailDTO:
        pages_dto = tuple(
            PageInfoDTO(
                page_number=p.page_number,
                status=p.status,
                has_figures=p.has_figures,
                image_url=storage.get_page_image_url(book.id, p.page_number),
            )
            for p in sorted(pages, key=lambda x: x.page_number)
        )
        metadata = storage.read_book_metadata(book.id)
        return BookDetailDTO(
            id=book.id,
            title=book.title,
            status=book.status,
            total_pages=book.total_pages,
            processed_pages=book.processed_pages,
            error_message=book.error_message,
            created_at=book.created_at,
            pages=pages_dto,
            page_width_mm=metadata.get("page_width_mm"),
            page_height_mm=metadata.get("page_height_mm"),
        )
