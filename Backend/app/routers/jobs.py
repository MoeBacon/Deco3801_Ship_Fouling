from fastapi import APIRouter, Depends, HTTPException

from app.database import get_connection
from app.dependencies import get_current_user
from app.schemas import JobStatusResponse

router = APIRouter()


@router.get("/jobs/{video_id}", response_model=JobStatusResponse)
def get_job_status(video_id: str, _user: str = Depends(get_current_user)):
    connection = get_connection()
    cursor = connection.cursor()

    row = cursor.execute(
        "SELECT id, status, frame_count, duration FROM videos WHERE id = ?",
        (video_id,),
    ).fetchone()

    connection.close()

    if row is None:
        raise HTTPException(status_code=404, detail=f"No video found with the id {video_id}")

    return JobStatusResponse(
        video_id=row["id"],
        status=row["status"],
        frame_count=row["frame_count"],
        duration=row["duration"],
    )
