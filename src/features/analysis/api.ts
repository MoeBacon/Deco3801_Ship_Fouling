import { api } from '../../lib/api'
import { getVideoFrames } from '../import/api'
import type { AnalysisLoadResult, DetectionResponse } from './types'

export async function loadAnalysisByVideoId(videoId: string, signal?: AbortSignal): Promise<AnalysisLoadResult> {
  const frames = await getVideoFrames(videoId, signal)
  return { frames }
}

export async function getFrameDetections(frameId: string, signal?: AbortSignal): Promise<DetectionResponse[]> {
  const requestConfig = signal ? { signal } : undefined
  const { data } = await api.get<unknown>(`/frames/${frameId}/detections`, requestConfig)
  if (!Array.isArray(data)) throw new Error('Invalid detections response format.')
  return data.filter(
    (item): item is DetectionResponse =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as { detection_id?: unknown }).detection_id === 'string' &&
      typeof (item as { frame_id?: unknown }).frame_id === 'string' &&
      typeof (item as { class_label?: unknown }).class_label === 'string' &&
      typeof (item as { confidence?: unknown }).confidence === 'number',
  )
}
