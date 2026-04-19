from pydantic import BaseModel
from typing import Optional

class VideoUploadResponse(BaseModel):
    video_id: str
    status: str

# Could add progress: Optional[int] here if frontend wants to display a progress bar for viedo processing later 
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

# Will need to add to this if bbox/severity/other metrics get added to database.py as a result of ML's input 
class DetectionResponse(BaseModel):
    detection_id: str
    frame_id: str
    class_label: str
    confidence: float
