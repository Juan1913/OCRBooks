"""
Maps domain Page → PageDetailDTO, resolving content via FileStoragePort.
"""
from app.domain.entities import Page
from app.domain.ports.file_storage import FileStoragePort
from app.application.dtos import PageDetailDTO


class PageDtoMapper:
    @staticmethod
    def to_detail(page: Page, storage: FileStoragePort) -> PageDetailDTO:
        ocr_content = storage.read_page_ocr_content(page.book_id, page.page_number)
        content = page.latex_override or ocr_content

        return PageDetailDTO(
            page_number=page.page_number,
            status=page.status,
            has_figures=page.has_figures,
            image_url=storage.get_page_image_url(page.book_id, page.page_number),
            content=content,
            has_override=page.latex_override is not None,
            error_message=page.error_message,
        )
