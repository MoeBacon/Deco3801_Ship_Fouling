from fastapi import APIRouter, HTTPException

from app.database import get_connection
from app.schemas import DetectionResponse, FrameResponse

router = APIRouter()


def to_static_url(file_path: str) -> str:
    # Normalize separators so paths from Windows and Unix are handled the same way.
    normalized = file_path.replace("\\", "/").lstrip("/")

    if normalized.startswith("static/"):
        return "/" + normalized

    if normalized.startswith("frames/"):
        return "/static/" + normalized[len("frames/") :]

    # Fallback for unexpected stored values.
    return "/static/" + normalized


@router.get("/videos/{video_id}/frames", response_model=list[FrameResponse])
def get_frames(video_id: str):
    connection = get_connection()
    cursor = connection.cursor()

    video = cursor.execute("SELECT id FROM videos WHERE id = ?", (video_id,)).fetchone()

    if video is None:
        connection.close()
        raise HTTPException(status_code=404, detail=f"No video found with the id {video_id}")

    rows = cursor.execute(
        """SELECT id, video_id, frame_number, timestamp_in_video,
        file_path, enhancement_applied
        FROM frames WHERE video_id = ?
        ORDER BY frame_number ASC""",
        (video_id,),
    ).fetchall()

    connection.close()

    frames = []
    for row in rows:
        image_url = to_static_url(row["file_path"])

        frames.append(
            FrameResponse(
                frame_id=row["id"],
                video_id=row["video_id"],
                frame_number=row["frame_number"],
                timestamp_in_video=row["timestamp_in_video"],
                image_url=image_url,
                enhancement_applied=row["enhancement_applied"],
            )
        )

    return frames


@router.get("/frames/{frame_id}/detections", response_model=list[DetectionResponse])
def get_detections(frame_id: str):
    connection = get_connection()
    cursor = connection.cursor()

    frame = cursor.execute("SELECT id FROM frames WHERE id = ?", (frame_id,)).fetchone()

    if frame is None:
        connection.close()
        raise HTTPException(status_code=404, detail=f"No frame found with the id {frame_id}")

    rows = cursor.execute(
        "SELECT id, frame_id, class_label, confidence FROM detections WHERE frame_id = ?",
        (frame_id,),
    ).fetchall()

    connection.close()

    return [
        DetectionResponse(
            detection_id=row["id"],
            frame_id=row["frame_id"],
            class_label=row["class_label"],
            confidence=row["confidence"],
        )
        for row in rows
    ]
