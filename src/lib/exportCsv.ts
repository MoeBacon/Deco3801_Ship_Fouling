import type { DetectionResponse, FrameResponse } from '../features/analysis/types'
import type { VesselFormPayload } from '../features/import/types'

export type CsvExportInput = {
  videoId: string
  exportedAt: string
  vessel: VesselFormPayload
  sourceFilename: string | null
  jobStatus: string
  jobDuration: number | null
  frames: FrameResponse[]
  detectionsByFrame: Record<string, DetectionResponse[]>
}

const CSV_HEADERS = [
  'video_id',
  'vessel_name',
  'inspection_date',
  'operator_name',
  'location',
  'source_filename',
  'job_status',
  'job_duration_sec',
  'frame_number',
  'timestamp_in_video',
  'frame_id',
  'class_label',
  'confidence',
  'exported_at',
] as const

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function csvFilename(input: CsvExportInput): string {
  const shortId = (input.videoId.split('-')[0] ?? input.videoId).toLowerCase()
  const date = input.exportedAt.slice(0, 10)
  return `inspection-export-${shortId}-${date}.csv`
}

export function csvExportToString(input: CsvExportInput): string {
  const rows: string[][] = []
  const frames = [...input.frames].sort((a, b) => a.frame_number - b.frame_number)

  for (const frame of frames) {
    const detections = input.detectionsByFrame[frame.frame_id] ?? []
    if (detections.length === 0) continue

    const base = [
      input.videoId,
      input.vessel.vessel_name,
      input.vessel.inspection_date,
      input.vessel.operator_name,
      input.vessel.location,
      input.sourceFilename ?? '',
      input.jobStatus,
      input.jobDuration != null ? String(input.jobDuration) : '',
      String(frame.frame_number),
      String(frame.timestamp_in_video),
      frame.frame_id,
    ]

    for (const d of detections) {
      rows.push([...base, d.class_label, String(d.confidence), input.exportedAt])
    }
  }

  const lines = [
    CSV_HEADERS.join(','),
    ...rows.map((row) => row.map(escapeCsvField).join(',')),
  ]
  return lines.join('\r\n')
}

export function downloadAnalysisCsv(input: CsvExportInput): void {
  const csv = csvExportToString(input)
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = csvFilename(input)
  link.click()
  URL.revokeObjectURL(url)
}
