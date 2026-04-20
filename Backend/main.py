"""
K-ROV Hull Fouling Inspector — upload / import API.

Run from repo root:
  cd backend
  python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000

Frontend (Vite) proxies /api -> this server.
"""

from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import APIRouter, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from image_service import inspect_image_file
from video_service import inspect_video_file

ALLOWED_VIDEO = {".mp4", ".avi", ".mov", ".mkv", ".webm"}
ALLOWED_IMAGE = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

router = APIRouter(prefix="/api")


def _suffix(name: str) -> str:
    return Path(name).suffix.lower()


@router.post("/inspections/import")
async def import_inspection(
    vessel_name: str = Form(""),
    inspection_date: str = Form(""),
    operator_name: str = Form(""),
    location: str = Form(""),
    notes: str = Form(""),
    file: UploadFile = File(...),
):
    """
    Accept ROV video or still image, persist temporarily, run OpenCV inspection
    (metadata + JPEG preview). Enhancement math lives in `enhancements.py` for downstream jobs.
    """
    suffix = _suffix(file.filename or "")
    if suffix not in ALLOWED_VIDEO | ALLOWED_IMAGE:
        raise HTTPException(
            400,
            detail=f"Unsupported file type '{suffix}'. "
            f"Allowed video: {sorted(ALLOWED_VIDEO)}; image: {sorted(ALLOWED_IMAGE)}.",
        )

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        path = Path(tmp_path)
        try:
            if suffix in ALLOWED_VIDEO:
                media = inspect_video_file(path)
            else:
                media = inspect_image_file(path)
        finally:
            path.unlink(missing_ok=True)

        return {
            "ok": True,
            "vessel": {
                "vessel_name": vessel_name,
                "inspection_date": inspection_date,
                "operator_name": operator_name,
                "location": location,
                "notes": notes,
            },
            "file": {
                "client_filename": file.filename,
                "content_type": file.content_type,
                "size_bytes": len(content),
            },
            "media": media,
        }
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(500, detail=f"Processing failed: {e!s}") from e


app = FastAPI(title="Hull Fouling Inspector API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    # Vite may pick 5174+ if 5173 is busy; direct browser→API (no proxy) needs a match.
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
