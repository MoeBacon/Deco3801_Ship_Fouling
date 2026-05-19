import { api } from '../../lib/api'
import type {
  FrameResponse,
  JobStatus,
  JobStatusResponse,
  VideoUploadResponse,
} from './types'

type RawVideoUploadResponse = {
  video_id: string
  status: string
}

type RawJobStatusResponse = {
  video_id: string
  status: string
  frame_count?: number | null
  duration?: number | null
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeStatus(status: unknown): JobStatus {
  if (status === 'queued' || status === 'processing' || status === 'done' || status === 'error') {
    return status
  }
  return 'unknown'
}

function parseVideoUploadResponse(payload: unknown): RawVideoUploadResponse {
  if (!isObject(payload)) throw new Error('Invalid upload response format.')
  if (typeof payload.video_id !== 'string') throw new Error('Upload response missing video_id.')
  if (typeof payload.status !== 'string') throw new Error('Upload response missing status.')
  return { video_id: payload.video_id, status: payload.status }
}

function parseJobStatusResponse(payload: unknown): RawJobStatusResponse {
  if (!isObject(payload)) throw new Error('Invalid job status response format.')
  if (typeof payload.video_id !== 'string') throw new Error('Job status response missing video_id.')
  if (typeof payload.status !== 'string') throw new Error('Job status response missing status.')

  return {
    video_id: payload.video_id,
    status: payload.status,
    frame_count: typeof payload.frame_count === 'number' ? payload.frame_count : null,
    duration: typeof payload.duration === 'number' ? payload.duration : null,
  }
}

export async function uploadVideo(file: File, signal?: AbortSignal): Promise<VideoUploadResponse> {
  const body = new FormData()
  body.append('file', file)

  const requestConfig = signal ? { signal } : undefined
  const isImage = file.type.startsWith('image/')
  const endpoint = isImage ? '/images' : '/videos'
  const { data } = await api.post<unknown>(endpoint, body, requestConfig)
  const parsed = parseVideoUploadResponse(data)
  return {
    video_id: parsed.video_id,
    status: normalizeStatus(parsed.status),
  }
}

export async function getJobStatus(videoId: string, signal?: AbortSignal): Promise<JobStatusResponse> {
  const requestConfig = signal ? { signal } : undefined
  const { data } = await api.get<unknown>(`/jobs/${videoId}`, requestConfig)
  const parsed = parseJobStatusResponse(data)
  return {
    video_id: parsed.video_id,
    status: normalizeStatus(parsed.status),
    frame_count: parsed.frame_count ?? null,
    duration: parsed.duration ?? null,
  }
}

export async function getVideoFrames(videoId: string, signal?: AbortSignal): Promise<FrameResponse[]> {
  const requestConfig = signal ? { signal } : undefined
  const { data } = await api.get<unknown>(`/videos/${videoId}/frames`, requestConfig)
  if (!Array.isArray(data)) throw new Error('Invalid frame list response format.')
  return data.filter(
    (frame): frame is FrameResponse =>
      typeof frame === 'object' &&
      frame !== null &&
      typeof (frame as { frame_id?: unknown }).frame_id === 'string' &&
      typeof (frame as { video_id?: unknown }).video_id === 'string' &&
      typeof (frame as { frame_number?: unknown }).frame_number === 'number' &&
      typeof (frame as { timestamp_in_video?: unknown }).timestamp_in_video === 'number' &&
      typeof (frame as { image_url?: unknown }).image_url === 'string',
  )
}
