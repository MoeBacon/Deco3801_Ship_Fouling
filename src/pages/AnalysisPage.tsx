import { useEffect, useMemo, useRef, useState } from 'react'
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
  const navigate = useNavigate()
  const { videoId } = useParams<{ videoId: string }>()
  const imported = (location.state as { import?: ImportInspectionResponse } | null)?.import ?? null
  const [loadedFrames, setLoadedFrames] = useState<FrameResponse[]>([])
  const [loadingFrames, setLoadingFrames] = useState(false)
  const [frameLoadError, setFrameLoadError] = useState<string | null>(
    !videoId && !imported ? 'No analysis context found. Start from Upload Footage and run an import first.' : null,
  )
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null)
  const [loadingDetections, setLoadingDetections] = useState(false)
  const [detectionError, setDetectionError] = useState<string | null>(null)
  const [detectionsByFrame, setDetectionsByFrame] = useState<Record<string, DetectionResponse[]>>({})
  const [generatingReport, setGeneratingReport] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [hoveredPoint, setHoveredPoint] = useState<{
    frameId: string
    x: number
    y: number
    label: string
    count: number
    timestamp: string
  } | null>(null)
  const frameButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const inFlightDetectionsRef = useRef<Set<string>>(new Set())
  const frames = imported?.frames?.length ? imported.frames : loadedFrames
  const analysisContextKey = imported?.video_id ?? videoId ?? 'analysis'
  const frameCacheKeys = useMemo(
    () => frames.map((frame) => `${analysisContextKey}:${frame.frame_id}`),
    [frames, analysisContextKey],
  )

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

    const cacheKey = `${analysisContextKey}:${activeFrameId}`
    const cachedDetections = detectionsByFrame[cacheKey]
    if (cachedDetections) {
      return
    }
    if (inFlightDetectionsRef.current.has(cacheKey)) {
      return
    }
    inFlightDetectionsRef.current.add(cacheKey)

    let cancelled = false
    const controller = new AbortController()

    const run = async () => {
      setLoadingDetections(true)
      setDetectionError(null)
      try {
        const data = await getFrameDetections(activeFrameId, controller.signal)
        if (!cancelled) {
          setDetectionsByFrame((prev) => ({ ...prev, [cacheKey]: data }))
        }
      } catch (error) {
        if (!cancelled) {
          setDetectionError(normalizeApiError(error))
        }
      } finally {
        inFlightDetectionsRef.current.delete(cacheKey)
        if (!cancelled) setLoadingDetections(false)
      }
    }

    void run()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [activeFrameId, detectionsByFrame, analysisContextKey])

  useEffect(() => {
    if (!frames.length) return

    const controller = new AbortController()
    let cancelled = false

    const preloadDetections = async () => {
      for (const frame of frames) {
        const cacheKey = `${analysisContextKey}:${frame.frame_id}`
        if (detectionsByFrame[cacheKey]) continue
        if (inFlightDetectionsRef.current.has(cacheKey)) continue
        inFlightDetectionsRef.current.add(cacheKey)
        try {
          const data = await getFrameDetections(frame.frame_id, controller.signal)
          if (cancelled) return
          setDetectionsByFrame((prev) => {
            if (prev[cacheKey]) return prev
            return { ...prev, [cacheKey]: data }
          })
        } catch {
          if (cancelled) return
          setDetectionsByFrame((prev) => {
            if (prev[cacheKey]) return prev
            // Treat failed prefetch as empty for timeline visibility.
            return { ...prev, [cacheKey]: [] }
          })
        } finally {
          inFlightDetectionsRef.current.delete(cacheKey)
        }
      }
    }

    void preloadDetections()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [frames, detectionsByFrame, analysisContextKey])

  const loadedDetectionFramesCount = useMemo(
    () => frameCacheKeys.filter((key) => key in detectionsByFrame).length,
    [frameCacheKeys, detectionsByFrame],
  )

  const visibleDetections = useMemo(() => {
    if (!activeFrameId) return []
    return detectionsByFrame[`${analysisContextKey}:${activeFrameId}`] ?? []
  }, [activeFrameId, detectionsByFrame, analysisContextKey])

  const groupedFrameDetections = useMemo(() => {
    const counts = new Map<string, number>()
    const allDetections = frames.flatMap((frame) => detectionsByFrame[`${analysisContextKey}:${frame.frame_id}`] ?? [])
    for (const detection of allDetections) {
      counts.set(detection.class_label, (counts.get(detection.class_label) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [frames, detectionsByFrame, analysisContextKey])

  const totalDetectionCount = useMemo(
    () => groupedFrameDetections.reduce((sum, [, count]) => sum + count, 0),
    [groupedFrameDetections],
  )

  const frameGraphItems = useMemo(() => {
    return frames.map((frame) => {
      const cached = detectionsByFrame[`${analysisContextKey}:${frame.frame_id}`]
      const frameDetections = frame.frame_id === activeFrameId ? visibleDetections : cached
      const count = frameDetections?.length ?? 0
      const status: 'unknown' | 'none' | 'detected' =
        frameDetections === undefined ? 'unknown' : count === 0 ? 'none' : 'detected'

      const byLabel = new Map<string, number>()
      for (const detection of frameDetections ?? []) {
        byLabel.set(detection.class_label, (byLabel.get(detection.class_label) ?? 0) + 1)
      }
      const hasDetections = (frameDetections?.length ?? 0) > 0
      const badOnly =
        hasDetections &&
        (frameDetections ?? []).every((detection) => detection.class_label.trim().toLowerCase() === 'bad')
      const dominantLabel =
        [...byLabel.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
        (status === 'none' ? 'No detections' : 'Not loaded')

      return {
        frame,
        count,
        status,
        badOnly,
        dominantLabel,
      }
    })
  }, [frames, activeFrameId, visibleDetections, detectionsByFrame, analysisContextKey])

  const timelineShortcuts = useMemo(() => {
    if (!frameGraphItems.length) return []

    const withDetections = frameGraphItems.filter((item) => item.count > 0)
    const firstDetection = withDetections[0]
    const highest =
      firstDetection !== undefined
        ? withDetections.reduce((best, cur) => (cur.count > best.count ? cur : best), firstDetection)
        : null
    const firstBad = firstDetection ?? null

    let longestNone: { start: number; end: number; len: number } | null = null
    let currentStart = -1
    for (let i = 0; i < frameGraphItems.length; i += 1) {
      const row = frameGraphItems[i]
      if (!row) continue
      const isNone = row.status === 'none'
      if (isNone && currentStart < 0) currentStart = i
      const closing = !isNone || i === frameGraphItems.length - 1
      if (currentStart >= 0 && closing) {
        const end = isNone && i === frameGraphItems.length - 1 ? i : i - 1
        const len = end - currentStart + 1
        if (!longestNone || len > longestNone.len) longestNone = { start: currentStart, end, len }
        currentStart = -1
      }
    }

    const shortcuts: Array<{ key: string; label: string; frameId: string }> = []
    if (highest) {
      shortcuts.push({
        key: 'highest',
        label: `Highest detections (#${highest.frame.frame_number}, ${highest.count})`,
        frameId: highest.frame.frame_id,
      })
    }
    if (firstBad) {
      shortcuts.push({
        key: 'first-bad',
        label: `First detected frame (#${firstBad.frame.frame_number})`,
        frameId: firstBad.frame.frame_id,
      })
    }
    if (longestNone && longestNone.len >= 3) {
      const mid = Math.floor((longestNone.start + longestNone.end) / 2)
      const midItem = frameGraphItems[mid]
      if (midItem) {
        shortcuts.push({
          key: 'none-streak',
          label: `Longest no-detection streak (${longestNone.len} frames)`,
          frameId: midItem.frame.frame_id,
        })
      }
    }
    return shortcuts
  }, [frameGraphItems])

  const timelineMaxCount = useMemo(
    () => Math.max(1, ...frameGraphItems.map((item) => item.count)),
    [frameGraphItems],
  )

  const timelineGeometry = useMemo(() => {
    const top = 20
    const chartBottom = 132
    const left = 24
    const right = 976
    const span = Math.max(1, frameGraphItems.length - 1)
    const step = (right - left) / span

    return frameGraphItems.map((item, idx) => {
      const x = frameGraphItems.length === 1 ? (left + right) / 2 : left + idx * step
      const y = chartBottom - (item.count / timelineMaxCount) * (chartBottom - top)
      return { x, y, item }
    })
  }, [frameGraphItems, timelineMaxCount])

  const timelinePath = useMemo(() => {
    if (!timelineGeometry.length) return ''
    return timelineGeometry.map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  }, [timelineGeometry])

  const vesselName = imported?.vessel.vessel_name || (videoId ? `Video ${videoId}` : 'Analysis')
  const breadcrumbs = ['Inspections', vesselName, 'Analysis']

  const generateReport = async () => {
    if (!frames.length) {
      setReportError('No frames available — run an import first.')
      return
    }
    setGeneratingReport(true)
    setReportError(null)
    try {
      const reportDetections: Record<string, DetectionResponse[]> = {}
      await Promise.all(
        frames.map(async (frame) => {
          const cacheKey = `${analysisContextKey}:${frame.frame_id}`
          const cached = detectionsByFrame[cacheKey]
          if (cached !== undefined) {
            reportDetections[frame.frame_id] = cached
            return
          }
          try {
            const dets = await getFrameDetections(frame.frame_id)
            reportDetections[frame.frame_id] = dets
            setDetectionsByFrame((prev) => ({ ...prev, [cacheKey]: dets }))
          } catch {
            reportDetections[frame.frame_id] = []
            setDetectionsByFrame((prev) => ({ ...prev, [cacheKey]: [] }))
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
        detectionsByFrame: reportDetections,
      }
      saveReport(reportData)
      void navigate(ROUTES.reports, { state: { report: reportData } })
    } catch (e) {
      setReportError('Failed to generate report: ' + (e instanceof Error ? e.message : 'Unknown error'))
    } finally {
      setGeneratingReport(false)
    }
  }

  useEffect(() => {
    if (!activeFrameId) return
    const target = frameButtonRefs.current[activeFrameId]
    if (!target || typeof target.scrollIntoView !== 'function') return
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeFrameId])

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
              onClick={() => {
                void generateReport()
              }}
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
              ) : (
                'Generate report'
              )}
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
                  loading="lazy"
                  decoding="async"
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
                  ref={(el) => {
                    frameButtonRefs.current[frame.frame_id] = el
                  }}
                  type="button"
                  onClick={() => setSelectedFrameId(frame.frame_id)}
                  className={`relative w-40 shrink-0 overflow-hidden rounded-lg border ${
                    frame.frame_id === activeFrameId ? 'border-accent' : 'border-border'
                  } bg-surface-0 text-left`}
                >
                  <img
                    src={frame.image_url}
                    alt={`Frame ${frame.frame_number}`}
                    loading="lazy"
                    decoding="async"
                    className="h-24 w-full object-cover"
                  />
                  <div className="px-2 py-1 text-xs text-muted">
                    #{frame.frame_number} · {formatTimestamp(frame.timestamp_in_video)}
                  </div>
                </button>
              ))}
              {!frames.length ? <p className="text-sm text-muted">No frames were returned by the backend.</p> : null}
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-surface-0/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">Detection timeline</h3>
              <p className="text-xs text-muted">Click any point to jump to a frame and inspect details.</p>
            </div>

            <div className="mt-4 flex items-center gap-4 text-xs text-muted">
              <span className="inline-flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-accent" />
                Has non-bad detections
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-status-sev" />
                Bad only
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-status-mod" />
                No detections
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-border" />
                Not loaded yet
              </span>
            </div>

            <p className="mt-2 text-xs text-muted">
              Timeline loaded: {loadedDetectionFramesCount}/{frames.length || 0} frames
            </p>

            {timelineShortcuts.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {timelineShortcuts.map((shortcut) => (
                  <button
                    key={shortcut.key}
                    type="button"
                    onClick={() => setSelectedFrameId(shortcut.frameId)}
                    className="rounded-full border border-border bg-surface-1 px-3 py-1 text-xs text-white hover:bg-surface-2"
                  >
                    {shortcut.label}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="relative mt-4 overflow-visible rounded-lg border border-border bg-surface-1/70 p-3">
              <svg viewBox="0 0 1000 176" className="h-44 w-full" role="img" aria-label="Detection trend across frames">
                <line x1="24" y1="132" x2="976" y2="132" stroke="#243044" strokeWidth="1.5" />
                <line x1="24" y1="20" x2="24" y2="132" stroke="#243044" strokeWidth="1.5" />

                {timelineGeometry.map(({ x, item }) => {
                  return (
                    <line
                      key={`v-${item.frame.frame_id}`}
                      x1={x}
                      y1="132"
                      x2={x}
                      y2="140"
                      stroke="#334155"
                      strokeWidth="1.5"
                      opacity="0.9"
                    />
                  )
                })}

                {timelinePath ? <path d={timelinePath} fill="none" stroke="#2b6fe6" strokeWidth="2.5" opacity="0.9" /> : null}

                {timelineGeometry.map(({ x, y, item }) => {
                  const fill =
                    item.status === 'detected'
                      ? item.badOnly
                        ? '#ef4444'
                        : '#2b6fe6'
                      : item.status === 'none'
                        ? '#f59e0b'
                        : '#334155'
                  const isActive = item.frame.frame_id === activeFrameId
                  return (
                    <g
                      key={item.frame.frame_id}
                      onClick={() => setSelectedFrameId(item.frame.frame_id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setSelectedFrameId(item.frame.frame_id)
                        }
                      }}
                      onMouseEnter={() =>
                        setHoveredPoint({
                          frameId: item.frame.frame_id,
                          x,
                          y,
                          label: item.dominantLabel,
                          count: item.count,
                          timestamp: formatTimestamp(item.frame.timestamp_in_video),
                        })
                      }
                      onMouseLeave={() => setHoveredPoint((current) => (current?.frameId === item.frame.frame_id ? null : current))}
                      role="button"
                      tabIndex={0}
                      aria-label={`Frame ${item.frame.frame_number}, detections ${item.count}, top label ${item.dominantLabel}`}
                      className="cursor-pointer"
                    >
                      <circle cx={x} cy={y} r={isActive ? 6.5 : 5} fill={fill} stroke={isActive ? '#ffffff' : fill} strokeWidth={isActive ? 2 : 0.5} />
                      <title>{`Frame #${item.frame.frame_number}: ${item.dominantLabel} (${item.count})`}</title>
                    </g>
                  )
                })}

                {timelineGeometry
                  .filter((_, idx) => idx % Math.ceil(Math.max(1, timelineGeometry.length / 8)) === 0)
                  .map(({ x, item }) => (
                    <text key={`t-${item.frame.frame_id}`} x={x} y="158" textAnchor="middle" fontSize="11" fill="#94a3b8">
                      {`#${item.frame.frame_number}`}
                    </text>
                  ))}
              </svg>

              {hoveredPoint ? (
                <div
                  className="pointer-events-none absolute z-10 max-w-56 rounded-md border border-border bg-surface-0/95 px-3 py-2 text-xs text-slate-100 shadow-lg"
                  style={{
                    left: `${Math.min(90, Math.max(4, (hoveredPoint.x / 1000) * 100))}%`,
                    top: `${Math.min(82, Math.max(8, (hoveredPoint.y / 176) * 100 - 18))}%`,
                    transform: 'translate(-50%, -100%)',
                  }}
                >
                  <p className="font-medium text-white">Frame #{frames.find((f) => f.frame_id === hoveredPoint.frameId)?.frame_number}</p>
                  <p className="text-muted">Time: {hoveredPoint.timestamp}</p>
                  <p>Detections: {hoveredPoint.count}</p>
                  <p className="text-muted">Top label: {hoveredPoint.label}</p>
                </div>
              ) : null}
            </div>

            {selectedFrame ? (
              <p className="mt-3 text-xs text-muted">
                Selected frame #{selectedFrame.frame_number}: {frameGraphItems.find((item) => item.frame.frame_id === selectedFrame.frame_id)?.dominantLabel}
              </p>
            ) : null}
          </div>
        </article>

        <article className="rounded-xl border border-border bg-surface-1 p-6">
          <h2 className="text-base font-semibold text-white">Detection summary</h2>
          <p className="mt-1 text-sm text-muted">Class totals across all frames in this analysis.</p>
          <div className="mt-5 space-y-3">
            {groupedFrameDetections.map(([label, count]) => {
              const pct = totalDetectionCount ? Math.round((count / totalDetectionCount) * 100) : 0
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
            {!loadingDetections && !detectionError && !groupedFrameDetections.length ? (
              <p className="text-sm text-muted">No detection summary available.</p>
            ) : null}
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

      </div>
    </div>
  )
}
