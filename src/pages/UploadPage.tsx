import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FootageDropZone, { FOOTAGE_MAX_BYTES } from '../components/FootageDropZone'
import ImportStatusCard from '../components/ImportStatusCard'
import PageHeader from '../components/PageHeader'
import VesselDetailsForm from '../components/VesselDetailsForm'
import { importInspection } from '../features/import/importInspection'
import type { ImportInspectionResponse, VesselFormPayload } from '../features/import/types'
import { normalizeApiError } from '../lib/apiError'
import { formatBytes } from '../lib/formatBytes'
import { ROUTES } from '../lib/routes'

const emptyVessel: VesselFormPayload = {
  vessel_name: '',
  inspection_date: '',
  operator_name: '',
  location: '',
  notes: '',
}

const uploadDraftStorageKey = 'upload-page-draft-v1'

type UploadDraft = {
  vessel: VesselFormPayload
  result: ImportInspectionResponse | null
}

export default function UploadPage() {
  const navigate = useNavigate()
  const mountedRef = useRef(true)
  const activeControllerRef = useRef<AbortController | null>(null)
  const [vessel, setVessel] = useState<VesselFormPayload>(emptyVessel)
  const [file, setFile] = useState<File | null>(null)
  const [footageError, setFootageError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<ImportInspectionResponse | null>(null)

  useEffect(() => {
    mountedRef.current = true
    try {
      const raw = window.sessionStorage.getItem(uploadDraftStorageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as UploadDraft
        if (parsed?.vessel) setVessel(parsed.vessel)
        if (parsed?.result) setResult(parsed.result)
      }
    } catch {
      // Ignore malformed session data and start with defaults.
    }
    return () => {
      mountedRef.current = false
      activeControllerRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    const draft: UploadDraft = { vessel, result }
    window.sessionStorage.setItem(uploadDraftStorageKey, JSON.stringify(draft))
  }, [vessel, result])

  const onPickFile = (f: File | null) => {
    setImportError(null)
    setResult(null)
    setFootageError(null)
    if (f && f.size > FOOTAGE_MAX_BYTES) {
      setFootageError(`File exceeds maximum size of ${formatBytes(FOOTAGE_MAX_BYTES)}.`)
      setFile(null)
      return
    }
    setFile(f)
  }

  const runImport = async () => {
    if (!file) {
      setImportError('Select a video or image file first.')
      return
    }
    activeControllerRef.current?.abort()
    const controller = new AbortController()
    activeControllerRef.current = controller
    if (mountedRef.current) {
      setImportError(null)
      setUploading(true)
      setResult(null)
    }
    try {
      const data = await importInspection(file, vessel, controller.signal)
      if (!mountedRef.current || controller.signal.aborted) return
      setResult(data)
      if (!data.ok) {
        setImportError('Video processing failed on the backend. Check FastAPI logs for details.')
      }
    } catch (e) {
      if (!mountedRef.current || controller.signal.aborted) return
      setImportError(normalizeApiError(e))
    } finally {
      if (mountedRef.current && activeControllerRef.current === controller) {
        setUploading(false)
        activeControllerRef.current = null
      }
    }
  }

  const goAnalysis = () => {
    if (!result?.ok) return
    void navigate(ROUTES.analysisByVideo(result.video_id), { state: { import: result } })
  }

  const busy = uploading

  return (
    <div className="flex min-h-full min-w-0 flex-1 flex-col">
      <PageHeader breadcrumbs={['Inspections', 'New Import']} title="Upload & Import Inspection" />

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <VesselDetailsForm value={vessel} onChange={setVessel} disabled={busy} />

        <FootageDropZone file={file} onFile={onPickFile} disabled={busy} error={footageError} />

        {importError ? (
          <div className="rounded-lg border border-status-sev/40 bg-status-sev/10 px-4 py-3 text-sm text-red-100">
            {importError}
          </div>
        ) : null}

        <ImportStatusCard uploading={uploading} result={result} clientFile={file} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            disabled={busy || !file}
            onClick={() => {
              void runImport()
            }}
            className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm font-semibold text-white hover:bg-surface-1 disabled:opacity-50 sm:w-auto"
          >
            {uploading ? 'Uploading & processing…' : 'Upload video & queue job'}
          </button>

          <button
            type="button"
            disabled={!result?.ok || busy}
            onClick={goAnalysis}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover disabled:opacity-50 sm:ml-auto sm:w-auto sm:min-w-[200px]"
          >
            <span>Run analysis</span>
            <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7L8 5Z" />
            </svg>
          </button>
        </div>

        {result?.ok ? (
          <p className="text-xs text-muted">
            Previous import is saved for this tab. You can switch sections and come back without losing this analysis
            link.
          </p>
        ) : null}

        <p className="text-xs text-muted">
          Backend: <code className="rounded bg-surface-1 px-1 py-0.5 text-slate-300">uvicorn app.main:app --reload</code>.
          Vite proxies <code className="rounded bg-surface-1 px-1 py-0.5 text-slate-300">/api</code> and{' '}
          <code className="rounded bg-surface-1 px-1 py-0.5 text-slate-300">/static</code> to that server.
        </p>
      </div>
    </div>
  )
}
