import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import UploadPage from './UploadPage'

const { mockImportInspection } = vi.hoisted(() => ({
  mockImportInspection: vi.fn(),
}))

vi.mock('../features/import/importInspection', () => ({
  importInspection: mockImportInspection,
}))

vi.mock('../components/FootageDropZone', () => ({
  FOOTAGE_MAX_BYTES: 5 * 1024 ** 3,
  default: ({ onFile }: { onFile: (file: File | null) => void }) => (
    <button type="button" onClick={() => onFile(new File(['video'], 'sample.mp4', { type: 'video/mp4' }))}>
      Pick mock file
    </button>
  ),
}))

vi.mock('../components/VesselDetailsForm', () => ({
  default: ({ onChange }: { onChange: (next: { vessel_name: string; inspection_date: string; operator_name: string; location: string; notes: string }) => void }) => (
    <button
      type="button"
      onClick={() =>
        onChange({
          vessel_name: 'Test Vessel',
          inspection_date: '2026-05-09',
          operator_name: 'Operator',
          location: 'Gold Coast',
          notes: '',
        })
      }
    >
      Fill vessel form
    </button>
  ),
}))

vi.mock('../components/ImportStatusCard', () => ({
  default: () => <div>Status card</div>,
}))

describe('UploadPage', () => {
  it('keeps upload action disabled until a file is selected', () => {
    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: /upload video & queue job/i })).toBeDisabled()
  })

  it('shows normalized API error when import fails', async () => {
    mockImportInspection.mockRejectedValueOnce(new Error('Backend unavailable'))

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /pick mock file/i }))
    fireEvent.click(screen.getByRole('button', { name: /fill vessel form/i }))
    fireEvent.click(screen.getByRole('button', { name: /upload video & queue job/i }))

    await waitFor(() => {
      expect(screen.getByText(/backend unavailable/i)).toBeInTheDocument()
    })
  })
})
