"""
Converts Marker markdown output (with $...$, $$...$$ math) into a full LaTeX document.
Accepts a page_content_fn so the caller decides the source for each page
(OCR file vs latex_override from DB) — no file I/O here.
"""
import re
from pathlib import Path
from typing import Callable, Optional

PREAMBLE = r"""\documentclass[12pt,oneside]{book}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage[spanish]{babel}
\usepackage{amsmath,amssymb,amsthm,amsfonts}
\usepackage{graphicx}
\usepackage[margin=2.5cm]{geometry}
\usepackage{hyperref}
\usepackage{float}
\usepackage{booktabs}
\usepackage{microtype}
\usepackage{lmodern}
\graphicspath{{figures/}}
\begin{document}
"""
FOOTER = r"\end{document}"


def assemble_document(
    ocr_dir: Path,
    page_content_fn: Optional[Callable[[int], str]] = None,
) -> str:
    """
    Assemble a full LaTeX document from per-page content.
    page_content_fn(page_number) → markdown string.
    Falls back to reading .md files from ocr_dir if not provided.
    """
    if not ocr_dir.exists():
        return PREAMBLE + "\n% No OCR content found.\n" + FOOTER
    md_files = sorted(ocr_dir.glob("page_*.md"), key=lambda p: p.name)

    def default_content(page_num: int) -> str:
        path = ocr_dir / f"page_{page_num:03d}.md"
        return path.read_text("utf-8") if path.exists() else ""

    get_content = page_content_fn or default_content

    body_parts = [
        markdown_to_latex_body(get_content(_parse_page_num(f)))
        for f in md_files
    ]
    return PREAMBLE + "\n" + "\n\n".join(body_parts) + "\n" + FOOTER


def markdown_to_latex_body(markdown: str) -> str:
    lines = markdown.split("\n")
    out: list[str] = []
    in_display_math = False

    for line in lines:
        if line.strip() in ("---", "***", "* * *"):
            out.append(r"\newpage"); continue

        if line.startswith("#### "):
            out.append(r"\subsubsection{" + _safe(line[5:]) + "}"); continue
        if line.startswith("### "):
            out.append(r"\subsection{" + _safe(line[4:]) + "}"); continue
        if line.startswith("## "):
            out.append(r"\section{" + _safe(line[3:]) + "}"); continue
        if line.startswith("# "):
            out.append(r"\chapter{" + _safe(line[2:]) + "}"); continue

        stripped = line.strip()
        if stripped == "$$":
            in_display_math = not in_display_math
            out.append(r"\[" if in_display_math else r"\]"); continue
        if stripped.startswith("$$") and stripped.endswith("$$") and len(stripped) > 4:
            out.append(r"\[" + stripped[2:-2] + r"\]"); continue
        if in_display_math:
            out.append(line); continue

        m = re.match(r"!\[([^\]]*)\]\(([^)]+)\)", stripped)
        if m:
            alt, src = m.group(1), Path(m.group(2)).name
            out += [
                r"\begin{figure}[H]", r"\centering",
                rf"\includegraphics[width=0.9\textwidth]{{{src}}}",
                *(rf"\caption{{{_escape(alt)}}}" for _ in [1] if alt),
                r"\end{figure}",
            ]; continue

        out.append(_convert_inline(line))

    return "\n".join(out)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_page_num(path: Path) -> int:
    return int(path.stem.split("_")[-1])


def _protect_math(text: str) -> tuple[str, list[str]]:
    zones: list[str] = []
    def save(m):
        zones.append(m.group(0))
        return f"\x00M{len(zones)-1}\x00"
    return re.sub(r"\$\$.*?\$\$|\$[^$\n]+\$", save, text), zones


def _restore_math(text: str, zones: list[str]) -> str:
    for i, z in enumerate(zones):
        text = text.replace(f"\x00M{i}\x00", z)
    return text


def _escape(text: str) -> str:
    for ch, rep in [("&", r"\&"), ("%", r"\%"), ("#", r"\#"), ("_", r"\_"), ("^", r"\^{}")]:
        text = text.replace(ch, rep)
    return text


def _safe(text: str) -> str:
    protected, zones = _protect_math(text)
    return _restore_math(_escape(protected), zones)


def _convert_inline(line: str) -> str:
    protected, zones = _protect_math(line)
    protected = re.sub(r"\*\*(.+?)\*\*", r"\\textbf{\1}", protected)
    protected = re.sub(r"\*(.+?)\*", r"\\textit{\1}", protected)
    return _restore_math(protected, zones)
