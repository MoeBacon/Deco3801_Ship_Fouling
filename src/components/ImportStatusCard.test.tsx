import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ImportStatusCard from './ImportStatusCard'
import type { ImportInspectionResponse } from '../features/import/types'

const result: ImportInspectionResponse = {
  ok: true,
  vessel: {
    vessel_name: 'Oceanic Explorer',
    inspection_date: '',
    operator_name: '',
    location: '',
    notes: '',
  },
  file: {
    client_filename: 'sample.mp4',
    content_type: 'video/mp4',
    size_bytes: 1200,
  },
  video_id: 'video-123',
  job: {
    video_id: 'video-123',
    status: 'done',
    frame_count: 1,
    duration: 12.5,
  },
  frames: [
    {
      frame_id: 'frame-1',
      video_id: 'video-123',
      frame_number: 1,
      timestamp_in_video: 12.5,
      image_url: 'https://example.com/frame-1.jpg',
      enhancement_applied: null,
    },
  ],
}

describe('ImportStatusCard', () => {
  it('renders completed status details and first frame metadata', () => {
    render(
      <ImportStatusCard
        uploading={false}
        result={result}
        clientFile={null}
        liveJob={null}
        liveStage={null}
        processingDelayElapsed
      />,
    )

    expect(screen.getByText(/server job/i)).toBeInTheDocument()
    expect(screen.getByText(/video-123/i)).toBeInTheDocument()
    expect(screen.getByText(/frame #1 at 0:12/i)).toBeInTheDocument()
  })

  it('shows live processing status before final result', () => {
    render(
      <ImportStatusCard
        uploading
        result={null}
        clientFile={new File(['x'], 'sample.mp4', { type: 'video/mp4' })}
        liveJob={{ video_id: 'live-video', status: 'processing', frame_count: null, duration: null }}
        liveStage="processing"
        processingDelayElapsed={false}
      />,
    )

    expect(screen.getByText(/server job/i)).toBeInTheDocument()
    expect(screen.getAllByText(/processing/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/live-video/i)).toBeInTheDocument()
  })
})
