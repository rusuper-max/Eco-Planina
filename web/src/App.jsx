import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ManagerDashboard from './pages/ManagerDashboard';
import ClientDashboard from './pages/ClientDashboard';
import HistoryPage from './pages/HistoryPage';
import MapPage from './pages/MapPage';
import RequestsMapPage from './pages/RequestsMapPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminCompaniesPage from './pages/AdminCompaniesPage';
import AdminCodesPage from './pages/AdminCodesPage';
import './App.css';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner large"></div>
        <p>Ucitavanje...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect based on role
    if (user.role === 'god' || user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (user.role === 'manager') {
      return <Navigate to="/manager" replace />;
    } else {
      return <Navigate to="/client" replace />;
    }
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner large"></div>
        <p>Ucitavanje...</p>
      </div>
    );
  }

  if (user) {
    // Redirect based on role
    if (user.role === 'god' || user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (user.role === 'manager') {
      return <Navigate to="/manager" replace />;
    } else {
      return <Navigate to="/client" replace />;
    }
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['god', 'admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['god', 'admin']}>
            <AdminUsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/companies"
        element={
          <ProtectedRoute allowedRoles={['god', 'admin']}>
            <AdminCompaniesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/codes"
        element={
          <ProtectedRoute allowedRoles={['god', 'admin']}>
            <AdminCodesPage />
          </ProtectedRoute>
        }
      />

      {/* Manager Routes */}
      <Route
        path="/manager"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ManagerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <HistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/map"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <MapPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests-map"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <RequestsMapPage />
          </ProtectedRoute>
        }
      />

      {/* Client Routes */}
      <Route
        path="/client"
        element={
          <ProtectedRoute allowedRoles={['client']}>
            <ClientDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
