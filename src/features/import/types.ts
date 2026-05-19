export type JobStatus = 'queued' | 'processing' | 'done' | 'error' | 'unknown'

export type VesselFormPayload = {
  vessel_name: string
  inspection_date: string
  operator_name: string
  location: string
  notes: string
}

export type ImportInspectionResponse = {
  ok: boolean
  vessel: VesselFormPayload
  file: {
    client_filename: string | null
    content_type: string | null
    size_bytes: number
  }
  video_id: string
  job: JobStatusResponse
  frames: FrameResponse[]
}

export type VideoUploadResponse = {
  video_id: string
  status: JobStatus
}

export type JobStatusResponse = {
  video_id: string
  status: JobStatus
  frame_count?: number | null
  duration?: number | null
}

export type FrameResponse = {
  frame_id: string
  video_id: string
  frame_number: number
  timestamp_in_video: number
  image_url: string
  annotated_image_url?: string | null
  enhancement_applied?: string | null
}
