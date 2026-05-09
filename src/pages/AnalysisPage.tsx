import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { getFrameDetections, loadAnalysisByVideoId } from '../features/analysis/api'
import type { DetectionResponse, FrameResponse, ImportInspectionResponse } from '../features/analysis/types'
import { normalizeApiError } from '../lib/apiError'
import { saveReport } from '../lib/reportStorage'
import { ROUTES } from '../lib/routes'
import { formatTimestamp } from '../lib/time'

export default function AnalysisPage() {
  const location = useLocation()
  const { videoId } = useParams<{ videoId: string }>()
  const navigate = useNavigate()
  const imported = (location.state as { import?: ImportInspectionResponse } | null)?.import ?? null
  const [loadedFrames, setLoadedFrames] = useState<FrameResponse[]>([])
  const [loadingFrames, setLoadingFrames] = useState(false)
  const [frameLoadError, setFrameLoadError] = useState<string | null>(
    !videoId && !imported ? 'No analysis context found. Start from Upload Footage and run an import first.' : null,
  )
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null)
  const [detections, setDetections] = useState<DetectionResponse[]>([])
  const [loadingDetections, setLoadingDetections] = useState(false)
  const [detectionError, setDetectionError] = useState<string | null>(null)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const frames = imported?.frames?.length ? imported.frames : loadedFrames

  useEffect(() => {
    if (imported?.frames?.length) return

    if (!videoId) {
      return
    }

    let cancelled = false
    const controller = new AbortController()

    const run = async () => {
      setLoadingFrames(true)
      setFrameLoadError(null)
      try {
        const data = await loadAnalysisByVideoId(videoId, controller.signal)
        if (!cancelled) {
          setLoadedFrames(data.frames)
          if (!data.frames.length) {
            setFrameLoadError('No frames are available yet for this video.')
          }
        }
      } catch (error) {
        if (!cancelled) {
          setLoadedFrames([])
          setFrameLoadError(normalizeApiError(error))
        }
      } finally {
        if (!cancelled) setLoadingFrames(false)
      }
    }

    void run()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [imported, videoId])

  const selectedFrame = useMemo(() => {
    if (!frames.length) return null
    if (!selectedFrameId) return frames[0]
    return frames.find((frame) => frame.frame_id === selectedFrameId) ?? frames[0]
  }, [frames, selectedFrameId])
  const activeFrameId = selectedFrame?.frame_id ?? null

  useEffect(() => {
    if (!activeFrameId) {
      return
    }

    let cancelled = false
    const controller = new AbortController()

    const run = async () => {
      setLoadingDetections(true)
      setDetectionError(null)
      try {
        const data = await getFrameDetections(activeFrameId, controller.signal)
        if (!cancelled) setDetections(data)
      } catch (error) {
        if (!cancelled) {
          setDetections([])
          setDetectionError(error instanceof Error ? error.message : 'Could not load detections for this frame.')
        }
      } finally {
        if (!cancelled) setLoadingDetections(false)
      }
    }

    void run()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [activeFrameId])

  const visibleDetections = useMemo(
    () => (activeFrameId ? detections : []),
    [activeFrameId, detections],
  )

  const groupedDetections = useMemo(() => {
    const counts = new Map<string, number>()
    for (const detection of visibleDetections) {
      counts.set(detection.class_label, (counts.get(detection.class_label) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [visibleDetections])

  const generateReport = async () => {
    if (!frames.length) {
      setReportError('No frames available — run an import first.')
      return
    }
    setGeneratingReport(true)
    setReportError(null)
    try {
      const detectionsByFrame: Record<string, DetectionResponse[]> = {}
      await Promise.all(
        frames.map(async (frame) => {
          try {
            const dets = await getFrameDetections(frame.frame_id)
            detectionsByFrame[frame.frame_id] = dets
          } catch {
            detectionsByFrame[frame.frame_id] = []
          }
        }),
      )
      const reportData = {
        generatedAt: new Date().toISOString(),
        vessel: imported?.vessel ?? { vessel_name: '', inspection_date: '', operator_name: '', location: '', notes: '' },
        video_id: imported?.video_id ?? videoId ?? '',
        file: imported?.file ?? { client_filename: null, size_bytes: 0 },
        job: {
          frame_count: imported?.job.frame_count ?? frames.length,
          duration: imported?.job.duration ?? null,
          status: imported?.job.status ?? 'done',
        },
        frames,
        detectionsByFrame,
      }
      saveReport(reportData)
      void navigate(ROUTES.reports, { state: { report: reportData } })
    } catch (e) {
      setReportError('Failed to generate report: ' + (e instanceof Error ? e.message : 'Unknown error'))
    } finally {
      setGeneratingReport(false)
    }
  }

  const vesselName = imported?.vessel.vessel_name || (videoId ? `Video ${videoId}` : 'Analysis')
  const breadcrumbs = ['Inspections', vesselName, 'Analysis']

  return (
    <div className="flex min-h-full min-w-0 flex-1 flex-col gap-6">
      {imported?.ok ? (
        <div className="rounded-lg border border-status-low/30 bg-status-low/10 px-4 py-3 text-sm text-slate-100">
          Import ready:{' '}
          <span className="font-medium text-white">
            {imported.file.client_filename ?? imported.video_id}
          </span>
          {' · '}
          <span className="text-muted">{imported.frames.length} extracted frame(s)</span>
          {imported.vessel.vessel_name ? (
            <>
              {' '}
              · vessel <span className="font-medium text-white">{imported.vessel.vessel_name}</span>
            </>
          ) : null}
        </div>
      ) : null}

      <PageHeader
        breadcrumbs={breadcrumbs}
        title="Analysis & Results"
        actions={
          <>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-transparent px-4 py-2 text-sm font-medium text-white hover:bg-surface-1"
            >
              Export data
            </button>
            <button
              type="button"
              disabled={generatingReport || !frames.length}
              onClick={() => { void generateReport() }}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {generatingReport ? (
                <>
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Generating…
                </>
              ) : 'Generate report'}
            </button>
          </>
        }
      />

      {!videoId && !imported ? (
        <div className="rounded-lg border border-status-sev/40 bg-status-sev/10 px-4 py-3 text-sm text-red-100">
          No analysis run is selected.{' '}
          <Link to={ROUTES.upload} className="font-medium text-white underline">
            Go to Upload Footage
          </Link>
          .
        </div>
      ) : null}

      {frameLoadError ? (
        <div className="rounded-lg border border-status-sev/40 bg-status-sev/10 px-4 py-3 text-sm text-red-100">
          {frameLoadError}
        </div>
      ) : null}

      {reportError ? (
        <div className="rounded-lg border border-status-sev/40 bg-status-sev/10 px-4 py-3 text-sm text-red-100">
          {reportError}
        </div>
      ) : null}

      {loadingFrames ? (
        <div className="rounded-lg border border-border bg-surface-1 px-4 py-3 text-sm text-muted">
          Loading analysis frames...
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
        <article className="flex min-w-0 flex-col rounded-xl border border-border bg-surface-1 p-6 xl:col-span-2">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-white">Inspection footage</h2>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Extracted frames</p>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="relative min-h-[16rem] overflow-hidden rounded-lg border border-border bg-surface-0">
              <div className="absolute left-3 top-3 rounded bg-black/50 px-2 py-1 text-xs text-white">
                Selected frame
              </div>
              {selectedFrame ? (
                <img
                  src={selectedFrame.image_url}
                  alt={`Frame ${selectedFrame.frame_number}`}
                  className="h-full w-full object-contain pt-7"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted">No extracted frames available</div>
              )}
            </div>
            <div className="relative min-h-[16rem] overflow-hidden rounded-lg border border-border bg-surface-0">
              <div className="absolute left-3 top-3 rounded bg-black/50 px-2 py-1 text-xs text-white">
                Detection list
              </div>
              <div className="h-full overflow-y-auto p-4 pt-10">
                {loadingDetections ? (
                  <p className="text-sm text-muted">Loading detections…</p>
                ) : detectionError ? (
                  <p className="text-sm text-status-sev">{detectionError}</p>
                ) : visibleDetections.length ? (
                  <ul className="space-y-2">
                    {visibleDetections.map((detection) => (
                      <li key={detection.detection_id} className="rounded border border-border bg-surface-1/80 px-3 py-2 text-sm">
                        <p className="font-medium text-white">{detection.class_label}</p>
                        <p className="text-xs text-muted">Confidence: {(detection.confidence * 100).toFixed(1)}%</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="rounded-lg border border-status-mod/40 bg-status-mod/10 px-3 py-2 text-sm text-amber-100">
                    No detections were returned for this frame. This can mean either nothing was detected, or ML
                    inference is unavailable in the current backend environment.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Frame strip</p>
            <div className="frame-strip-scroll flex gap-3 overflow-x-auto pb-2">
              {frames.map((frame) => (
                <button
                  key={frame.frame_id}
                  type="button"
                  onClick={() => setSelectedFrameId(frame.frame_id)}
                  className={`relative w-40 shrink-0 overflow-hidden rounded-lg border ${
                    frame.frame_id === activeFrameId ? 'border-accent' : 'border-border'
                  } bg-surface-0 text-left`}
                >
                  <img src={frame.image_url} alt={`Frame ${frame.frame_number}`} className="h-24 w-full object-cover" />
                  <div className="px-2 py-1 text-xs text-muted">
                    #{frame.frame_number} · {formatTimestamp(frame.timestamp_in_video)}
                  </div>
                </button>
              ))}
              {!frames.length ? <p className="text-sm text-muted">No frames were returned by the backend.</p> : null}
            </div>
          </div>
        </article>

        <article className="rounded-xl border border-border bg-surface-1 p-6">
          <h2 className="text-base font-semibold text-white">Enhancement</h2>
          <p className="mt-1 text-sm text-muted">Raw vs enhanced toggle and sliders (placeholder).</p>
          <div className="mt-5 space-y-4">
            {['Brightness', 'Contrast', 'Dehaze'].map((label) => (
              <div key={label}>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>{label}</span>
                  <span>—</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-surface-0">
                  <div className="h-2 w-1/2 rounded-full bg-accent/70" />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="flex min-w-0 flex-col rounded-xl border border-border bg-surface-1 p-6 xl:col-span-2">
          <h2 className="text-base font-semibold text-white">Hull mapping & localisation</h2>
          <p className="mt-1 text-sm text-muted">
            2D hull schematic with clickable markers → seek to frame (placeholder).
          </p>
          <div className="mt-4 flex min-h-[min(16rem,35vh)] flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-surface-0/60 text-sm text-muted sm:min-h-[min(18rem,40vh)]">
            Hull diagram canvas
          </div>
        </article>

        <article className="rounded-xl border border-border bg-surface-1 p-6">
          <h2 className="text-base font-semibold text-white">Detection summary</h2>
          <p className="mt-1 text-sm text-muted">Class totals for the selected frame.</p>
          <div className="mt-5 space-y-3">
            {groupedDetections.map(([label, count]) => {
              const pct = visibleDetections.length ? Math.round((count / visibleDetections.length) * 100) : 0
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs text-muted">
                    <span>{label}</span>
                    <span>
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-0">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {!loadingDetections && !detectionError && !groupedDetections.length ? (
              <p className="text-sm text-muted">No detection summary available.</p>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  )
}
