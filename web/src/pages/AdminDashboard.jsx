import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import {
  Users, Building2, Key, Shield, UserCheck, RefreshCw
} from 'lucide-react';

const AdminDashboard = () => {
  const { user, logout, getAdminStats, isGod } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Da li ste sigurni da zelite da se odjavite?')) {
      logout();
      navigate('/');
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar
        activeItem="dashboard"
        user={user}
        isGod={isGod()}
        onLogout={handleLogout}
      />

      <main className="main-content">
        <header className="page-header">
          <div>
            <h1>Admin Dashboard</h1>
            <p>Pregled sistema EcoPlanina</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={loadStats} disabled={loading}>
              <RefreshCw size={18} className={loading ? 'spin' : ''} />
              Osvezi
            </button>
          </div>
        </header>

        <div className="page-content">
          {loading ? (
            <div className="empty-state">
              <RefreshCw size={48} className="spin" />
              <p>Ucitavanje statistika...</p>
            </div>
          ) : stats ? (
            <>
              {/* Stats Grid */}
              <div className="admin-stats-grid">
                <div className="admin-stat-card">
                  <div className="stat-icon users">
                    <Users size={26} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{stats.totalUsers}</div>
                    <div className="stat-label">Ukupno korisnika</div>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="stat-icon companies">
                    <Building2 size={26} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{stats.totalCompanies}</div>
                    <div className="stat-label">Registrovanih firmi</div>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="stat-icon codes">
                    <Key size={26} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{stats.totalCodes}</div>
                    <div className="stat-label">Master kodova</div>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="stat-icon available">
                    <Key size={26} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{stats.availableCodes}</div>
                    <div className="stat-label">Slobodnih kodova</div>
                  </div>
                </div>
              </div>

              {/* User breakdown */}
              <div className="content-card" style={{ marginTop: 32 }}>
                <div className="card-header">
                  <h2>Pregled korisnika</h2>
                </div>
                <div className="user-breakdown">
                  <div className="breakdown-item">
                    <div className="breakdown-icon admin">
                      <Shield size={22} />
                    </div>
                    <div className="breakdown-info">
                      <span className="breakdown-value">{stats.totalAdmins}</span>
                      <span className="breakdown-label">Administratora</span>
                    </div>
                  </div>
                  <div className="breakdown-item">
                    <div className="breakdown-icon manager">
                      <UserCheck size={22} />
                    </div>
                    <div className="breakdown-info">
                      <span className="breakdown-value">{stats.totalManagers}</span>
                      <span className="breakdown-label">Menadzera</span>
                    </div>
                  </div>
                  <div className="breakdown-item">
                    <div className="breakdown-icon client">
                      <Users size={22} />
                    </div>
                    <div className="breakdown-info">
                      <span className="breakdown-value">{stats.totalClients}</span>
                      <span className="breakdown-label">Klijenata</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="content-card" style={{ marginTop: 32 }}>
                <div className="card-header">
                  <h2>Brze akcije</h2>
                </div>
                <div className="quick-actions">
                  <button className="action-card" onClick={() => navigate('/admin/codes')}>
                    <Key size={36} />
                    <span>Generiši novi Master Code</span>
                  </button>
                  <button className="action-card" onClick={() => navigate('/admin/users')}>
                    <Users size={36} />
                    <span>Pregledaj korisnike</span>
                  </button>
                  <button className="action-card" onClick={() => navigate('/admin/companies')}>
                    <Building2 size={36} />
                    <span>Pregledaj firme</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <Shield size={64} />
              <h3>Greska pri ucitavanju</h3>
              <p>Pokusajte ponovo</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
