"""
Celery tasks — pure orchestration of infrastructure services.
No domain logic, no use cases: workers live in the infrastructure layer
and call infrastructure services directly via sync APIs.
"""
import re
import shutil
from pathlib import Path

from app.workers.celery_app import celery_app, get_marker_models
from app.infrastructure.storage.local_file_storage import LocalFileStorage
from app.infrastructure.storage.pdf_extractor import extract_pages_as_images, get_page_count, get_page_dimensions_mm
from app.infrastructure.ocr.marker_ocr import MarkerOcrService
from app.infrastructure.latex.markdown_to_latex import assemble_document
from app.infrastructure.latex.tectonic_compiler import TectonicCompiler
from app.infrastructure.messaging.redis_publisher import RedisProgressPublisher
from app.infrastructure.persistence import sync_repos as db
from app.infrastructure.ai import config_store as ai_config_store
from app.infrastructure.ai.provider import AIProvider
from app.config import STORAGE_PATH


def _storage(book_id: str) -> LocalFileStorage:
    return LocalFileStorage(STORAGE_PATH)


@celery_app.task(name="ocrbooks.process_book", bind=True)
def process_book(self, book_id: str, pdf_path: str):
    db.save_celery_task_id(book_id, self.request.id)
    fs = LocalFileStorage(STORAGE_PATH)
    with RedisProgressPublisher(book_id) as pub:
        try:
            if db.count_book_pages(book_id) == 0:
                _phase_extract(book_id, pdf_path, fs, pub)
            else:
                db.set_book_processing(book_id)
            paused = _phase_ocr(book_id, fs, pub)
            if not paused:
                _phase_compile(book_id, fs, pub)
        except Exception as exc:
            pub.publish({"phase": "error", "message": str(exc)})
            db.set_book_error(book_id, str(exc))
            raise


@celery_app.task(name="ocrbooks.compile_only")
def compile_only(book_id: str):
    fs = LocalFileStorage(STORAGE_PATH)
    with RedisProgressPublisher(book_id) as pub:
        _phase_compile(book_id, fs, pub)


# ── Private phase functions ───────────────────────────────────────────────────

def _phase_extract(book_id: str, pdf_path: str, fs: LocalFileStorage, pub):
    pub.publish({"phase": "extracting", "status": "started"})
    total = get_page_count(pdf_path)
    width_mm, height_mm = get_page_dimensions_mm(pdf_path)
    fs.write_book_metadata(book_id, {"page_width_mm": width_mm, "page_height_mm": height_mm})
    db.set_book_extracting(book_id, total)

    image_paths = extract_pages_as_images(pdf_path, fs.pages_dir(book_id), scale=2.0)
    for idx, img in enumerate(image_paths):
        db.insert_page(book_id, idx + 1, img)

    db.set_book_processing(book_id)
    pub.publish({"phase": "extracting", "status": "done", "total": total})


def _phase_ocr(book_id: str, fs: LocalFileStorage, pub) -> bool:
    """Returns True if processing was paused before all pages completed."""
    image_paths = sorted(fs.pages_dir(book_id).glob("page_*.png"), key=lambda p: p.name)
    total = len(image_paths)
    ocr = MarkerOcrService(get_marker_models())

    ai_mode = db.get_book_ai_mode(book_id)
    ai_provider = AIProvider(ai_config_store.load()) if ai_mode else None

    for idx, img_path in enumerate(image_paths):
        page_num = idx + 1

        # Skip pages already processed (resume after pause)
        if db.get_page_status(book_id, page_num) == "ocr_done":
            continue

        # Check if user requested a pause before processing next page
        current_status, _ = db.get_book_status_and_task(book_id)
        if current_status == "paused":
            pub.publish({"phase": "paused", "page": page_num, "total": total})
            return True

        pub.publish({"phase": "ocr", "page": page_num, "total": total, "status": "processing"})
        db.set_page_processing(book_id, page_num)

        try:
            result = ocr.ocr_page(str(img_path), page_num, fs.figures_dir(book_id))
            markdown = _make_storage_urls(result.markdown, STORAGE_PATH)

            # Optional AI cleanup after OCR
            if ai_provider and ai_provider.is_configured:
                img_for_ai = img_path if ai_mode == "vision" else None
                try:
                    markdown = ai_provider.fix_page_sync(img_for_ai, markdown)
                except Exception:
                    pass  # AI failure is non-fatal; keep raw OCR output

            fs.write_page_ocr_content(book_id, page_num, markdown)
            db.set_page_done(book_id, page_num, str(fs.md_path(book_id, page_num)), result.has_figures)
            db.advance_book_progress(book_id, page_num)
            pub.publish({
                "phase": "ocr", "page": page_num, "total": total, "status": "done",
                "image_url": fs.get_page_image_url(book_id, page_num),
                "preview_url": f"/api/books/{book_id}/pages/{page_num}",
            })
        except Exception as exc:
            db.set_page_error(book_id, page_num, str(exc))
            pub.publish({"phase": "ocr", "page": page_num, "total": total, "status": "error", "error": str(exc)})

    return False


def _phase_compile(book_id: str, fs: LocalFileStorage, pub):
    db.set_book_compiling(book_id)
    pub.publish({"phase": "compiling", "status": "started"})

    # Resolve per-page content: prefer latex_override, fall back to OCR output
    def page_content(page_num: int) -> str:
        override = db.get_page_latex_override(book_id, page_num)
        if override:
            return override
        content = fs.read_page_ocr_content(book_id, page_num)
        return content or ""

    tex = assemble_document(fs.ocr_dir(book_id), page_content_fn=page_content)
    fs.tex_path(book_id).write_text(tex, encoding="utf-8")

    result = TectonicCompiler().compile(fs.tex_path(book_id))
    if result.success:
        _cleanup_intermediates(book_id, fs)
        db.set_book_done(book_id)
        pub.publish({"phase": "done", "pdf_url": f"/storage/{book_id}/book.pdf"})
    else:
        (fs.ocr_dir(book_id).parent / "compile.log").write_text(result.log, encoding="utf-8")
        db.set_book_error(book_id, result.log[-300:])
        pub.publish({"phase": "compile_error", "message": result.log[-500:]})


def _make_storage_urls(markdown: str, storage_path: Path) -> str:
    """Replace absolute filesystem paths under storage_path with /storage/ API URLs."""
    prefix = re.escape(str(storage_path))
    return re.sub(rf'{prefix}[/\\]?', '/storage/', markdown)


def _cleanup_intermediates(book_id: str, fs: LocalFileStorage) -> None:
    """
    After successful compilation delete the large ephemeral files.
    Keeps: original.pdf, book.pdf, ocr/*.md (for re-compile/review), figures/ (for LaTeX).
    Deletes: pages/ PNG scans (~500 MB–2 GB), book.tex (regenerable).
    """
    pages_dir = fs.pages_dir(book_id)
    if pages_dir.exists():
        shutil.rmtree(pages_dir)
    tex = fs.tex_path(book_id)
    if tex.exists():
        tex.unlink()
