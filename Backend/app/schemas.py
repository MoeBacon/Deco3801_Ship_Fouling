from typing import Optional

from pydantic import BaseModel


class VideoUploadResponse(BaseModel):
    video_id: str
    status: str


class JobStatusResponse(BaseModel):
    video_id: str
    status: str
    frame_count: Optional[int]
    duration: Optional[float]


class FrameResponse(BaseModel):
    frame_id: str
    video_id: str
    frame_number: int
    timestamp_in_video: float
    image_url: str
    enhancement_applied: Optional[str]


class DetectionResponse(BaseModel):
    detection_id: str
    frame_id: str
    class_label: str
    confidence: float
