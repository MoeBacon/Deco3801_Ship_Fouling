import type { DetectionResponse, FrameResponse } from '../features/analysis/types'
import type { VesselFormPayload } from '../features/import/types'
import { readVersionedLocal, writeVersionedLocal } from './localStore'

export type ReportData = {
  generatedAt: string
  vessel: VesselFormPayload
  video_id: string
  file: { client_filename: string | null; size_bytes: number }
  job: { frame_count: number | null; duration: number | null; status: string }
  frames: FrameResponse[]
  detectionsByFrame: Record<string, DetectionResponse[]>
}

const REPORT_STORAGE_KEY = 'hull-report-v1'
const REPORT_STORE_VERSION = 1

function looksLikeReportData(value: unknown): value is ReportData {
  if (!value || typeof value !== 'object') return false
  const o = value as Record<string, unknown>
  return typeof o.generatedAt === 'string' && typeof o.video_id === 'string' && Array.isArray(o.frames)
}

export function saveReport(data: ReportData): void {
  try {
    writeVersionedLocal(REPORT_STORAGE_KEY, REPORT_STORE_VERSION, data)
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function loadReport(): ReportData | null {
  try {
    const fromLocal = readVersionedLocal<ReportData>(REPORT_STORAGE_KEY, REPORT_STORE_VERSION)
    if (fromLocal && looksLikeReportData(fromLocal)) return fromLocal

    const legacyRaw = window.sessionStorage.getItem(REPORT_STORAGE_KEY)
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw) as unknown
      if (looksLikeReportData(parsed)) {
        writeVersionedLocal(REPORT_STORAGE_KEY, REPORT_STORE_VERSION, parsed)
        window.sessionStorage.removeItem(REPORT_STORAGE_KEY)
        return parsed
      }
    }
    return null
  } catch {
    return null
  }
}
