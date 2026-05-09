import type { DetectionResponse, FrameResponse } from '../features/analysis/types'
import type { VesselFormPayload } from '../features/import/types'

export type ReportData = {
  generatedAt: string
  vessel: VesselFormPayload
  video_id: string
  file: { client_filename: string | null; size_bytes: number }
  job: { frame_count: number | null; duration: number | null; status: string }
  frames: FrameResponse[]
  detectionsByFrame: Record<string, DetectionResponse[]>
}

const REPORT_KEY = 'hull-report-v1'

export function saveReport(data: ReportData): void {
  try {
    window.sessionStorage.setItem(REPORT_KEY, JSON.stringify(data))
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function loadReport(): ReportData | null {
  try {
    const raw = window.sessionStorage.getItem(REPORT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ReportData
  } catch {
    return null
  }
}
