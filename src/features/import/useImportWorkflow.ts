import { useEffect, useRef, useState } from 'react'
import { getJobStatus, getVideoFrames } from './api'
import { importInspection } from './importInspection'
import type { ImportInspectionResponse, JobStatus, JobStatusResponse, VesselFormPayload } from './types'
import { normalizeApiError } from '../../lib/apiError'
import { appendUploadHistory } from '../../lib/uploadDraft'
import {
  clearImportRuntime,
  IMPORT_RUNTIME_STORAGE_KEY,
  readImportRuntime,
  writeImportRuntime,
} from '../../lib/importRuntime'

type UseImportWorkflowResult = {
  uploading: boolean
  result: ImportInspectionResponse | null
  setResult: (result: ImportInspectionResponse | null) => void
  importError: string | null
  setImportError: (message: string | null) => void
  liveJob: JobStatusResponse | null
  liveStage: JobStatus | null
  processingDelayElapsed: boolean
  runImport: (file: File, vessel: VesselFormPayload) => Promise<ImportInspectionResponse | null>
}

export function useImportWorkflow(vessel: VesselFormPayload): UseImportWorkflowResult {
  const [initialRuntime] = useState(() => readImportRuntime())
  const [uploading, setUploading] = useState(
    () => initialRuntime?.status === 'queued' || initialRuntime?.status === 'processing',
  )
  const [result, setResult] = useState<ImportInspectionResponse | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [liveJob, setLiveJob] = useState<JobStatusResponse | null>(() =>
    initialRuntime
      ? {
          video_id: initialRuntime.video_id,
          status: initialRuntime.status,
          frame_count: initialRuntime.frame_count,
          duration: initialRuntime.duration,
        }
      : null,
  )
  const [liveStage, setLiveStage] = useState<JobStatus | null>(initialRuntime?.status ?? null)
  const [processingDelayElapsed, setProcessingDelayElapsed] = useState(
    initialRuntime?.processing_delay_elapsed ?? false,
  )

  const mountedRef = useRef(true)
  const activeControllerRef = useRef<AbortController | null>(null)
  const enhancingTimerRef = useRef<number | null>(null)
  const resumePollingControllerRef = useRef<AbortController | null>(null)
  const processingDelayElapsedRef = useRef(initialRuntime?.processing_delay_elapsed ?? false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (enhancingTimerRef.current !== null) {
        window.clearTimeout(enhancingTimerRef.current)
        enhancingTimerRef.current = null
      }
      activeControllerRef.current?.abort()
      resumePollingControllerRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    processingDelayElapsedRef.current = processingDelayElapsed
  }, [processingDelayElapsed])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== IMPORT_RUNTIME_STORAGE_KEY) return
      const runtime = readImportRuntime()
      if (!runtime) {
        if (mountedRef.current) {
          setLiveJob(null)
          setLiveStage(null)
          setUploading(false)
          setProcessingDelayElapsed(false)
        }
        return
      }

      const syncedStatus: JobStatusResponse = {
        video_id: runtime.video_id,
        status: runtime.status,
        frame_count: runtime.frame_count,
        duration: runtime.duration,
      }
      if (mountedRef.current) {
        setLiveJob(syncedStatus)
        setLiveStage(runtime.status)
        setProcessingDelayElapsed(runtime.processing_delay_elapsed)
        setUploading(runtime.status === 'queued' || runtime.status === 'processing')
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    const runtime = readImportRuntime()
    if (!runtime || runtime.status === 'done' || runtime.status === 'error') return

    if (!runtime.processing_delay_elapsed && enhancingTimerRef.current === null) {
      enhancingTimerRef.current = window.setTimeout(() => {
        const latestRuntime = readImportRuntime()
        if (latestRuntime) {
          writeImportRuntime(
            {
              video_id: latestRuntime.video_id,
              status: latestRuntime.status,
              frame_count: latestRuntime.frame_count,
              duration: latestRuntime.duration,
            },
            true,
          )
        }
        if (mountedRef.current) setProcessingDelayElapsed(true)
        enhancingTimerRef.current = null
      }, 4500)
    }

    resumePollingControllerRef.current?.abort()
    const controller = new AbortController()
    resumePollingControllerRef.current = controller

    const poll = async () => {
      for (;;) {
        if (controller.signal.aborted) return
        const status = await getJobStatus(runtime.video_id, controller.signal)
        if (controller.signal.aborted) return
        writeImportRuntime(status, processingDelayElapsedRef.current)
        if (mountedRef.current) {
          setLiveJob(status)
          setLiveStage(status.status)
        }

        if (status.status === 'done' || status.status === 'error') {
          if (status.status === 'done') {
            const frames = await getVideoFrames(runtime.video_id, controller.signal)
            if (controller.signal.aborted) return
            const completed: ImportInspectionResponse = {
              ok: true,
              vessel,
              file: {
                client_filename: null,
                content_type: null,
                size_bytes: 0,
              },
              video_id: runtime.video_id,
              job: status,
              frames,
            }
            if (mountedRef.current) setResult(completed)
            appendUploadHistory(completed)
          } else if (mountedRef.current) {
            setImportError('Video processing failed on the backend. Check FastAPI logs for details.')
          }
          clearImportRuntime()
          if (mountedRef.current) {
            setUploading(false)
            setProcessingDelayElapsed(true)
          }
          return
        }

        await new Promise((resolve) => window.setTimeout(resolve, 1500))
      }
    }

    void poll()
    return () => controller.abort()
  }, [vessel])

  const runImport = async (file: File, vesselPayload: VesselFormPayload) => {
    activeControllerRef.current?.abort()
    const controller = new AbortController()
    activeControllerRef.current = controller
    if (mountedRef.current) {
      setImportError(null)
      setUploading(true)
      setResult(null)
      setLiveJob(null)
      setLiveStage('queued')
      setProcessingDelayElapsed(false)
      if (enhancingTimerRef.current !== null) {
        window.clearTimeout(enhancingTimerRef.current)
        enhancingTimerRef.current = null
      }
    }

    try {
      const data = await importInspection(file, vesselPayload, {
        signal: controller.signal,
        onStatus: (status) => {
          writeImportRuntime(status, processingDelayElapsedRef.current)
          if (mountedRef.current && !controller.signal.aborted) setLiveJob(status)
        },
        onStage: (status) => {
          if (mountedRef.current && !controller.signal.aborted) {
            setLiveStage(status)
            if ((status === 'queued' || status === 'processing') && enhancingTimerRef.current === null) {
              enhancingTimerRef.current = window.setTimeout(() => {
                const latestRuntime = readImportRuntime()
                if (latestRuntime) {
                  writeImportRuntime(
                    {
                      video_id: latestRuntime.video_id,
                      status: latestRuntime.status,
                      frame_count: latestRuntime.frame_count,
                      duration: latestRuntime.duration,
                    },
                    true,
                  )
                }
                if (mountedRef.current && !controller.signal.aborted) setProcessingDelayElapsed(true)
                enhancingTimerRef.current = null
              }, 4500)
            }
          }
        },
      })

      if (!mountedRef.current || controller.signal.aborted) return null
      setResult(data)
      if (data.ok) appendUploadHistory(data)
      setLiveStage(data.job.status)
      setProcessingDelayElapsed(true)
      writeImportRuntime(data.job, true)
      if (enhancingTimerRef.current !== null) {
        window.clearTimeout(enhancingTimerRef.current)
        enhancingTimerRef.current = null
      }
      if (!data.ok) {
        setImportError('Video processing failed on the backend. Check FastAPI logs for details.')
      }
      clearImportRuntime()
      return data
    } catch (error) {
      if (!mountedRef.current || controller.signal.aborted) return null
      setImportError(normalizeApiError(error))
      return null
    } finally {
      if (mountedRef.current && activeControllerRef.current === controller) {
        setUploading(false)
        activeControllerRef.current = null
        if (enhancingTimerRef.current !== null) {
          window.clearTimeout(enhancingTimerRef.current)
          enhancingTimerRef.current = null
        }
      }
    }
  }

  return {
    uploading,
    result,
    setResult,
    importError,
    setImportError,
    liveJob,
    liveStage,
    processingDelayElapsed,
    runImport,
  }
}
