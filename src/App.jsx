import { AnimatePresence, motion } from 'framer-motion'
import { Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header'
import ProtectedRoute from './components/ProtectedRoute'
import ScrollToTopButton from './components/ScrollToTopButton'
import { useScrollRestoration } from './hooks/useScrollRestoration'
import ApplicationDetailPage from './pages/ApplicationDetailPage'
import CallPage from './pages/CallPage'
import DashboardPage from './pages/DashboardPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import HrApplicationsPage from './pages/HrApplicationsPage'
import HrDashboardPage from './pages/HrDashboardPage'
import HrInterviewsPage from './pages/HrInterviewsPage'
import HrJobsPage from './pages/HrJobsPage'
import InterviewDetailPage from './pages/InterviewDetailPage'
import JobDetailPage from './pages/JobDetailPage'
import JobFormPage from './pages/JobFormPage'
import JobsPage from './pages/JobsPage'
import JoinPage from './pages/JoinPage'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import ProfilePage from './pages/ProfilePage'
import RegisterPage from './pages/RegisterPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import StaffLoginPage from './pages/StaffLoginPage'

// Job posting writes (create/edit) stay hr/admin-only — assistant_hr has
// view-only access to job postings, matching JobPostingPolicy on the
// backend. Every other staff-facing route (dashboard, the jobs list itself,
// applications, interviews) is open to all three staff roles, since
// assistant_hr has full access there, same as hr.
const HR_ROLES = ['hr', 'admin']
const STAFF_ROLES = ['hr', 'assistant_hr', 'admin']
const NO_HEADER_PATHS = ['/login', '/register', '/staff', '/forgot-password', '/reset-password']

function App() {
  const location = useLocation()
  const showHeader =
    !NO_HEADER_PATHS.includes(location.pathname) &&
    !location.pathname.startsWith('/staff/join/') &&
    !location.pathname.endsWith('/call')

  useScrollRestoration()

  return (
    <>
      {showHeader && <Header />}
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          <Routes location={location}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/:id" element={<JobDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/staff" element={<StaffLoginPage />} />
            <Route path="/staff/join/:token" element={<JoinPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={['candidate']}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute roles={['candidate']}>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hr/dashboard"
              element={
                <ProtectedRoute roles={STAFF_ROLES}>
                  <HrDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hr/jobs"
              element={
                <ProtectedRoute roles={STAFF_ROLES}>
                  <HrJobsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hr/jobs/new"
              element={
                <ProtectedRoute roles={HR_ROLES}>
                  <JobFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hr/jobs/:id/edit"
              element={
                <ProtectedRoute roles={HR_ROLES}>
                  <JobFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hr/applications"
              element={
                <ProtectedRoute roles={STAFF_ROLES}>
                  <HrApplicationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hr/interviews"
              element={
                <ProtectedRoute roles={STAFF_ROLES}>
                  <HrInterviewsPage />
                </ProtectedRoute>
              }
            />
            {/* No `roles` — ApplicationPolicy::view()/InterviewPolicy::view()
                allow the record's own candidate as well as any staff member;
                these are also the destinations of the status-change/offer/
                interview-scheduled notification emails, so any authenticated
                role reaching one needs to resolve to something, not a
                role-mismatch redirect. */}
            <Route
              path="/applications/:id"
              element={
                <ProtectedRoute>
                  <ApplicationDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/interviews/:id"
              element={
                <ProtectedRoute>
                  <InterviewDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/interviews/:id/call"
              element={
                <ProtectedRoute>
                  <CallPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
      <ScrollToTopButton />
    </>
  )
}

export default App
