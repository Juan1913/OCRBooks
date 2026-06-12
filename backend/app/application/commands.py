"""
Commands — explicit input objects for every write use case.
Read-only queries use primitive identifiers directly.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class UploadBookCommand:
    filename: str
    file_data: bytes


@dataclass(frozen=True)
class UpdatePageLatexCommand:
    book_id: str
    page_number: int
    content: str


@dataclass(frozen=True)
class CompileBookCommand:
    book_id: str
