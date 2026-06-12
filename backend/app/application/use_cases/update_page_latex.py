from app.domain.repositories import PageRepository
from app.domain.exceptions import PageNotFound
from app.application.commands import UpdatePageLatexCommand


class UpdatePageLatexUseCase:
    def __init__(self, page_repo: PageRepository) -> None:
        self._pages = page_repo

    async def execute(self, cmd: UpdatePageLatexCommand) -> None:
        page = await self._pages.get(cmd.book_id, cmd.page_number)
        if not page:
            raise PageNotFound(cmd.book_id, cmd.page_number)
        page.override_latex(cmd.content)
        await self._pages.update(page)
