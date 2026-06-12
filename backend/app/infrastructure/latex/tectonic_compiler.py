import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path


@dataclass
class CompileResult:
    success: bool
    pdf_path: Path | None
    log: str


class TectonicCompiler:
    """Compiles a .tex file using Tectonic (preferred) or pdflatex as fallback."""

    def compile(self, tex_path: Path) -> CompileResult:
        tex_path = Path(tex_path)
        cwd = tex_path.parent

        if binary := shutil.which("tectonic"):
            return self._run([binary, str(tex_path)], cwd, tex_path)

        if binary := shutil.which("pdflatex"):
            result = self._run(
                [binary, "-interaction=nonstopmode", str(tex_path)], cwd, tex_path
            )
            if result.success:
                # second pass for cross-references
                subprocess.run(
                    [binary, "-interaction=nonstopmode", str(tex_path)],
                    cwd=str(cwd), capture_output=True, timeout=300,
                )
            return result

        return CompileResult(
            success=False, pdf_path=None,
            log="No LaTeX compiler found. Install tectonic or pdflatex."
        )

    @staticmethod
    def _run(cmd: list[str], cwd: Path, tex_path: Path) -> CompileResult:
        result = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, timeout=300)
        pdf = tex_path.with_suffix(".pdf")
        return CompileResult(
            success=result.returncode == 0 and pdf.exists(),
            pdf_path=pdf if pdf.exists() else None,
            log=result.stdout + result.stderr,
        )
