"""
Port — what the application needs from the async task runner.
Decouples application logic from Celery.
"""
from typing import Protocol, runtime_checkable


@runtime_checkable
class TaskDispatcherPort(Protocol):
    def dispatch_process_book(self, book_id: str, pdf_path: str) -> str:
        """Returns the task ID."""
        ...

    def dispatch_compile_book(self, book_id: str) -> None: ...
