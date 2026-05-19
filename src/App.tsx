import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from './components/MainLayout'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import { useImportInProgress } from './hooks/useImportInProgress'
import { ROUTES } from './lib/routes'
import LoginPage from './pages/LoginPage'

const AnalysisPage = lazy(() => import('./pages/AnalysisPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const UploadPage = lazy(() => import('./pages/UploadPage'))

function ProtectedLayout() {
  const auth = useAuth()
  if (!auth.isAuthenticated) {
    return <Navigate to={ROUTES.login} replace />
  }
  return <MainLayout />
}

function LoginRoute() {
  const auth = useAuth()
  if (auth.isAuthenticated) {
    return <Navigate to={ROUTES.dashboard} replace />
  }
  return <LoginPage />
}

function ReportsRoute() {
  const importInProgress = useImportInProgress()
  if (importInProgress) {
    return <Navigate to={ROUTES.upload} replace />
  }
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted">Loading page...</div>}>
      <ReportsPage />
    </Suspense>
  )
}

function AnalysisRoute() {
  const importInProgress = useImportInProgress()
  if (importInProgress) {
    return <Navigate to={ROUTES.upload} replace />
  }
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted">Loading page...</div>}>
      <AnalysisPage />
    </Suspense>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="flex h-dvh min-h-0 w-full flex-1 flex-col overflow-hidden">
          <Routes>
            <Route path={ROUTES.login} element={<LoginRoute />} />

            <Route element={<ProtectedLayout />}>
              <Route
                path={ROUTES.dashboard}
                element={
                  <Suspense fallback={<div className="p-6 text-sm text-muted">Loading page...</div>}>
                    <DashboardPage />
                  </Suspense>
                }
              />
              <Route
                path={ROUTES.upload}
                element={
                  <Suspense fallback={<div className="p-6 text-sm text-muted">Loading page...</div>}>
                    <UploadPage />
                  </Suspense>
                }
              />
              <Route path={ROUTES.analysis} element={<AnalysisRoute />} />
              <Route path={`${ROUTES.analysis}/:videoId`} element={<AnalysisRoute />} />
              <Route
                path={ROUTES.reports}
                element={<ReportsRoute />}
              />
            </Route>

            <Route path="/" element={<Navigate to={ROUTES.login} replace />} />
            <Route path="*" element={<Navigate to={ROUTES.login} replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
