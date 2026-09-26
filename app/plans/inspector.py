from pathlib import Path

import pymupdf


def inspect_pdf(path: Path) -> dict:
    document = pymupdf.open(path)

    pages = []
    total_characters = 0
    total_blocks = 0

    try:
        for page_number, page in enumerate(document, start=1):
            text = page.get_text("text").strip()
            blocks = page.get_text("blocks")

            total_characters += len(text)
            total_blocks += len(blocks)

            pages.append(
                {
                    "page": page_number,
                    "width_points": round(page.rect.width, 2),
                    "height_points": round(page.rect.height, 2),
                    "text_characters": len(text),
                    "text_blocks": len(blocks),
                    "text_sample": text[:500],
                }
            )

        return {
            "filename": path.name,
            "page_count": len(document),
            "has_text_layer": total_characters > 0,
            "total_text_characters": total_characters,
            "total_text_blocks": total_blocks,
            "pages": pages,
        }
    finally:
        document.close()
