import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from './components/MainLayout'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import { ROUTES } from './lib/routes'
import AnalysisPage from './pages/AnalysisPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import ReportsPage from './pages/ReportsPage'
import UploadPage from './pages/UploadPage'

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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="flex h-dvh min-h-0 w-full flex-1 flex-col overflow-hidden">
          <Routes>
            <Route path={ROUTES.login} element={<LoginRoute />} />

            <Route element={<ProtectedLayout />}>
              <Route path={ROUTES.dashboard} element={<DashboardPage />} />
              <Route path={ROUTES.upload} element={<UploadPage />} />
              <Route path={ROUTES.analysis} element={<AnalysisPage />} />
              <Route path={`${ROUTES.analysis}/:videoId`} element={<AnalysisPage />} />
              <Route path={ROUTES.reports} element={<ReportsPage />} />
            </Route>

            <Route path="/" element={<Navigate to={ROUTES.login} replace />} />
            <Route path="*" element={<Navigate to={ROUTES.login} replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
