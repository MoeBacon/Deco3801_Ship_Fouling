import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import AnalysisPage from './AnalysisPage'

const { mockLoadAnalysisByVideoId, mockGetFrameDetections } = vi.hoisted(() => ({
  mockLoadAnalysisByVideoId: vi.fn(),
  mockGetFrameDetections: vi.fn(),
}))

vi.mock('../features/analysis/api', () => ({
  loadAnalysisByVideoId: mockLoadAnalysisByVideoId,
  getFrameDetections: mockGetFrameDetections,
}))

describe('AnalysisPage', () => {
  it('shows guidance when no route state and no video id', async () => {
    render(
      <MemoryRouter initialEntries={['/analysis']}>
        <Routes>
          <Route path="/analysis" element={<AnalysisPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText(/no analysis run is selected/i)).toBeInTheDocument()
  })

  it('loads frames from video id route param', async () => {
    mockLoadAnalysisByVideoId.mockResolvedValueOnce({
      frames: [
        {
          frame_id: 'f-1',
          video_id: 'video-1',
          frame_number: 1,
          timestamp_in_video: 5,
          image_url: 'https://example.com/frame.jpg',
          enhancement_applied: null,
        },
      ],
    })
    mockGetFrameDetections.mockResolvedValueOnce([])

    render(
      <MemoryRouter initialEntries={['/analysis/video-1']}>
        <Routes>
          <Route path="/analysis/:videoId" element={<AnalysisPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(mockLoadAnalysisByVideoId).toHaveBeenCalledWith('video-1', expect.any(AbortSignal))
    })

    expect(screen.getByText(/#1 · 0:05/i)).toBeInTheDocument()
  })
})
