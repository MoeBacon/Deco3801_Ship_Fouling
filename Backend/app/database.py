import os
import sqlite3

DATABASE_PATH = "ship_fouling.db"


def get_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_database():
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("frames", exist_ok=True)

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS videos (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            upload_timestamp TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'queued',
            duration REAL,
            frame_count INTEGER
        )
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS frames (
            id TEXT PRIMARY KEY,
            video_id TEXT NOT NULL,
            frame_number INTEGER NOT NULL,
            timestamp_in_video REAL NOT NULL,
            file_path TEXT NOT NULL,
            annotated_file_path TEXT,
            enhancement_applied TEXT,
            FOREIGN KEY (video_id) REFERENCES videos(id)
        )
    """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS detections (
            id TEXT PRIMARY KEY,
            frame_id TEXT NOT NULL,
            class_label TEXT NOT NULL,
            confidence REAL NOT NULL,
            x REAL,
            y REAL,
            width REAL,
            height REAL,
            FOREIGN KEY (frame_id) REFERENCES frames(id)
        )
    """
    )

    # Migrate existing databases that predate these columns
    for migration in [
        "ALTER TABLE frames ADD COLUMN annotated_file_path TEXT",
        "ALTER TABLE detections ADD COLUMN x REAL",
        "ALTER TABLE detections ADD COLUMN y REAL",
        "ALTER TABLE detections ADD COLUMN width REAL",
        "ALTER TABLE detections ADD COLUMN height REAL",
    ]:
        try:
            cursor.execute(migration)
            connection.commit()
        except sqlite3.OperationalError:
            pass  # Column already exists

    connection.commit()
    connection.close()
