import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';

// Public Pages
import LandingPage from './pages/public/LandingPage';
import VerifyPage from './pages/public/VerifyPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Organization Pages
import DashboardPage from './pages/dashboard/DashboardPage';
import RecipientsPage from './pages/recipients/RecipientsPage';
import CertificatesPage from './pages/certificates/CertificatesPage';
import IssueCertificatePage from './pages/certificates/IssueCertificatePage';
import ProfilePage from './pages/profile/ProfilePage';

// Admin Pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminOrganizationsPage from './pages/admin/AdminOrganizationsPage';
import AdminCertificatesPage from './pages/admin/AdminCertificatesPage';
import AdminAuditPage from './pages/admin/AdminAuditPage';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1a1a25',
              color: '#f1f0ff',
              border: '1px solid #333348',
              borderRadius: '10px',
              fontSize: '0.875rem',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#1a1a25',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#1a1a25',
              },
            },
          }}
        />

        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/verify/:certificateId" element={<VerifyPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Organization Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRole="organization">
                <DashboardLayout>
                  <DashboardPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/recipients"
            element={
              <ProtectedRoute requiredRole="organization">
                <DashboardLayout>
                  <RecipientsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/certificates"
            element={
              <ProtectedRoute requiredRole="organization">
                <DashboardLayout>
                  <CertificatesPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/certificates/issue"
            element={
              <ProtectedRoute requiredRole="organization">
                <DashboardLayout>
                  <IssueCertificatePage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute requiredRole="organization">
                <DashboardLayout>
                  <ProfilePage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Admin Protected Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                  <AdminDashboardPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/organizations"
            element={
              <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                  <AdminOrganizationsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/certificates"
            element={
              <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                  <AdminCertificatesPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                  <AdminAuditPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
