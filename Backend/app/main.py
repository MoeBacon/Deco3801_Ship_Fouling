from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import init_database
from app.routers import frames, jobs, videos


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Runs once when the server starts up.
    init_database()
    yield


app = FastAPI(
    title="Ship Fouling Detection API",
    description="Backend for ship hull fouling detection system",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve extracted frames as static files.
app.mount("/static", StaticFiles(directory="frames"), name="static")

# Versioned endpoints.
app.include_router(videos.router, prefix="/api/v1")
app.include_router(jobs.router, prefix="/api/v1")
app.include_router(frames.router, prefix="/api/v1")
