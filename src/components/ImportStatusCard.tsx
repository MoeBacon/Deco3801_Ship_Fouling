import { formatBytes } from '../lib/formatBytes'
import { formatTimestamp } from '../lib/time'
import type { ImportInspectionResponse } from '../features/import/types'

type ImportStatusCardProps = {
  uploading: boolean
  result: ImportInspectionResponse | null
  clientFile: File | null
}

export default function ImportStatusCard({ uploading, result, clientFile }: ImportStatusCardProps) {
  const firstFrame = result?.frames?.[0]
  const jobStatus = result?.job.status
  const frameCount = result?.job.frame_count ?? result?.frames.length ?? null
  const duration = result?.job.duration

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

        {uploading ? (
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-muted">
              <span>Uploading &amp; starting job…</span>
              <span className="text-status-low">In progress</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-0">
              <div className="h-full w-full animate-pulse rounded-full bg-status-low/80" />
            </div>
          </div>
        ) : null}

        {!uploading && result ? (
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-muted">
              <span>Server job</span>
              <span className={result.ok ? 'text-status-low' : 'text-status-sev'}>
                {jobStatus ?? 'unknown'}
              </span>
            </div>
            <ol className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted">
              <li className="flex items-center gap-2 text-status-low">
                <span className="flex size-6 items-center justify-center rounded-full bg-status-low/20 text-status-low">
                  ✓
                </span>
                Uploading
              </li>
              <li className="hidden text-border sm:block">→</li>
              <li className={`flex items-center gap-2 ${result.ok ? 'text-status-low' : 'text-accent'}`}>
                <span className={`flex size-6 items-center justify-center rounded-full ${result.ok ? 'bg-status-low/20 text-status-low' : 'border-2 border-accent bg-accent/10'}`}>
                  {result.ok ? '✓' : '●'}
                </span>
                Processing
              </li>
              <li className="hidden text-border sm:block">→</li>
              <li className={`flex items-center gap-2 ${result.ok ? 'text-status-low' : 'text-muted'}`}>
                <span className={`flex size-6 items-center justify-center rounded-full ${result.ok ? 'bg-status-low/20 text-status-low' : 'border border-border'}`}>
                  {result.ok ? '✓' : '○'}
                </span>
                Frames + ML stub
              </li>
            </ol>

            <p className="mt-3 text-xs text-muted">
              Video ID: <span className="font-mono">{result.video_id}</span>
              {typeof frameCount === 'number' ? ` · ${frameCount} frame${frameCount === 1 ? '' : 's'}` : ''}
              {typeof duration === 'number' ? ` · ${duration.toFixed(2)}s` : ''}
            </p>
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
