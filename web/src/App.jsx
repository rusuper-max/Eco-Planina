import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import {
  AuthProvider,
  DataProvider,
  ChatProvider,
  CompanyProvider,
  AdminProvider,
  NotificationProvider,
  HelpModeProvider,
  useAuthOnly as useAuth
} from './context';
import './index.css';

// =============================================================================
// Lazy-loaded components - Code Splitting
// Each becomes a separate chunk, loaded only when needed
// =============================================================================

// Public pages - small, load immediately
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));

// Role-specific dashboards - large, load on demand
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DriverDashboard = lazy(() => import('./pages/DriverDashboard'));
const Debug = lazy(() => import('./pages/Debug'));

// PWA components
const PWAInstallPrompt = lazy(() => import('./components/pwa/PWAInstallPrompt'));

// =============================================================================
// Loading Spinner Component
// =============================================================================

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full" />
      <p className="text-slate-500 text-sm">Učitavanje...</p>
    </div>
  </div>
);

// =============================================================================
// Route Guards
// =============================================================================

const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (user) {
    if (user.role === 'developer' || user.role === 'admin') return <Navigate to="/admin" replace />;
    else if (user.role === 'company_admin') return <Navigate to="/company-admin" replace />;
    else if (user.role === 'supervisor') return <Navigate to="/supervisor" replace />;
    else if (user.role === 'manager') return <Navigate to="/manager" replace />;
    else if (user.role === 'driver') return <Navigate to="/driver" replace />;
    else return <Navigate to="/client" replace />;
  }
  return children;
};

// =============================================================================
// App Routes with Suspense
// =============================================================================

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/debug" element={<Debug />} />
        <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/company-admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/supervisor" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/manager" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/driver" element={<ProtectedRoute><DriverDashboard /></ProtectedRoute>} />
        <Route path="/client" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

// =============================================================================
// Main App Component
// =============================================================================

export default function App() {
  // Debug page outside of AuthProvider to bypass auth loading
  if (window.location.pathname === '/debug') {
    return (
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/debug" element={<Debug />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <NotificationProvider>
            <ChatProvider>
              <CompanyProvider>
                <AdminProvider>
                  <HelpModeProvider>
                    <AppRoutes />
                    <Toaster
                      position="top-center"
                      toastOptions={{
                        duration: 3000,
                        style: {
                          background: '#1e293b',
                          color: '#f1f5f9',
                        },
                        success: {
                          iconTheme: { primary: '#10b981', secondary: '#f1f5f9' },
                        },
                        error: {
                          iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' },
                          duration: 4000,
                        },
                      }}
                    />
                    {/* PWA Install Prompt */}
                    <Suspense fallback={null}>
                      <PWAInstallPrompt />
                    </Suspense>
                  </HelpModeProvider>
                </AdminProvider>
              </CompanyProvider>
            </ChatProvider>
          </NotificationProvider>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
