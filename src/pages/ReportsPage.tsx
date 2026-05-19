import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import type { DetectionResponse, FrameResponse } from '../features/analysis/types'
import { printInspectionReport } from '../lib/exportReport'
import { loadReport, type ReportData } from '../lib/reportStorage'
import { ROUTES } from '../lib/routes'
import { formatFootageDurationAdaptive, formatTimestamp } from '../lib/time'

// ─── Helpers ────────────────────────────────────────────────────────────────

function computeSummary(report: ReportData) {
  const allDetections: DetectionResponse[] = Object.values(report.detectionsByFrame).flat()
  const totalDetections = allDetections.length

  const countsByLabel = new Map<string, number>()
  const confByLabel = new Map<string, number[]>()

  for (const d of allDetections) {
    countsByLabel.set(d.class_label, (countsByLabel.get(d.class_label) ?? 0) + 1)
    const existing = confByLabel.get(d.class_label) ?? []
    existing.push(d.confidence)
    confByLabel.set(d.class_label, existing)
  }

  const avgConfidence =
    totalDetections > 0 ? allDetections.reduce((s, d) => s + d.confidence, 0) / totalDetections : 0

  const sortedLabels = [...countsByLabel.entries()].sort((a, b) => b[1] - a[1])

  const framesWithDetections = Object.values(report.detectionsByFrame).filter((d) => d.length > 0).length
  const coveragePct =
    report.frames.length > 0 ? Math.round((framesWithDetections / report.frames.length) * 100) : 0

  return { allDetections, totalDetections, countsByLabel, confByLabel, avgConfidence, sortedLabels, framesWithDetections, coveragePct }
}

function severityFromPct(pct: number): { label: string; color: string } {
  if (pct === 0) return { label: 'None', color: '#94a3b8' }
  if (pct < 25) return { label: 'Light', color: '#22c55e' }
  if (pct < 55) return { label: 'Moderate', color: '#f59e0b' }
  if (pct < 80) return { label: 'Heavy', color: '#ef4444' }
  return { label: 'Very Heavy', color: '#991b1b' }
}

function coverageBarColor(pct: number): string {
  if (pct < 25) return '#22c55e'
  if (pct < 55) return '#f59e0b'
  return '#ef4444'
}

function hullSectionSeverityLabel(rate: number): string | null {
  if (rate <= 0) return null
  if (rate < 0.25) return 'Low'
  if (rate < 0.55) return 'Moderate'
  return 'Heavy'
}

type CategoryHighlight = {
  classLabel: string
  peakDetection: DetectionResponse
  frame: FrameResponse
  totalDetections: number
  framesAffected: number
  avgConfidence: number
  hullSection: string
}

function frameHullSectionLabel(frame: FrameResponse, allFrames: FrameResponse[]): string {
  const idx = allFrames.findIndex((f) => f.frame_id === frame.frame_id)
  if (idx < 0 || !allFrames.length) return '-'
  const sectionCount = 6
  const sectionIndex = Math.min(
    sectionCount - 1,
    Math.floor((idx / allFrames.length) * sectionCount),
  )
  return `Hull section ${sectionIndex + 1}`
}

function computeCategoryHighlights(report: ReportData): CategoryHighlight[] {
  const frameById = new Map(report.frames.map((f) => [f.frame_id, f]))
  const byLabel = new Map<string, DetectionResponse[]>()

  for (const dets of Object.values(report.detectionsByFrame)) {
    for (const d of dets) {
      const list = byLabel.get(d.class_label) ?? []
      list.push(d)
      byLabel.set(d.class_label, list)
    }
  }

  const highlights: CategoryHighlight[] = []
  for (const [classLabel, detections] of byLabel) {
    const peak = detections.reduce((best, d) => (d.confidence > best.confidence ? d : best))
    const frame = frameById.get(peak.frame_id)
    if (!frame) continue

    const frameIds = new Set(detections.map((d) => d.frame_id))
    highlights.push({
      classLabel,
      peakDetection: peak,
      frame,
      totalDetections: detections.length,
      framesAffected: frameIds.size,
      avgConfidence: detections.reduce((s, d) => s + d.confidence, 0) / detections.length,
      hullSection: frameHullSectionLabel(frame, report.frames),
    })
  }

  return highlights.sort((a, b) => b.peakDetection.confidence - a.peakDetection.confidence)
}

