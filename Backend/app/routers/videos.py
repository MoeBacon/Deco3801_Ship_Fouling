import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile

from app.database import get_connection
from app.dependencies import get_current_user
from app.schemas import VideoUploadResponse
from app.services.frame_extractor import extract_frames, extract_single_image

router = APIRouter()


def process_video(video_id: str, video_path: str):
    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("UPDATE videos SET status = ? WHERE id = ?", ("processing", video_id))
        connection.commit()

        results = extract_frames(video_path, video_id)

        for frame in results["frames"]:
            cursor.execute(
                """INSERT INTO frames
                (id, video_id, frame_number, timestamp_in_video, file_path, annotated_file_path, enhancement_applied)
                VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    frame["frame_id"],
                    video_id,
                    frame["frame_number"],
                    frame["timestamp_in_video"],
                    frame["file_path"],
                    frame.get("annotated_file_path"),
                    frame["enhancement_applied"],
                ),
            )

            for detection in frame["detections"]:
                cursor.execute(
                    """INSERT INTO detections
                    (id, frame_id, class_label, confidence, x, y, width, height)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        str(uuid.uuid4()),
                        frame["frame_id"],
                        detection["class_label"],
                        detection["confidence"],
                        detection.get("x", 0.0),
                        detection.get("y", 0.0),
                        detection.get("width", 0.0),
                        detection.get("height", 0.0),
                    ),
                )

        cursor.execute(
            """UPDATE videos
            SET status = ?, frame_count = ?, duration = ?
            WHERE id = ?""",
            ("done", results["frame_count"], results["duration"], video_id),
        )
        connection.commit()

    except Exception as e:
        cursor.execute("UPDATE videos SET status = ? WHERE id = ?", ("error", video_id))
        connection.commit()
        print(f"Error processing the video {video_id}: {e}")

    finally:
        connection.close()


@router.post("/videos", response_model=VideoUploadResponse)
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    _user: str = Depends(get_current_user),
):
    os.makedirs("uploads", exist_ok=True)

    video_id = str(uuid.uuid4())
    file_extension = os.path.splitext(file.filename)[1]
    save_path = os.path.join("uploads", f"{video_id}{file_extension}")

    with open(save_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            f.write(chunk)

    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        """INSERT INTO videos (id, filename, upload_timestamp, status)
        VALUES (?, ?, ?, ?)""",
        (video_id, file.filename, datetime.now(timezone.utc).isoformat(), "queued"),
    )
    connection.commit()
    connection.close()

    background_tasks.add_task(process_video, video_id, save_path)
    return VideoUploadResponse(video_id=video_id, status="queued")


_ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}


def process_image(video_id: str, image_path: str):
    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute("UPDATE videos SET status = ? WHERE id = ?", ("processing", video_id))
        connection.commit()

        frame = extract_single_image(image_path, video_id)

        cursor.execute(
            """INSERT INTO frames
            (id, video_id, frame_number, timestamp_in_video, file_path, annotated_file_path, enhancement_applied)
            VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                frame["frame_id"],
                video_id,
                frame["frame_number"],
                frame["timestamp_in_video"],
                frame["file_path"],
                frame.get("annotated_file_path"),
                frame["enhancement_applied"],
            ),
        )

        for detection in frame["detections"]:
            cursor.execute(
                """INSERT INTO detections
                (id, frame_id, class_label, confidence, x, y, width, height)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    str(uuid.uuid4()),
                    frame["frame_id"],
                    detection["class_label"],
                    detection["confidence"],
                    detection.get("x", 0.0),
                    detection.get("y", 0.0),
                    detection.get("width", 0.0),
                    detection.get("height", 0.0),
                ),
            )

        cursor.execute(
            "UPDATE videos SET status = ?, frame_count = ?, duration = ? WHERE id = ?",
            ("done", 1, 0.0, video_id),
        )
        connection.commit()

    except Exception as e:
        cursor.execute("UPDATE videos SET status = ? WHERE id = ?", ("error", video_id))
        connection.commit()
        print(f"Error processing image {video_id}: {e}")

    finally:
        connection.close()


@router.post("/images", response_model=VideoUploadResponse)
async def upload_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    _user: str = Depends(get_current_user),
):
    extension = os.path.splitext(file.filename or "")[1].lower()
    if extension not in _ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File must be a JPG or PNG image.")

    os.makedirs("uploads", exist_ok=True)

    video_id = str(uuid.uuid4())
    save_path = os.path.join("uploads", f"{video_id}{extension}")

    with open(save_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            f.write(chunk)

    connection = get_connection()
    cursor = connection.cursor()
    cursor.execute(
        """INSERT INTO videos (id, filename, upload_timestamp, status)
        VALUES (?, ?, ?, ?)""",
        (video_id, file.filename, datetime.now(timezone.utc).isoformat(), "queued"),
    )
    connection.commit()
    connection.close()

    background_tasks.add_task(process_image, video_id, save_path)
    return VideoUploadResponse(video_id=video_id, status="queued")
