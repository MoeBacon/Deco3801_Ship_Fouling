import type { FrameResponse, ImportInspectionResponse } from '../import/types'

export type { FrameResponse, ImportInspectionResponse }

export type DetectionResponse = {
  detection_id: string
  frame_id: string
  class_label: string
  confidence: number
}

export type AnalysisLoadResult = {
  frames: FrameResponse[]
}
