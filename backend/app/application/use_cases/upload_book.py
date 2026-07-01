import uuid
from pathlib import Path

from app.domain.entities import Book
from app.domain.exceptions import InvalidFileType
from app.domain.repositories import BookRepository
from app.domain.ports.file_storage import FileStoragePort
from app.domain.ports.task_dispatcher import TaskDispatcherPort
from app.application.commands import UploadBookCommand
from app.application.dtos import UploadResultDTO


class UploadBookUseCase:
    def __init__(
        self,
        book_repo: BookRepository,
        storage: FileStoragePort,
        dispatcher: TaskDispatcherPort,
    ) -> None:
        self._books = book_repo
        self._storage = storage
        self._dispatcher = dispatcher

    async def execute(self, cmd: UploadBookCommand) -> UploadResultDTO:
        if not cmd.filename.lower().endswith(".pdf"):
            raise InvalidFileType("Solo se aceptan archivos PDF")

        book_id = str(uuid.uuid4())
        self._storage.setup_book_dir(book_id)
        self._storage.save_pdf(book_id, cmd.filename, cmd.file_data)

        book = Book(
            id=book_id,
            title=Path(cmd.filename).stem,
            original_filename=cmd.filename,
        )
        book = await self._books.save(book, ai_mode=cmd.ai_mode)

        pdf_path = self._storage.get_pdf_path(book_id)
        self._dispatcher.dispatch_process_book(book_id, str(pdf_path))

        return UploadResultDTO(id=book.id, title=book.title, status=book.status)
