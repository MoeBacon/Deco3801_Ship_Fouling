import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ImportInspectionResponse } from '../features/import/types'
import PageHeader from '../components/PageHeader'
import { IMPORT_RUNTIME_STORAGE_KEY, readImportRuntime } from '../lib/importRuntime'
import { subscribeLocalStoreUpdates } from '../lib/localStore'
import { useImportInProgress } from '../hooks/useImportInProgress'
import { ROUTES } from '../lib/routes'
import { readUploadDraft, readUploadHistory, UPLOAD_DRAFT_STORAGE_KEY, UPLOAD_HISTORY_STORAGE_KEY } from '../lib/uploadDraft'

export default function DashboardPage() {
  const [lastImport, setLastImport] = useState<ImportInspectionResponse | null>(() => readUploadDraft()?.result ?? null)
  const [history, setHistory] = useState<ImportInspectionResponse[]>(() => readUploadHistory())
  const [liveRuntime, setLiveRuntime] = useState(() => readImportRuntime())
  const importInProgress = useImportInProgress()

  useEffect(() => {
    const syncState = () => {
      setLastImport(readUploadDraft()?.result ?? null)
      setHistory(readUploadHistory())
      setLiveRuntime(readImportRuntime())
    }

    const onStorage = (event: StorageEvent) => {
      if (
        event.key &&
        event.key !== IMPORT_RUNTIME_STORAGE_KEY &&
        event.key !== UPLOAD_DRAFT_STORAGE_KEY &&
        event.key !== UPLOAD_HISTORY_STORAGE_KEY
      ) {
        return
      }
      syncState()
    }

    const onVisibilityOrFocus = () => syncState()
    const unsubscribe = subscribeLocalStoreUpdates((key) => {
      if (key === IMPORT_RUNTIME_STORAGE_KEY || key === UPLOAD_DRAFT_STORAGE_KEY || key === UPLOAD_HISTORY_STORAGE_KEY) {
        syncState()
      }
    })

    window.addEventListener('storage', onStorage)
    window.addEventListener('visibilitychange', onVisibilityOrFocus)
    window.addEventListener('focus', onVisibilityOrFocus)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('visibilitychange', onVisibilityOrFocus)
      window.removeEventListener('focus', onVisibilityOrFocus)
      unsubscribe()
    }
  }, [])

  /** Draft result can be cleared while upload-history still lists completed runs — fall back to newest history entry. */
  const latestActivity = lastImport ?? history[0] ?? null

  const hasActiveImport = liveRuntime?.status === 'queued' || liveRuntime?.status === 'processing'
  const latestFrames = latestActivity?.frames.length ?? latestActivity?.job.frame_count ?? 0
  const footageDurationSec = latestActivity?.frames.length
    ? Math.max(...latestActivity.frames.map((frame) => frame.timestamp_in_video))
    : null
  const inspectionCount = history.length
  const totalFramesExtracted = history.reduce((sum, entry) => sum + (entry.frames.length || 0), 0)
  const totalFootageDurationSec = history.reduce((sum, entry) => {
    if (!entry.frames.length) return sum
    const runDuration = Math.max(...entry.frames.map((frame) => frame.timestamp_in_video))
    return sum + runDuration
  }, 0)
  const footageHours = totalFootageDurationSec ? (totalFootageDurationSec / 3600).toFixed(2) : null
  const vesselName = latestActivity?.vessel.vessel_name?.trim() || 'Unknown vessel'
  const inspectionDate = latestActivity?.vessel.inspection_date?.trim() || 'Date not set'
  const operatorName = latestActivity?.vessel.operator_name?.trim() || null
  const location = latestActivity?.vessel.location?.trim() || null

  return (
    <div className="flex min-h-full min-w-0 flex-1 flex-col gap-6">
      <PageHeader breadcrumbs={['Inspections']} title="Dashboard" />

      <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm">
          <p className="text-sm font-medium text-muted">Inspections (30d)</p>
          <p className="mt-2 text-3xl font-semibold text-white">{inspectionCount}</p>
          <p className="mt-1 text-xs text-muted">From local activity</p>
        </article>
        <article className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm">
          <p className="text-sm font-medium text-muted">Latest status</p>
          <p className="mt-2 text-3xl font-semibold text-white">{latestActivity?.job.status ?? 'N/A'}</p>
          <p className="mt-1 text-xs text-muted">Current import outcome</p>
        </article>
        <article className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm">
          <p className="text-sm font-medium text-muted">Footage duration (total)</p>
          <p className="mt-2 text-3xl font-semibold text-white">{footageHours ? `${footageHours}h` : 'N/A'}</p>
          <p className="mt-1 text-xs text-muted">Across stored analyses</p>
        </article>
        <article className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm">
          <p className="text-sm font-medium text-muted">Frames extracted (total)</p>
          <p className="mt-2 text-3xl font-semibold text-white">{totalFramesExtracted || '0'}</p>
          <p className="mt-1 text-xs text-muted">Across stored analyses</p>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        <section className="flex min-w-0 flex-col rounded-xl border border-border bg-surface-1 p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-white">Recent activity</h2>
          {hasActiveImport ? (
            <div className="mt-4 rounded-lg border border-accent/40 bg-accent/10 p-4">
              <p className="text-xs uppercase tracking-wide text-accent">Active import in progress</p>
              <p className="mt-2 text-sm text-white">
                Video ID: <span className="font-medium">{liveRuntime.video_id}</span>
              </p>
              <p className="mt-1 text-sm text-muted">
                Status: {liveRuntime.status}
                {typeof liveRuntime.frame_count === 'number' ? ` · Frames: ${liveRuntime.frame_count}` : ''}
              </p>
              <div className="mt-4">
                <Link
                  className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
                  to={ROUTES.upload}
                >
                  Open Upload
                </Link>
              </div>
            </div>
          ) : null}

          {latestActivity ? (
            <div className="mt-4 rounded-lg border border-border bg-surface-0/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted">Latest local upload</p>
              <p className="mt-2 text-sm text-white">
                Vessel: <span className="font-medium">{vesselName}</span>
              </p>
              <p className="mt-1 text-sm text-muted">
                Inspection date: {inspectionDate}
                {location ? ` · Location: ${location}` : ''}
                {operatorName ? ` · Operator: ${operatorName}` : ''}
              </p>
              <p className="mt-1 text-sm text-muted">
                Status: {latestActivity.job.status} · Frames: {latestActivity.frames.length}
                {footageDurationSec ? ` · Footage duration: ${footageDurationSec.toFixed(1)}s` : ''}
              </p>
              <div className="mt-4 flex gap-3">
                <Link
                  className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-white hover:bg-surface-1"
                  to={ROUTES.upload}
                >
                  Open Upload
                </Link>
                <Link
                  className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
                  to={ROUTES.analysisByVideo(latestActivity.video_id)}
                  state={{ import: latestActivity }}
                >
                  Open Analysis
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-2 shrink-0 text-sm text-muted">
                Completed uploads are saved in this browser. Run an import from Upload Footage to see it here.
              </p>
              <div className="mt-6 flex items-center justify-center rounded-lg border border-dashed border-border bg-surface-0/60 px-4 py-10 text-center text-sm text-muted">
                No activity yet — start from{' '}
                <Link className="font-medium text-accent hover:underline" to={ROUTES.upload}>
                  Upload Footage
                </Link>
                .
              </div>
            </>
          )}

          {history.length > 1 ? (
            <div className="mt-4 rounded-lg border border-border bg-surface-0/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted">Previous analyses</p>
              <div className="mt-3 space-y-2">
                {history.slice(1, 6).map((entry) => (
                  <div key={entry.video_id} className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-surface-1/70 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">{entry.vessel.vessel_name || 'Unknown vessel'}</p>
                      <p className="text-xs text-muted">
                        {entry.vessel.inspection_date || 'Date not set'} · {entry.frames.length} frames
                      </p>
                    </div>
                    <Link
                      className="shrink-0 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-white hover:bg-surface-0"
                      to={ROUTES.analysisByVideo(entry.video_id)}
                      state={{ import: entry }}
                    >
                      Open
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className="flex flex-col rounded-xl border border-border bg-surface-1 p-6">
          <h2 className="text-lg font-semibold text-white">Quick insights</h2>
          <p className="mt-2 text-sm text-muted">At-a-glance context and fast actions for your latest run.</p>

          <div className="mt-5 space-y-3 text-sm">
            <div className="rounded-lg border border-border bg-surface-0/60 p-3">
              <p className="text-xs uppercase tracking-wide text-muted">Current state</p>
              <p className="mt-1 text-white">
                {hasActiveImport
                  ? `Import in progress (${liveRuntime?.status ?? 'unknown'})`
                  : latestActivity
                    ? `Latest import ${latestActivity.job.status}`
                    : 'No recent import'}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-surface-0/60 p-3">
              <p className="text-xs uppercase tracking-wide text-muted">Latest vessel</p>
              <p className="mt-1 text-white">{vesselName}</p>
              <p className="mt-1 text-xs text-muted">{inspectionDate}</p>
            </div>

            <div className="rounded-lg border border-border bg-surface-0/60 p-3">
              <p className="text-xs uppercase tracking-wide text-muted">Frames extracted</p>
              <p className="mt-1 text-white">{latestFrames || 0}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2">
            <Link
              className="rounded-lg border border-border px-3 py-2 text-center text-sm font-medium text-white hover:bg-surface-0"
              to={ROUTES.upload}
            >
              New Upload
            </Link>
            <Link
              className={`rounded-lg px-3 py-2 text-center text-sm font-semibold text-white ${
                latestActivity ? 'bg-accent hover:bg-accent-hover' : 'bg-surface-2 opacity-60'
              }`}
              to={latestActivity ? ROUTES.analysisByVideo(latestActivity.video_id) : ROUTES.analysis}
              state={latestActivity ? { import: latestActivity } : undefined}
            >
              Open Latest Analysis
            </Link>
            {importInProgress ? (
              <span
                title="Reports are unavailable while a video upload or import is in progress."
                className="cursor-not-allowed rounded-lg border border-border px-3 py-2 text-center text-sm font-medium text-white opacity-45"
                aria-disabled="true"
              >
                Go to Reports
              </span>
            ) : (
              <Link
                className="rounded-lg border border-border px-3 py-2 text-center text-sm font-medium text-white hover:bg-surface-0"
                to={ROUTES.reports}
              >
                Go to Reports
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
