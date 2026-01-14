import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import {
  AuthProvider,
  DataProvider,
  ChatProvider,
  CompanyProvider,
  AdminProvider,
  NotificationProvider,
  useAuthOnly as useAuth
} from './context';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import DriverDashboard from './pages/DriverDashboard';
import Debug from './pages/Debug';
import './index.css';

const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full"></div></div>;
  if (!user) return <Navigate to="/" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full"></div></div>;
  if (user) {
    if (user.role === 'developer' || user.role === 'admin') return <Navigate to="/admin" replace />;
    else if (user.role === 'company_admin') return <Navigate to="/company-admin" replace />;
    else if (user.role === 'manager') return <Navigate to="/manager" replace />;
    else if (user.role === 'driver') return <Navigate to="/driver" replace />;
    else return <Navigate to="/client" replace />;
  }
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/debug" element={<Debug />} />
      <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/company-admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/manager" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/driver" element={<ProtectedRoute><DriverDashboard /></ProtectedRoute>} />
      <Route path="/client" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  // Debug page outside of AuthProvider to bypass auth loading
  if (window.location.pathname === '/debug') {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/debug" element={<Debug />} />
        </Routes>
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
                </AdminProvider>
              </CompanyProvider>
            </ChatProvider>
          </NotificationProvider>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
