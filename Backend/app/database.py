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
            FOREIGN KEY (frame_id) REFERENCES frames(id)
        )
    """
    )

    connection.commit()
    connection.close()
