class BookNotFound(Exception):
    def __init__(self, book_id: str):
        super().__init__(f"Book '{book_id}' not found")
        self.book_id = book_id


class PageNotFound(Exception):
    def __init__(self, book_id: str, page_number: int):
        super().__init__(f"Page {page_number} of book '{book_id}' not found")
        self.book_id = book_id
        self.page_number = page_number


class InvalidFileType(Exception):
    pass
