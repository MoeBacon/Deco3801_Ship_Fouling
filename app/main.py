from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from app.database import init_database
from app.routers import videos, jobs, frames


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs once when the server starts up
    init_database()
    yield
    # Anything after yield = shutdown --> need to add to this later


app = FastAPI(
    title="Ship Fouling Detection API",
    description="Backend for ship hull fouling detection system",
    lifespan=lifespan
)

# CORS middleware --> allows React (localhost:3000) to make requests to this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve extracted frames as static files here
# React can fetch them via /static/frames/{video_id}/frame_0001.jpg
app.mount("/static", StaticFiles(directory="frames"), name="static")

# all endpoints versioned under /api/v1
app.include_router(videos.router, prefix="/api/v1")
app.include_router(jobs.router, prefix="/api/v1")
app.include_router(frames.router, prefix="/api/v1")