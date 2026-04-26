import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { DashboardPage } from './pages/DashboardPage'
import { JourneysPage } from './pages/JourneysPage'
import { NewJourneyPage } from './pages/NewJourneyPage'
import { AssignmentPage } from './pages/AssignmentPage'
import { LearningPlanPage } from './pages/LearningPlanPage'
import { useEffect } from 'react'
import { Spinner } from './components/ui/Spinner'

const RedirectToLatest = ({ type }: { type: 'assignment' | 'learning-plan' }) => {
  const { session } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/journeys', {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        })
        if (response.ok) {
          const journeys = await response.json()
          if (journeys && Array.isArray(journeys) && journeys.length > 0) {
            navigate(`/${type}/${journeys[0].id}`, { replace: true })
          } else {
            navigate('/journeys', { replace: true })
          }
        } else {
          // If response is not ok (e.g., 404, 500), fallback to journeys list
          navigate('/journeys', { replace: true })
        }
      } catch (error) {
        console.error('Error fetching latest journey:', error)
        navigate('/journeys', { replace: true })
      }
    }

    if (session) {
      fetchLatest()
    }
  }, [session, navigate, type])

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner size="lg" />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/journeys" element={<JourneysPage />} />
            <Route path="/journeys/new" element={<NewJourneyPage />} />
            <Route path="/assignment" element={<RedirectToLatest type="assignment" />} />
            <Route path="/assignment/:journeyId" element={<AssignmentPage />} />
            <Route path="/learning-plan" element={<RedirectToLatest type="learning-plan" />} />
            <Route path="/learning-plan/:journeyId" element={<LearningPlanPage />} />
            {/* Redirect /app or other unknown routes to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
