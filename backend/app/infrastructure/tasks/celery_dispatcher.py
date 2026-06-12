"""
Implements TaskDispatcherPort using Celery.
Application layer only depends on the port interface — never on Celery directly.
"""
from app.domain.ports.task_dispatcher import TaskDispatcherPort


class CeleryTaskDispatcher:
    """Adapter: wraps Celery task calls behind the TaskDispatcherPort contract."""

    def dispatch_process_book(self, book_id: str, pdf_path: str) -> str:
        from app.workers.pipeline import process_book
        result = process_book.delay(book_id, pdf_path)
        return result.id

    def dispatch_compile_book(self, book_id: str) -> None:
        from app.workers.pipeline import compile_only
        compile_only.delay(book_id)

    def revoke_task(self, task_id: str) -> None:
        from app.workers.celery_app import celery_app
        celery_app.control.revoke(task_id, terminate=True, signal="SIGTERM")
