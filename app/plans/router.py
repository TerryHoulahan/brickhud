from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.plans.inspector import inspect_pdf

router = APIRouter(prefix="/api/plans", tags=["plans"])


@router.post("/inspect")
async def inspect_plan(file: UploadFile = File(...)):
    filename = file.filename or "plan.pdf"

    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="BrickHUD currently accepts PDF plans only.",
        )

    contents = await file.read()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="Uploaded PDF is empty.",
        )

    with NamedTemporaryFile(suffix=".pdf", delete=False) as temporary:
        temporary.write(contents)
        temporary_path = Path(temporary.name)

    try:
        return inspect_pdf(temporary_path)
    except pymupdf.FileDataError as exc:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is not a readable PDF.",
        ) from exc
    finally:
        temporary_path.unlink(missing_ok=True)
