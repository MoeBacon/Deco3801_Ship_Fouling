import { getJobStatus, getVideoFrames, uploadVideo } from './api'
import type {
  ImportInspectionResponse,
  JobStatusResponse,
  VesselFormPayload,
} from './types'

type PollOptions = {
  intervalMs?: number
  timeoutMs?: number
  signal?: AbortSignal
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function pollJobUntilDone(
  videoId: string,
  onStatus: (status: JobStatusResponse) => void,
  options: PollOptions = {},
): Promise<JobStatusResponse> {
  const { intervalMs = 1500, timeoutMs = 5 * 60 * 1000, signal } = options
  const start = Date.now()

  for (;;) {
    if (signal?.aborted) throw new DOMException('Request was aborted', 'AbortError')
    const job = await getJobStatus(videoId, signal)
    onStatus(job)

    if (job.status === 'done' || job.status === 'error') {
      return job
    }

    if (job.status === 'unknown') {
      throw new Error('Backend returned an unknown job status.')
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out while waiting for video processing to finish.')
    }

    await sleep(intervalMs)
  }
}

export async function importInspection(
  file: File,
  vessel: VesselFormPayload,
  signal?: AbortSignal,
): Promise<ImportInspectionResponse> {
  const upload = await uploadVideo(file, signal)
  let latestStatus: JobStatusResponse = {
    video_id: upload.video_id,
    status: upload.status,
    frame_count: null,
    duration: null,
  }

  if (upload.status === 'unknown') {
    throw new Error('Backend returned an unknown upload status.')
  }

  const job = await pollJobUntilDone(
    upload.video_id,
    (status) => {
      latestStatus = status
    },
    signal ? { signal } : {},
  )

  const frames = job.status === 'done' ? await getVideoFrames(upload.video_id, signal) : []

  return {
    ok: job.status === 'done',
    vessel,
    file: {
      client_filename: file.name,
      content_type: file.type || null,
      size_bytes: file.size,
    },
    video_id: upload.video_id,
    job: latestStatus,
    frames,
  }
}
