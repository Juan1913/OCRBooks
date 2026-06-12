"""
Post-processing normalizations for OCR markdown output from Marker.
Applied both at OCR time and when reading stored files (to fix older runs).
"""
import re


def normalize(text: str) -> str:
    text = _fix_hyphenation(text)
    text = _collapse_blank_lines(text)
    text = _remove_lone_dots(text)
    text = _renumber_problem_lists(text)
    return text


def _fix_hyphenation(text: str) -> str:
    """Rejoin words hyphenated across lines: 'ex-\npresada' → 'expresada'."""
    return re.sub(
        r'([a-záéíóúüñA-ZÁÉÍÓÚÜÑA-Za-z]+)-\n([a-záéíóúüñA-ZÁÉÍÓÚÜÑA-Za-z]+)',
        r'\1\2',
        text,
    )


def _collapse_blank_lines(text: str) -> str:
    """Collapse 3+ consecutive blank lines to exactly 2."""
    return re.sub(r'\n{3,}', '\n\n', text)


def _remove_lone_dots(text: str) -> str:
    """Remove lines that are just a period (OCR artefact from problem separators)."""
    return re.sub(r'(?m)^\.[ \t]*$', '', text)


def _renumber_problem_lists(text: str) -> str:
    """
    Marker converts numbered problems like '253. formula' into separate '1.' lists.
    When 3 or more isolated '1.' list items appear on a page, re-number them
    sequentially using the last visible inline problem number as the anchor.

    Example before:
        ...253. lim[...]
        1. lg(1+10x)/x        ← should be 254
        260*.
        1. lim n(∜a − 1)     ← should be 261

    Example after:
        ...253. lim[...]
        254. lg(1+10x)/x
        260*.
        261. lim n(∜a − 1)
    """
    # Only apply when 3+ "1." list items found (avoid false positives on normal lists)
    if len(re.findall(r'(?m)^1\.[ \t]', text)) < 3:
        return text

    # Match inline problem numbers: 1-4 digits, optional asterisk, then ". " or end-of-line
    # Must be at start of line or after whitespace to avoid e.g. "eq. 1. x"
    anchor_re = re.compile(r'(?:(?:^|\s)(\d{1,4})\*?\.(?:[ \t]|$))', re.MULTILINE)

    lines = text.split('\n')
    result: list[str] = []
    counter: int | None = None

    for line in lines:
        stripped = line.strip()

        # Is this a "1. content" list item (single digit one followed by dot+space)?
        if re.match(r'^1\.[ \t]+\S', stripped):
            if counter is not None:
                counter += 1
                content = re.sub(r'^1\.[ \t]+', '', stripped)
                result.append(f'{counter}. {content}')
            else:
                result.append(line)
            continue

        # Look for anchor numbers on this line
        anchors = anchor_re.findall(stripped)
        if anchors:
            # Use the last number found; skip "1" itself to avoid feedback loop
            candidates = [int(n) for n in anchors if int(n) != 1]
            if candidates:
                counter = candidates[-1]

        result.append(line)

    return '\n'.join(result)
