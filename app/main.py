from fastapi import FastAPI

app = FastAPI(
    title="BrickHUD",
    description="Plan intelligence and field HUD for bricklaying.",
    version="0.1.0",
)


@app.get("/healthz")
def healthz():
    return {
        "status": "ok",
        "application": "brickhud",
    }
