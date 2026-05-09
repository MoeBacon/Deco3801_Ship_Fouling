export const ROUTES = {
  login: '/login',
  dashboard: '/dashboard',
  upload: '/upload',
  analysis: '/analysis',
  reports: '/reports',
  analysisByVideo: (videoId: string) => `/analysis/${encodeURIComponent(videoId)}`,
} as const
