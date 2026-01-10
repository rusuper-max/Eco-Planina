import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LogOut, Users, History, Settings, Mountain, Map, MapPin, Phone,
  LayoutDashboard, X
} from 'lucide-react';

const MapPage = () => {
  const { user, companyName, logout, fetchCompanyClients } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const data = await fetchCompanyClients();
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
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
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-icon">
              <Mountain size={24} />
            </div>
            <div>
              <h1>EcoPlanina</h1>
              <p>{companyName}</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Glavna</div>
            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate('/manager'); }}>
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </a>
            <a href="#" className="nav-item active">
              <Map size={20} />
              <span>Mapa klijenata</span>
            </a>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">Upravljanje</div>
            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate('/manager'); }}>
              <Users size={20} />
              <span>Klijenti</span>
            </a>
            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate('/history'); }}>
              <History size={20} />
              <span>Istorija</span>
            </a>
            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate('/manager'); }}>
              <Settings size={20} />
              <span>Podesavanja</span>
            </a>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{user?.name?.charAt(0) || 'M'}</div>
            <div className="user-info">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">Menadzer</span>
            </div>
            <button className="logout-btn-icon" onClick={handleLogout} title="Odjavi se">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <header className="page-header">
          <div>
            <h1>Mapa klijenata</h1>
            <p>Pregled lokacija svih klijenata</p>
          </div>
        </header>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Map Area */}
          <div className="map-wrapper" style={{ flex: 1 }}>
            <div className="map-placeholder">
              <Map size={64} />
              <h3>Mapa ce biti ovde</h3>
              <p>Integracija sa Google Maps ili OpenStreetMap</p>
            </div>
          </div>

          {/* Clients Sidebar */}
          <div className="map-sidebar">
            <div className="map-sidebar-header">
              <h3>Klijenti ({clients.length})</h3>
            </div>
            <div className="map-client-list">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-500)' }}>
                  Ucitavanje...
                </div>
              ) : clients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-500)' }}>
                  Nema registrovanih klijenata
                </div>
              ) : (
                clients.map(client => (
                  <div
                    key={client.id}
                    className={`map-client-item ${selectedClient?.id === client.id ? 'active' : ''}`}
                    onClick={() => setSelectedClient(client)}
                  >
                    <h4>{client.name}</h4>
                    <p>
                      <MapPin size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                      {client.address}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Client Detail Modal */}
      {selectedClient && (
        <div className="modal-overlay" onClick={() => setSelectedClient(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedClient.name}</h3>
              <button className="modal-close" onClick={() => setSelectedClient(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-group">
                <div className="detail-label">Lokacija</div>
                <div className="detail-item">
                  <MapPin size={18} />
                  <span>{selectedClient.address}</span>
                </div>
              </div>
              <div className="detail-group">
                <div className="detail-label">Kontakt</div>
                <div className="detail-item">
                  <Phone size={18} />
                  <a href={`tel:${selectedClient.phone}`}>{selectedClient.phone}</a>
                </div>
              </div>
              {selectedClient.equipment_types?.length > 0 && (
                <div className="detail-group">
                  <div className="detail-label">Oprema</div>
                  <div className="equipment-tags" style={{ paddingTop: 8 }}>
                    {selectedClient.equipment_types.map((eq, i) => (
                      <span key={i} className="equipment-tag">{eq}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPage;
