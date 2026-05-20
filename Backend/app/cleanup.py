import os
import shutil
from datetime import datetime, timezone, timedelta

from app.database import get_connection

CLEANUP_AGE_DAYS = 90


def cleanup_old_data():
    cutoff = (datetime.now(timezone.utc) - timedelta(days=CLEANUP_AGE_DAYS)).isoformat()

    conn = get_connection()
    cursor = conn.cursor()

    old_videos = cursor.execute(
        "SELECT id FROM videos WHERE upload_timestamp < ?", (cutoff,)
    ).fetchall()

    if not old_videos:
        conn.close()
        return

    print(f"Cleaning up {len(old_videos)} video(s) older than {CLEANUP_AGE_DAYS} days...")

    for row in old_videos:
        video_id = row["id"]

        frame_ids = [
            r["id"] for r in cursor.execute(
                "SELECT id FROM frames WHERE video_id = ?", (video_id,)
            ).fetchall()
        ]

        frame_paths = cursor.execute(
            "SELECT file_path, annotated_file_path FROM frames WHERE video_id = ?", (video_id,)
        ).fetchall()

        if frame_ids:
            cursor.execute(
                f"DELETE FROM detections WHERE frame_id IN ({','.join('?' * len(frame_ids))})",
                frame_ids,
            )

        cursor.execute("DELETE FROM frames WHERE video_id = ?", (video_id,))
        cursor.execute("DELETE FROM videos WHERE id = ?", (video_id,))

        for frame in frame_paths:
            _remove_file(frame["file_path"])
            if frame["annotated_file_path"]:
                _remove_file(frame["annotated_file_path"])

        frames_dir = os.path.join("frames", video_id)
        if os.path.isdir(frames_dir):
            shutil.rmtree(frames_dir, ignore_errors=True)

    conn.commit()
    conn.close()
    print("Cleanup complete.")


def _remove_file(path: str):
    try:
        os.remove(path)
    except (FileNotFoundError, OSError):
        pass
