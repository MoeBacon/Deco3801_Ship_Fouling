import axios from 'axios'

function isDetailShape(value: unknown): value is { detail?: unknown } {
  return typeof value === 'object' && value !== null && 'detail' in value
}

export function normalizeApiError(error: unknown): string {
  if (axios.isAxiosError(error) && !error.response) {
    return (
      'Could not reach the API (connection refused or no response). ' +
      'Start FastAPI in another terminal: cd Backend -> python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000. ' +
      'Keep npm run dev running so /api is proxied to port 8000.'
    )
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const response = error as { response?: { data?: unknown } }
    const data = response.response?.data
    if (typeof data === 'string') return data
    if (isDetailShape(data)) {
      const detail = data.detail
      if (typeof detail === 'string') return detail
      if (Array.isArray(detail)) {
        return detail
          .map((item) =>
            typeof item === 'object' && item && 'msg' in item
              ? String((item as { msg: string }).msg)
              : String(item),
          )
          .join('; ')
      }
    }
  }

  if (error instanceof Error) return error.message
  return 'Request failed. Verify the backend is running on port 8000.'
}
