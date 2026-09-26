from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.plans.router import router as plans_router


BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

app = FastAPI(
    title="BrickHUD",
    description="Plan intelligence and field HUD for bricklaying.",
    version="0.1.0",
)

app.include_router(plans_router)

app.mount(
    "/static",
    StaticFiles(directory=FRONTEND_DIR),
    name="static",
)


@app.get("/healthz")
def healthz():
    return {
        "status": "ok",
        "application": "brickhud",
    }


@app.get("/", include_in_schema=False)
def frontend():
    return FileResponse(FRONTEND_DIR / "index.html")
