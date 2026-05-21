import type { JobStatus, JobStatusResponse } from '../features/import/types'
import { readVersionedLocal, removeVersionedLocal, writeVersionedLocal } from './localStore'

export const IMPORT_RUNTIME_STORAGE_KEY = 'upload-import-runtime-v1'
export const IMPORT_SESSION_BUSY_KEY = 'upload-import-session-busy-v1'
const IMPORT_RUNTIME_VERSION = 1
const IMPORT_SESSION_BUSY_VERSION = 1
const IMPORT_RUNTIME_TTL_MS = 1000 * 60 * 60 * 6

export type ImportRuntimeState = {
  video_id: string
  status: JobStatus
  frame_count: number | null
  duration: number | null
  processing_delay_elapsed: boolean
  updated_at: string
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeStatus(status: unknown): JobStatus {
  if (status === 'queued' || status === 'processing' || status === 'done' || status === 'error') {
    return status
  }
  return 'unknown'
}

export function readImportRuntime(): ImportRuntimeState | null {
  const parsed = readVersionedLocal<unknown>(
    IMPORT_RUNTIME_STORAGE_KEY,
    IMPORT_RUNTIME_VERSION,
    IMPORT_RUNTIME_TTL_MS,
  )
  if (!isObject(parsed)) return null
  if (typeof parsed.video_id !== 'string') return null
  return {
    video_id: parsed.video_id,
    status: normalizeStatus(parsed.status),
    frame_count: typeof parsed.frame_count === 'number' ? parsed.frame_count : null,
    duration: typeof parsed.duration === 'number' ? parsed.duration : null,
    processing_delay_elapsed: Boolean(parsed.processing_delay_elapsed),
    updated_at: typeof parsed.updated_at === 'string' ? parsed.updated_at : new Date().toISOString(),
  }
}

export function writeImportRuntime(
  job: JobStatusResponse,
  processingDelayElapsed: boolean,
): void {
  const runtime: ImportRuntimeState = {
    video_id: job.video_id,
    status: job.status,
    frame_count: job.frame_count ?? null,
    duration: job.duration ?? null,
    processing_delay_elapsed: processingDelayElapsed,
    updated_at: new Date().toISOString(),
  }
  writeVersionedLocal(IMPORT_RUNTIME_STORAGE_KEY, IMPORT_RUNTIME_VERSION, runtime)
}

export function clearImportRuntime(): void {
  removeVersionedLocal(IMPORT_RUNTIME_STORAGE_KEY)
  setImportSessionBusy(false)
}

export function setImportSessionBusy(busy: boolean): void {
  if (busy) {
    writeVersionedLocal(IMPORT_SESSION_BUSY_KEY, IMPORT_SESSION_BUSY_VERSION, { busy: true })
  } else {
    removeVersionedLocal(IMPORT_SESSION_BUSY_KEY)
  }
}

function readImportSessionBusy(): boolean {
  const parsed = readVersionedLocal<{ busy?: boolean }>(
    IMPORT_SESSION_BUSY_KEY,
    IMPORT_SESSION_BUSY_VERSION,
  )
  return parsed?.busy === true
}

export function isImportInProgress(): boolean {
  if (readImportSessionBusy()) return true
  const runtime = readImportRuntime()
  return runtime?.status === 'queued' || runtime?.status === 'processing'
}
