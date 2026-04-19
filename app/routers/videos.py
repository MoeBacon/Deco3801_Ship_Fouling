import os
import uuid
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, BackgroundTasks
from app.database import get_connection
from app.schemas import VideoUploadResponse
from app.services.frame_extractor import extract_frames

router = APIRouter()

def process_video(video_id: str, video_path: str):
    connection = get_connection()
    cursor = connection.cursor()

    try:
        cursor.execute(
            "UPDATE videos SET status = ? WHERE id = ?",
            ("processing", video_id)
        )
        connection.commit()

        results = extract_frames(video_path, video_id)

        for frame in results["frames"]:
            cursor.execute(
                """INSERT INTO frames 
                (id, video_id, frame_number, timestamp_in_video, file_path, enhancement_applied)
                VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    frame["frame_id"],
                    video_id,
                    frame["frame_number"],
                    frame["timestamp_in_video"],
                    frame["file_path"],
                    frame["enhancement_applied"]
                )
            )

            # Insert each detection for this frame into the detections table
            for detection in frame["detections"]:
                cursor.execute(
                    """INSERT INTO detections 
                    (id, frame_id, class_label, confidence)
                    VALUES (?, ?, ?, ?)""",
                    (
                        str(uuid.uuid4()),
                        frame["frame_id"],
                        detection["class_label"],
                        detection["confidence"]
                    )
                )

        # Update video row with metadata and mark as done
        cursor.execute(
            """UPDATE videos 
            SET status = ?, frame_count = ?, duration = ?
            WHERE id = ?""",
            ("done", results["frame_count"], results["duration"], video_id)
        )
        connection.commit()
    
    except Exception as e:
        # If anything goes wrong, mark video as having errored so React knows
        cursor.execute(
            "UPDATE videos SET status = ? WHERE id = ?",
            ("error", video_id)
        )
        connection.commit()
        print(f"Error processing the video {video_id}: {e}")

    finally:
        connection.close()

@router.post("/videos", response_model=VideoUploadResponse)
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
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
        (video_id, file.filename, datetime.utcnow().isoformat(), "queued")
    )
    connection.commit()
    connection.close()

    # Adds fxt call to process_video as a background task so it keeps processing after 'queued' response is sent to react (FE) below
    background_tasks.add_task(process_video, video_id, save_path)

    return VideoUploadResponse(video_id = video_id, status = "queued")