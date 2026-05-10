import type { ImportInspectionResponse, VesselFormPayload } from '../features/import/types'
import { readVersionedLocal, writeVersionedLocal } from './localStore'

export const UPLOAD_DRAFT_STORAGE_KEY = 'upload-page-draft-v1'
export const UPLOAD_HISTORY_STORAGE_KEY = 'upload-history-v1'
const UPLOAD_STORE_VERSION = 1
const HISTORY_LIMIT = 10

export type UploadDraft = {
  vessel: VesselFormPayload
  result: ImportInspectionResponse | null
}

export function readUploadDraft(): UploadDraft | null {
  const parsed = readVersionedLocal<Partial<UploadDraft>>(
    UPLOAD_DRAFT_STORAGE_KEY,
    UPLOAD_STORE_VERSION,
  )
  if (!parsed || typeof parsed !== 'object') return null
  return {
    vessel: (parsed.vessel ?? {}) as VesselFormPayload,
    result: parsed.result ?? null,
  }
}

export function writeUploadDraft(draft: UploadDraft): void {
  writeVersionedLocal(UPLOAD_DRAFT_STORAGE_KEY, UPLOAD_STORE_VERSION, draft)
}

export function readUploadHistory(): ImportInspectionResponse[] {
  const parsed = readVersionedLocal<unknown[]>(
    UPLOAD_HISTORY_STORAGE_KEY,
    UPLOAD_STORE_VERSION,
  )
  if (!Array.isArray(parsed)) return []
  return parsed.filter(
    (entry): entry is ImportInspectionResponse =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as { video_id?: unknown }).video_id === 'string' &&
      typeof (entry as { ok?: unknown }).ok === 'boolean',
  )
}

export function appendUploadHistory(entry: ImportInspectionResponse): void {
  const existing = readUploadHistory().filter((item) => item.video_id !== entry.video_id)
  const next = [entry, ...existing].slice(0, HISTORY_LIMIT)
  writeVersionedLocal(UPLOAD_HISTORY_STORAGE_KEY, UPLOAD_STORE_VERSION, next)
}
