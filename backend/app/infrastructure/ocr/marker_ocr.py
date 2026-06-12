import tempfile
from pathlib import Path
from dataclasses import dataclass

import fitz  # PyMuPDF
from app.infrastructure.ocr.md_normalizer import normalize as _normalize_md


@dataclass
class OcrResult:
    markdown: str
    has_figures: bool
    figure_paths: list[str]


class MarkerOcrService:
    """Wraps the Marker library for per-page OCR. Models are injected to avoid reloading."""

    def __init__(self, model_dict: dict):
        self._models = model_dict

    def ocr_page(self, image_path: str, page_number: int, figures_dir: Path) -> OcrResult:
        image_path = Path(image_path)
        figures_dir = Path(figures_dir)

        with tempfile.TemporaryDirectory() as tmp:
            tmp_pdf = Path(tmp) / f"p{page_number:03d}.pdf"
            _image_to_pdf(image_path, tmp_pdf)
            markdown, images = self._run_marker(str(tmp_pdf))

        figure_paths: list[str] = []
        for name, pil_img in images.items():
            dest = figures_dir / f"p{page_number:03d}_{name}"
            pil_img.save(str(dest))
            markdown = markdown.replace(name, str(dest))
            figure_paths.append(str(dest))

        return OcrResult(
            markdown=_normalize_md(markdown),
            has_figures=bool(images),
            figure_paths=figure_paths,
        )

    def _run_marker(self, pdf_path: str) -> tuple[str, dict]:
        try:
            from marker.converters.pdf import PdfConverter
            from marker.config.parser import ConfigParser

            config_parser = ConfigParser({"output_format": "markdown", "force_ocr": True, "langs": "es"})
            converter = PdfConverter(
                config=config_parser.generate_config_dict(),
                artifact_dict=self._models,
            )
            rendered = converter(pdf_path)
            markdown = getattr(rendered, "markdown", str(rendered))
            images = getattr(rendered, "images", {})
            return markdown, images
        except Exception as e:
            return f"<!-- OCR error: {e} -->\n\n*[Error en OCR: {Path(pdf_path).stem}]*\n", {}


def _image_to_pdf(image_path: Path, out_pdf: Path) -> None:
    """Wrap a PNG into a single-page PDF."""
    doc = fitz.open()
    page = doc.new_page()
    page.insert_image(page.rect, filename=str(image_path))
    doc.save(str(out_pdf))
    doc.close()
