import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import DashboardPage from './DashboardPage'
import { UPLOAD_DRAFT_STORAGE_KEY, UPLOAD_HISTORY_STORAGE_KEY } from '../lib/uploadDraft'

function setVersionedLocal(key: string, data: unknown) {
  window.localStorage.setItem(
    key,
    JSON.stringify({
      version: 1,
      saved_at: new Date().toISOString(),
      data,
    }),
  )
}

describe('DashboardPage', () => {
  it('renders latest local upload with vessel metadata', () => {
    const latest = {
      ok: true,
      vessel: {
        vessel_name: 'Titanic',
        inspection_date: '2026-05-09',
        operator_name: 'Ansh',
        location: 'Gold Coast',
        notes: '',
      },
      file: {
        client_filename: 'sample.mp4',
        content_type: 'video/mp4',
        size_bytes: 1000,
      },
      video_id: 'video-1',
      job: { video_id: 'video-1', status: 'done', frame_count: 1, duration: 10 },
      frames: [
        {
          frame_id: 'f-1',
          video_id: 'video-1',
          frame_number: 1,
          timestamp_in_video: 1,
          image_url: 'https://example.com/f1.jpg',
        },
      ],
    }

    setVersionedLocal(UPLOAD_DRAFT_STORAGE_KEY, { vessel: latest.vessel, result: latest })
    setVersionedLocal(UPLOAD_HISTORY_STORAGE_KEY, [latest])

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    expect(screen.getByText(/latest local upload/i)).toBeInTheDocument()
    expect(screen.getAllByText(/titanic/i).length).toBeGreaterThan(0)
  })

  it('shows previous analyses when history has multiple entries', () => {
    const mkEntry = (id: string, vessel: string) => ({
      ok: true,
      vessel: {
        vessel_name: vessel,
        inspection_date: '2026-05-09',
        operator_name: 'Operator',
        location: 'Port',
        notes: '',
      },
      file: {
        client_filename: `${id}.mp4`,
        content_type: 'video/mp4',
        size_bytes: 1000,
      },
      video_id: id,
      job: { video_id: id, status: 'done', frame_count: 1, duration: 10 },
      frames: [
        {
          frame_id: `${id}-f1`,
          video_id: id,
          frame_number: 1,
          timestamp_in_video: 1,
          image_url: 'https://example.com/frame.jpg',
        },
      ],
    })

    const latest = mkEntry('video-1', 'Vessel A')
    const older = mkEntry('video-2', 'Vessel B')
    setVersionedLocal(UPLOAD_DRAFT_STORAGE_KEY, { vessel: latest.vessel, result: latest })
    setVersionedLocal(UPLOAD_HISTORY_STORAGE_KEY, [latest, older])

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    expect(screen.getByText(/previous analyses/i)).toBeInTheDocument()
    expect(screen.getByText(/vessel b/i)).toBeInTheDocument()
  })
})
