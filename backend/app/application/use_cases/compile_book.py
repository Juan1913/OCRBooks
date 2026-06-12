from app.domain.repositories import BookRepository
from app.domain.ports.task_dispatcher import TaskDispatcherPort
from app.domain.exceptions import BookNotFound
from app.application.commands import CompileBookCommand


class CompileBookUseCase:
    def __init__(self, book_repo: BookRepository, dispatcher: TaskDispatcherPort) -> None:
        self._books = book_repo
        self._dispatcher = dispatcher

    async def execute(self, cmd: CompileBookCommand) -> None:
        book = await self._books.get_by_id(cmd.book_id)
        if not book:
            raise BookNotFound(cmd.book_id)
        self._dispatcher.dispatch_compile_book(cmd.book_id)