function confidenceTier(confidence: number): { label: string; color: string } {
  const pct = confidence * 100
  if (pct >= 80) return { label: 'High confidence', color: '#16a34a' }
  if (pct >= 55) return { label: 'Medium confidence', color: '#f59e0b' }
  return { label: 'Lower confidence', color: '#64748b' }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

function getVideoDurationForSummary(report: ReportData): { value: string; hint: string } {
  const sec =
    report.frames.length > 0
      ? Math.max(...report.frames.map((f) => f.timestamp_in_video))
      : typeof report.job.duration === 'number' && Number.isFinite(report.job.duration) && report.job.duration > 0
        ? report.job.duration
        : null

  if (sec === null || !Number.isFinite(sec) || sec <= 0) {
    return { value: '-', hint: '' }
  }

  const { display, hint } = formatFootageDurationAdaptive(sec)
  return { value: display, hint }
}

// ─── Hull Diagram ────────────────────────────────────────────────────────────

// Each section's left-edge x and width in the SVG coordinate space
const SECTION_BOUNDS = [
  { x: 55,  w: 103 }, // section 1
  { x: 158, w: 77  }, // section 2
  { x: 235, w: 77  }, // section 3
  { x: 312, w: 78  }, // section 4
  { x: 390, w: 77  }, // section 5
  { x: 467, w: 98  }, // section 6
]

function HullDiagram({
  frames,
  detectionsByFrame,
}: {
  frames: FrameResponse[]
  detectionsByFrame: Record<string, DetectionResponse[]>
}) {
  // Divide frames evenly across 6 sections; compute detection rate per section
  const sectionRates = useMemo(() => {
    const n = SECTION_BOUNDS.length
    if (!frames.length) return Array<number>(n).fill(0)
    const size = Math.ceil(frames.length / n)
    return Array.from({ length: n }, (_, s) => {
      const slice = frames.slice(s * size, (s + 1) * size)
      if (!slice.length) return 0
      const withDets = slice.filter((f) => (detectionsByFrame[f.frame_id] ?? []).length > 0).length
      return withDets / slice.length
    })
  }, [frames, detectionsByFrame])

  const hasAnyFouling = sectionRates.some((r) => r > 0)

  return (
    <div className="report-hull-schematic rounded-lg border border-slate-200 bg-slate-50 p-4">
      <svg viewBox="0 0 600 185" className="w-full" style={{ height: '14rem' }}>
        <defs>
          {/* Clip all section fills to the hull silhouette */}
          <clipPath id="hull-clip">
            <path d="M 55 85 Q 90 62 180 62 L 490 62 Q 555 62 565 100 Q 555 138 490 138 L 180 138 Q 90 138 55 85 Z" />
          </clipPath>
        </defs>

        {/* White hull base */}
        <path
          d="M 55 85 Q 90 62 180 62 L 490 62 Q 555 62 565 100 Q 555 138 490 138 L 180 138 Q 90 138 55 85 Z"
          fill="white"
          stroke="none"
        />

        {SECTION_BOUNDS.map(({ x, w }, i) => {
          const rate = sectionRates[i] ?? 0
          if (rate === 0) return null
          const color = rate < 0.25 ? '#22c55e' : rate < 0.55 ? '#f59e0b' : '#ef4444'
          const opacity = 0.25 + rate * 0.6
          return (
            <rect
              key={i}
              x={x}
              y={55}
              width={w}
              height={95}
              fill={color}
              opacity={opacity}
              clipPath="url(#hull-clip)"
            />
          )
        })}

        {/* Hull outline on top */}
        <path
          d="M 55 85 Q 90 62 180 62 L 490 62 Q 555 62 565 100 Q 555 138 490 138 L 180 138 Q 90 138 55 85 Z"
          fill="none"
          stroke="#1e293b"
          strokeWidth="2"
        />

        {/* Section dividers */}
        {[158, 235, 312, 390, 467].map((x, i) => (
          <line key={i} x1={x} y1="64" x2={x} y2="136" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 2" />
        ))}

        {/* Section labels */}
        {['section 1', 'section 2', 'section 3', 'section 4', 'section 5', 'section 6'].map((label, i) => {
          const xs = [107, 196, 273, 351, 428, 506]
          return (
            <text key={label} x={xs[i]} y="55" textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="600">
              {label}
            </text>
          )
        })}

        {SECTION_BOUNDS.map(({ x, w }, i) => {
          const rate = sectionRates[i] ?? 0
          const label = hullSectionSeverityLabel(rate)
          if (!label) return null
          return (
            <text
              key={i}
              x={x + w / 2}
              y={103}
              textAnchor="middle"
              fontSize={w < 85 ? 8 : 9}
              fontWeight="700"
              fill="#1e293b"
            >
              {label}
            </text>
          )
        })}
      </svg>

      {hasAnyFouling ? (
        <div className="report-hull-legend mt-2 flex justify-center gap-6 text-xs text-slate-500">
          {[
            { color: '#22c55e', label: 'Low (<25%)' },
            { color: '#f59e0b', label: 'Moderate (25–55%)' },
            { color: '#ef4444', label: 'Heavy (>55%)' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span
                className="report-hull-legend-swatch inline-block size-3 shrink-0 rounded-sm border border-slate-400/50"
                style={{ backgroundColor: color, opacity: 0.85 }}
              />
              <span>{label}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-center text-xs text-slate-400">No fouling detected across hull sections.</p>
      )}
    </div>
  )
}

function DetectionSummary({ highlights }: { highlights: CategoryHighlight[] }) {
  if (!highlights.length) return null

  return (
    <div className="report-print-section border-b border-slate-200 px-8 py-6">
      <h2 className="mb-1 text-xs font-bold uppercase tracking-widest text-accent">Detection Summary</h2>
      <p className="mb-6 text-sm text-slate-500">
        Strongest match per fouling type: the frame where the model was most confident for each category.
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {highlights.map((item) => {
          const peakPct = (item.peakDetection.confidence * 100).toFixed(1)
          const avgPct = (item.avgConfidence * 100).toFixed(1)
          const tier = confidenceTier(item.peakDetection.confidence)
          return (
            <article
              key={item.classLabel}
              className="report-print-card overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="relative aspect-[4/3] bg-slate-100">
                <img
                  src={item.frame.image_url}
                  alt={`Highest confidence ${item.classLabel}, frame ${item.frame.frame_number}`}
                  className="h-full w-full object-cover"
                />
                <span
                  className="absolute left-3 top-3 rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white shadow"
                  style={{ backgroundColor: tier.color }}
                >
                  {tier.label}
                </span>
                <span className="absolute bottom-3 right-3 rounded-lg bg-slate-900/85 px-3 py-1.5 text-sm font-bold tabular-nums text-white">
                  {peakPct}% peak
                </span>
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <h3 className="text-lg font-semibold capitalize text-slate-900">{item.classLabel}</h3>
                  <p className="mt-0.5 text-sm text-slate-500">Highest-confidence detection for this type</p>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Peak confidence</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-slate-900">{peakPct}%</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Avg. confidence</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-slate-900">{avgPct}%</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Frame</dt>
                    <dd className="mt-0.5 font-semibold text-slate-900">#{item.frame.frame_number}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Video time</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-slate-900">
                      {formatTimestamp(item.frame.timestamp_in_video)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Total detections</dt>
                    <dd className="mt-0.5 font-semibold text-slate-900">{item.totalDetections}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Frames affected</dt>
                    <dd className="mt-0.5 font-semibold text-slate-900">{item.framesAffected}</dd>
                  </div>
                </dl>

                <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <span className="font-medium text-slate-700">Location:</span> {item.hullSection}
                  {item.frame.enhancement_applied ? (
                    <>
                      {' · '}
                      <span className="font-medium text-slate-700">Enhancement:</span>{' '}
                      {item.frame.enhancement_applied}
                    </>
                  ) : null}
                </p>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState() {
  const navigate = useNavigate()
  return (
    <div className="flex min-w-0 flex-col gap-6 pb-10">
      <PageHeader breadcrumbs={['Inspections']} title="Reports" />
      <section className="rounded-xl border border-border bg-surface-1 p-8 text-center">
        <svg
          className="mx-auto size-12 text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h2 className="mt-4 text-base font-semibold text-white">No report generated yet</h2>
        <p className="mt-2 text-sm text-muted">
          Complete an analysis run and click &ldquo;Generate report&rdquo; on the Analysis page.
        </p>
        <button
          type="button"
          onClick={() => void navigate(ROUTES.upload)}
          className="mt-5 inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          Start from Upload Footage
        </button>
      </section>
    </div>
  )
}

// ─── Report Document ─────────────────────────────────────────────────────────

export default function ReportsPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const report = useMemo<ReportData | null>(() => {
    const stateReport = (location.state as { report?: ReportData } | null)?.report
    return stateReport ?? loadReport()
  }, [location.state])

  const summary = useMemo(() => (report ? computeSummary(report) : null), [report])

  const detectedFrames = useMemo(() => {
    if (!report) return []
    return report.frames.filter((frame) => (report.detectionsByFrame[frame.frame_id] ?? []).length > 0)
  }, [report])

  const categoryHighlights = useMemo(
    () => (report ? computeCategoryHighlights(report) : []),
    [report],
  )

  if (!report || !summary) return <EmptyState />

  const { totalDetections, sortedLabels, avgConfidence, coveragePct, framesWithDetections } = summary
  const videoDurationSummary = getVideoDurationForSummary(report)
  const severity = severityFromPct(coveragePct)
  const shortId = (report.video_id.split('-')[0] ?? report.video_id).toUpperCase()
  const generatedDate = formatDate(report.generatedAt)
  const inspectionDate = report.vessel.inspection_date
    ? formatDate(report.vessel.inspection_date)
    : '-'

  return (
    <div className="flex min-w-0 flex-col gap-6 pb-10">
      <PageHeader
        breadcrumbs={['Inspections', 'Reports']}
        title="Inspection Report"
        actions={
          <>
            <button
              type="button"
              onClick={() => void navigate(-1)}
              className="no-print inline-flex items-center gap-2 rounded-lg border border-border bg-transparent px-4 py-2 text-sm font-medium text-white hover:bg-surface-1"
            >
              ← Back to Analysis
            </button>
            <button
              type="button"
              onClick={() => printInspectionReport()}
              className="no-print inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Download PDF
            </button>
          </>
        }
      />

      {/* ── Report Document ── */}
      <div id="report-document" className="mx-auto w-full overflow-hidden rounded-xl border border-slate-300 bg-white text-slate-900 shadow-xl" style={{ maxWidth: '794px' }}>
        {/* Top stripe */}
        <div className="h-3 bg-accent" />

        {/* ── 1. Report Header ── */}
        <div className="report-print-section flex items-center justify-between gap-6 border-b border-slate-200 px-8 py-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-accent">Biofouling Inspection</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Hull Fouling Inspection Report</h1>
            <p className="mt-1 text-sm text-slate-500">
              {report.vessel.vessel_name ? `${report.vessel.vessel_name} · ` : ''}
              Report No. {shortId}
            </p>
          </div>
          <div className="shrink-0 text-right text-xs text-slate-500">
            <p className="text-sm font-semibold text-slate-700">Generated</p>
            <p>{generatedDate}</p>
            {report.file.client_filename ? (
              <p className="mt-1 text-slate-400">
                Source: {report.file.client_filename}
                {report.file.size_bytes ? ` (${formatBytes(report.file.size_bytes)})` : ''}
              </p>
            ) : null}
          </div>
        </div>

        {/* ── 2. Vessel Details ── */}
        <div className="report-print-section border-b border-slate-200 px-8 py-6">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-accent">Vessel Details</h2>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2.5 text-sm">
            {[
              { label: 'Vessel', value: report.vessel.vessel_name },
              { label: 'Inspection Date', value: inspectionDate },
              { label: 'Location / Port', value: report.vessel.location },
              { label: 'Operator / Inspector', value: report.vessel.operator_name },
            ].map(({ label, value }) => (
              <div key={label} className="flex gap-3">
                <span className="w-36 shrink-0 font-medium text-slate-500">{label}</span>
                <span className="text-slate-900">{value || '-'}</span>
              </div>
            ))}
            {report.vessel.notes ? (
              <div className="col-span-2 flex gap-3">
                <span className="w-36 shrink-0 font-medium text-slate-500">Notes</span>
                <span className="text-slate-900">{report.vessel.notes}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="report-print-section border-b border-slate-200 bg-slate-50 px-8 py-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-accent">Inspection Summary</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Overview of footage processed and fouling detected during this inspection.
          </p>

          <div className="mt-8 space-y-6">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Footage</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  { value: videoDurationSummary.value, label: 'Footage duration', hint: videoDurationSummary.hint },
                  {
                    value: String(report.frames.length),
                    label: 'Frames analysed',
                    hint: 'Keyframes extracted and processed',
                  },
                ].map(({ value, label, hint }) => (
                  <div
                    key={label}
                    className="report-print-card rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{value}</p>
                    {hint ? <p className="mt-2 text-xs text-slate-400">{hint}</p> : null}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Detections</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="report-print-card rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total detections</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{totalDetections}</p>
                  <p className="mt-2 text-xs text-slate-400">Individual fouling instances identified</p>
                </div>
                <div
                  className="report-print-card rounded-xl border px-6 py-5 shadow-sm"
                  style={{
                    borderColor: `${coverageBarColor(coveragePct)}55`,
                    backgroundColor: `${coverageBarColor(coveragePct)}0d`,
                  }}
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Frames with fouling</p>
                  <p
                    className="mt-2 text-3xl font-bold tabular-nums"
                    style={{ color: coverageBarColor(coveragePct) }}
                  >
                    {framesWithDetections}
                    <span className="text-xl font-semibold text-slate-400"> / {report.frames.length}</span>
                  </p>
                  <p className="mt-2 text-xs text-slate-600">
                    {coveragePct}% of analysed frames contained fouling
                  </p>
                </div>
                <div className="report-print-card rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Avg. confidence</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
                    {avgConfidence > 0 ? `${(avgConfidence * 100).toFixed(0)}%` : '-'}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">Mean model confidence across all detections</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. Fouling Summary ── */}
        <div className="report-print-section border-b border-slate-200 px-8 py-6">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-accent">Fouling Summary</h2>

          {/* Biofouling Types */}
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Biofouling Types Detected</h3>
          {sortedLabels.length > 0 ? (
            <div className="mb-6 flex flex-wrap gap-2">
              {sortedLabels.map(([label, count]) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm"
                >
                  <span className="inline-block size-2.5 rounded-full bg-amber-400" />
                  <span className="text-sm font-medium capitalize text-slate-800">{label}</span>
                  <span className="text-xs text-slate-400">({count})</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mb-6 text-sm text-slate-500">No fouling types detected.</p>
          )}

          {/* Coverage bar */}
          <h3 className="mb-2 text-sm font-semibold text-slate-700">
            Estimated Coverage:{' '}
            <span style={{ color: coverageBarColor(coveragePct) }}>
              {coveragePct}%
            </span>
            {' '}
            <span
              className="ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold text-white"
              style={{ backgroundColor: severity.color }}
            >
              {severity.label}
            </span>
          </h3>
          <div className="mb-1 h-6 overflow-hidden rounded-lg bg-slate-200">
            <div
              className="h-full rounded-lg transition-all"
              style={{
                width: `${coveragePct}%`,
                backgroundColor: coverageBarColor(coveragePct),
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            {['0%', '25%', '50%', '75%', '100%'].map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>

        </div>

        {/* ── 5. Detection Breakdown Table ── */}
        <div className="report-print-section border-b border-slate-200 px-8 py-6">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-accent">Detection Results</h2>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Fouling Type</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Detections</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Share</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Avg. Confidence</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Severity</th>
                </tr>
              </thead>
              <tbody>
                {sortedLabels.length > 0 ? (
                  sortedLabels.map(([label, count], i) => {
                    const pct = totalDetections > 0 ? Math.round((count / totalDetections) * 100) : 0
                    const confList = summary.confByLabel.get(label) ?? []
                    const avgConf = confList.length ? confList.reduce((s, c) => s + c, 0) / confList.length : 0
                    const sev = severityFromPct(pct)
                    return (
                      <tr key={label} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-4 py-3 font-medium capitalize text-slate-800">{label}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">{count}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-2 rounded-full"
                                style={{ width: `${pct}%`, backgroundColor: '#2b6fe6' }}
                              />
                            </div>
                            <span className="w-8 text-right tabular-nums text-slate-600">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                          {(avgConf * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                            style={{ backgroundColor: sev.color }}
                          >
                            {sev.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                      No detections recorded for this inspection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 6. Hull Location Schematic ── */}
        <div className="report-print-section border-b border-slate-200 px-8 py-6">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-accent">Hull Location Schematic</h2>
          <HullDiagram frames={report.frames} detectionsByFrame={report.detectionsByFrame} />
        </div>

        <DetectionSummary highlights={categoryHighlights} />

        {detectedFrames.length > 0 ? (
          <div className="report-print-section report-print-allow-break border-b border-slate-200 px-8 py-6">
            <h2 className="mb-1 text-xs font-bold uppercase tracking-widest text-accent">Detected Frames</h2>
            <p className="mb-4 text-sm text-slate-500">
              {detectedFrames.length} of {report.frames.length} analysed frames with fouling detections
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {detectedFrames.map((frame) => {
                const dets = report.detectionsByFrame[frame.frame_id] ?? []
                return (
                  <div
                    key={frame.frame_id}
                    className="report-print-card overflow-hidden rounded-lg border border-amber-300 shadow-sm"
                  >
                    <div className="relative bg-slate-100">
                      <img
                        src={frame.annotated_image_url ?? frame.image_url}
                        alt={`Frame ${frame.frame_number}`}
                        className="h-20 w-full object-cover"
                      />
                      <span className="absolute right-1 top-1 rounded bg-amber-400 px-1 py-0.5 text-[10px] font-bold text-white">
                        {dets.length}
                      </span>
                    </div>
                    <div className="bg-white px-2 py-1.5">
                      <p className="text-[11px] font-medium text-slate-700">#{frame.frame_number}</p>
                      <p className="text-[10px] text-slate-400">
                        {dets
                          .slice(0, 2)
                          .map((d) => d.class_label)
                          .join(', ')}
                        {dets.length > 2 ? '…' : ''}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : report.frames.length > 0 ? (
          <div className="border-b border-slate-200 px-8 py-6">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-accent">Detected Frames</h2>
            <p className="text-sm text-slate-500">No frames with fouling detections for this inspection.</p>
          </div>
        ) : null}

        {/* ── Footer ── */}
        <div className="flex items-center justify-between bg-slate-50 px-8 py-4 text-xs text-slate-400">
          <span>Hull Fouling Inspector · {generatedDate}</span>
          <span className="tabular-nums">Video ID: {report.video_id}</span>
        </div>
        <div className="h-3 bg-accent" />
      </div>
    </div>
  )
}
