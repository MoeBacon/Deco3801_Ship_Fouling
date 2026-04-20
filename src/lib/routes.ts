export const ROUTES = {
  login: '/login',
  dashboard: '/dashboard',
  upload: '/upload',
  analysis: '/analysis',
  analysisByVideo: (videoId: string) => `/analysis/${encodeURIComponent(videoId)}`,
} as const
