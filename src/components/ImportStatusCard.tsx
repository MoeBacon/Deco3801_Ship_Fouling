import { formatBytes } from '../lib/formatBytes'
import { formatTimestamp } from '../lib/time'
import type { ImportInspectionResponse, JobStatus, JobStatusResponse } from '../features/import/types'

type ImportStatusCardProps = {
  uploading: boolean
  result: ImportInspectionResponse | null
  clientFile: File | null
  liveJob: JobStatusResponse | null
  liveStage: JobStatus | null
  processingDelayElapsed: boolean
}

function stageClass(state: 'done' | 'active' | 'pending' | 'error') {
  if (state === 'done') return 'text-status-low'
  if (state === 'active') return 'text-accent'
  if (state === 'error') return 'text-status-sev'
  return 'text-muted'
}

function stageBubble(state: 'done' | 'active' | 'pending' | 'error') {
  if (state === 'done') return 'flex size-6 items-center justify-center rounded-full bg-status-low/20 text-status-low'
  if (state === 'active') return 'flex size-6 items-center justify-center rounded-full border-2 border-accent bg-accent/10'
  if (state === 'error') return 'flex size-6 items-center justify-center rounded-full bg-status-sev/20 text-status-sev'
  return 'flex size-6 items-center justify-center rounded-full border border-border'
}

export default function ImportStatusCard({
  uploading,
  result,
  clientFile,
  liveJob,
  liveStage,
  processingDelayElapsed,
}: ImportStatusCardProps) {
  const firstFrame = result?.frames?.[0]
  const latestJob = result?.job ?? liveJob ?? null
  const jobStatus = latestJob?.status ?? liveStage
  const frameCount = latestJob?.frame_count ?? result?.frames.length ?? null
  const duration = latestJob?.duration ?? null
  const videoId = result?.video_id ?? latestJob?.video_id ?? null
  const isRunningServerJob = jobStatus === 'processing' || jobStatus === 'queued'

  const uploadState: 'done' | 'active' | 'pending' | 'error' =
    jobStatus === 'error' ? 'error' : jobStatus ? 'done' : uploading ? 'active' : 'pending'
  const processingState: 'done' | 'active' | 'pending' | 'error' =
    jobStatus === 'error'
      ? 'error'
      : jobStatus === 'done'
        ? 'done'
        : isRunningServerJob && processingDelayElapsed
          ? 'active'
          : 'pending'
  const enhancingState: 'done' | 'active' | 'pending' | 'error' =
    jobStatus === 'error'
      ? 'error'
      : jobStatus === 'done'
        ? 'done'
        : isRunningServerJob
          ? processingDelayElapsed
            ? 'done'
            : 'active'
          : 'pending'
  const framesState: 'done' | 'active' | 'pending' | 'error' =
    jobStatus === 'error' ? 'error' : jobStatus === 'done' ? 'done' : 'pending'

  return (
    <section className="rounded-xl border border-border bg-surface-1 p-6">
      <h2 className="text-base font-semibold text-white">Processing status</h2>
      <p className="mt-1 text-sm text-muted">Video upload, queued background processing, frame extraction, and ML stub detection.</p>

      <div className="mt-6 space-y-4">
        {!clientFile && !uploading && !result ? (
          <div className="rounded-lg border border-border bg-surface-0/60 p-5 text-sm text-muted">
            No file selected.
          </div>
        ) : null}

        {clientFile ? (
          <div className="rounded-lg border border-border bg-surface-0/60 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-white">{clientFile.name}</span>
              <span className="text-muted">{formatBytes(clientFile.size)}</span>
            </div>
          </div>
        ) : null}

        {(uploading || result || liveJob || liveStage) ? (
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-muted">
              <span>Server job</span>
              <span className={jobStatus === 'error' ? 'text-status-sev' : jobStatus === 'done' ? 'text-status-low' : 'text-accent'}>
                {jobStatus ?? 'uploading'}
              </span>
            </div>
            <ol className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted">
              <li className={`flex items-center gap-2 ${stageClass(uploadState)}`}>
                <span className={stageBubble(uploadState)}>
                  {uploadState === 'done' ? '✓' : uploadState === 'error' ? '!' : uploadState === 'active' ? '●' : '○'}
                </span>
                Uploading
              </li>
              <li className="hidden text-border sm:block">→</li>
              <li className={`flex items-center gap-2 ${stageClass(enhancingState)}`}>
                <span className={stageBubble(enhancingState)}>
                  {enhancingState === 'done' ? '✓' : enhancingState === 'error' ? '!' : enhancingState === 'active' ? '●' : '○'}
                </span>
                Enhancing
              </li>
              <li className="hidden text-border sm:block">→</li>
              <li className={`flex items-center gap-2 ${stageClass(processingState)}`}>
                <span className={stageBubble(processingState)}>
                  {processingState === 'done'
                    ? '✓'
                    : processingState === 'error'
                      ? '!'
                      : processingState === 'active'
                        ? '●'
                        : '○'}
                </span>
                Processing
              </li>
              <li className="hidden text-border sm:block">→</li>
              <li className={`flex items-center gap-2 ${stageClass(framesState)}`}>
                <span className={stageBubble(framesState)}>
                  {framesState === 'done' ? '✓' : framesState === 'error' ? '!' : '○'}
                </span>
                Frames + ML stub
              </li>
            </ol>

            {videoId ? (
              <p className="mt-3 text-xs text-muted">
                Video ID: <span className="font-mono">{videoId}</span>
                {typeof frameCount === 'number' ? ` · ${frameCount} frame${frameCount === 1 ? '' : 's'}` : ''}
                {typeof duration === 'number' ? ` · ${duration.toFixed(2)}s` : ''}
              </p>
            ) : null}
          </div>
        ) : null}

        {firstFrame ? (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">First extracted frame</p>
            <img
              src={firstFrame.image_url}
              alt="First extracted frame from backend processing"
              className="max-h-56 w-full max-w-md rounded-lg border border-border object-contain"
            />
            <p className="mt-2 text-xs text-muted">
              Frame #{firstFrame.frame_number} at {formatTimestamp(firstFrame.timestamp_in_video)}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
