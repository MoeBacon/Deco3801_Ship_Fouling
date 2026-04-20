import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from './components/MainLayout'
import { ROUTES } from './lib/routes'
import AnalysisPage from './pages/AnalysisPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import UploadPage from './pages/UploadPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-dvh min-h-0 w-full flex-1 flex-col overflow-hidden">
      <Routes>
        <Route path={ROUTES.login} element={<LoginPage />} />

        <Route element={<MainLayout />}>
          <Route path={ROUTES.dashboard} element={<DashboardPage />} />
          <Route path={ROUTES.upload} element={<UploadPage />} />
          <Route path={ROUTES.analysis} element={<AnalysisPage />} />
          <Route path={`${ROUTES.analysis}/:videoId`} element={<AnalysisPage />} />
        </Route>

        <Route path="/" element={<Navigate to={ROUTES.login} replace />} />
        <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
      </Routes>
      </div>
    </BrowserRouter>
  )
}
