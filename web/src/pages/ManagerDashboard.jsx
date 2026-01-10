import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LogOut, Users, Clock, Package, MapPin, Phone, FileText,
  Trash2, CheckCircle, Settings, Copy, History, X, AlertTriangle,
  LayoutDashboard, Mountain, Map
} from 'lucide-react';

const WASTE_ICONS = {
  cardboard: '📦',
  glass: '🍾',
  plastic: '♻️',
  trash: '🗑️',
};

const ManagerDashboard = () => {
  const {
    user, companyCode, companyName, pickupRequests, logout,
    removePickupRequest, markRequestAsProcessed, fetchCompanyClients
  } = useAuth();
  const navigate = useNavigate();

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [clients, setClients] = useState([]);
  const [showClients, setShowClients] = useState(false);

  const pendingRequests = pickupRequests.filter(r => r.status === 'pending');
  const urgentCount = pendingRequests.filter(r => r.urgency === '24h').length;
  const mediumCount = pendingRequests.filter(r => r.urgency === '48h').length;

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const data = await fetchCompanyClients();
    setClients(data);
  };

  const handleLogout = () => {
    if (window.confirm('Da li ste sigurni da zelite da se odjavite?')) {
      logout();
      navigate('/');
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(companyCode);
    alert('Kod je kopiran!');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Da li ste sigurni da zelite da obrisete ovaj zahtev?')) {
      try {
        await removePickupRequest(id);
        setSelectedRequest(null);
      } catch (error) {
        alert('Greska pri brisanju zahteva');
      }
    }
  };

  const handleProcessed = async (request) => {
    if (window.confirm('Da li je zahtev obradjen?')) {
      try {
        await markRequestAsProcessed(request);
        setSelectedRequest(null);
      } catch (error) {
        alert('Greska pri obradi zahteva');
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeRemaining = (createdAt, urgency) => {
    const created = new Date(createdAt);
    let hours = 24;
    if (urgency === '48h') hours = 48;
    if (urgency === '72h') hours = 72;
    const deadline = new Date(created.getTime() + hours * 60 * 60 * 1000);
    const now = new Date();
    const diff = deadline - now;

    if (diff <= 0) return 'Isteklo';

    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${h}h ${m}m`;
  };

  const getUrgencyClass = (urgency) => {
    switch (urgency) {
      case '24h': return 'urgent';
      case '48h': return 'warning';
      default: return 'success';
    }
  };

  // Sort by remaining time
  const sortedRequests = [...pendingRequests].sort((a, b) => {
    const getTimeLeft = (req) => {
      const created = new Date(req.created_at);
      let hours = req.urgency === '48h' ? 48 : req.urgency === '72h' ? 72 : 24;
      return new Date(created.getTime() + hours * 60 * 60 * 1000) - new Date();
    };
    return getTimeLeft(a) - getTimeLeft(b);
  });

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
            <a href="#" className="nav-item active">
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
              {urgentCount > 0 && <span className="badge">{urgentCount}</span>}
            </a>
            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate('/map'); }}>
              <Map size={20} />
              <span>Mapa klijenata</span>
            </a>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">Upravljanje</div>
            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); setShowClients(true); }}>
              <Users size={20} />
              <span>Klijenti</span>
            </a>
            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate('/history'); }}>
              <History size={20} />
              <span>Istorija</span>
            </a>
            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); setShowSettings(true); }}>
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
      <main className="main-content">
        <header className="page-header">
          <div>
            <h1>Dashboard</h1>
            <p>Pregled aktivnih zahteva za preuzimanje</p>
          </div>
          <div className="header-actions">
            <div className="company-code-badge">
              <span>Kod firme:</span>
              <strong>{companyCode}</strong>
              <button onClick={handleCopyCode} title="Kopiraj kod">
                <Copy size={16} />
              </button>
            </div>
          </div>
        </header>

        <div className="page-content">
          {/* Stats Row */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-icon green">
                <Package size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{pendingRequests.length}</div>
                <div className="stat-label">Ukupno zahteva</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red">
                <AlertTriangle size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{urgentCount}</div>
                <div className="stat-label">Hitno (24h)</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon orange">
                <Clock size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{mediumCount}</div>
                <div className="stat-label">Srednje (48h)</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon blue">
                <Users size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{clients.length}</div>
                <div className="stat-label">Klijenata</div>
              </div>
            </div>
          </div>

          {/* Requests Table */}
          <div className="content-card">
            <div className="card-header">
              <div>
                <h2>Aktivni zahtevi</h2>
                <p>Sortirano po preostalom vremenu</p>
              </div>
            </div>

            {sortedRequests.length === 0 ? (
              <div className="empty-state">
                <CheckCircle size={56} />
                <h3>Nema aktivnih zahteva</h3>
                <p>Svi zahtevi su obradjeni</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Klijent</th>
                      <th>Adresa</th>
                      <th>Tip otpada</th>
                      <th>Popunjenost</th>
                      <th>Hitnost</th>
                      <th>Preostalo</th>
                      <th>Akcije</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRequests.map(request => (
                      <tr key={request.id} onClick={() => setSelectedRequest(request)}>
                        <td>
                          <div className="cell-main">{request.client_name}</div>
                          <div className="cell-sub">{request.client_phone}</div>
                        </td>
                        <td>{request.client_address}</td>
                        <td>
                          <div className="cell-with-icon">
                            <span>{WASTE_ICONS[request.waste_type] || '📦'}</span>
                            <span>{request.waste_label}</span>
                          </div>
                        </td>
                        <td>
                          <div className="cell-progress">
                            <div className="progress-bar">
                              <div className="fill" style={{ width: `${request.fill_level}%` }}></div>
                            </div>
                            <span>{request.fill_level}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`cell-badge ${getUrgencyClass(request.urgency)}`}>
                            {request.urgency}
                          </span>
                        </td>
                        <td>
                          <div className={`cell-with-icon ${getUrgencyClass(request.urgency)}`} style={{ color: request.urgency === '24h' ? 'var(--red)' : request.urgency === '48h' ? 'var(--orange)' : 'var(--primary)' }}>
                            <Clock size={14} />
                            <span style={{ fontWeight: 500 }}>{getTimeRemaining(request.created_at, request.urgency)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="cell-actions">
                            <button
                              className="btn-icon success"
                              onClick={(e) => { e.stopPropagation(); handleProcessed(request); }}
                              title="Oznaci kao obradjeno"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              className="btn-icon danger"
                              onClick={(e) => { e.stopPropagation(); handleDelete(request.id); }}
                              title="Obrisi zahtev"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {WASTE_ICONS[selectedRequest.waste_type] || '📦'} {selectedRequest.client_name}
              </h3>
              <button className="modal-close" onClick={() => setSelectedRequest(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-group">
                <div className="detail-label">Kontakt informacije</div>
                <div className="detail-item">
                  <MapPin size={18} />
                  <span>{selectedRequest.client_address}</span>
                </div>
                <div className="detail-item">
                  <Phone size={18} />
                  <a href={`tel:${selectedRequest.client_phone}`}>{selectedRequest.client_phone}</a>
                </div>
              </div>

              <div className="detail-group">
                <div className="detail-label">Detalji zahteva</div>
                <div className="detail-item">
                  <Package size={18} />
                  <span>Tip: {selectedRequest.waste_label}</span>
                </div>
                <div className="detail-item">
                  <span>Popunjenost: {selectedRequest.fill_level}%</span>
                </div>
                <div className="detail-item">
                  <span className={`cell-badge ${getUrgencyClass(selectedRequest.urgency)}`}>
                    {selectedRequest.urgency}
                  </span>
                </div>
              </div>

              {selectedRequest.note && (
                <div className="detail-note">"{selectedRequest.note}"</div>
              )}

              <div className="detail-group" style={{ marginTop: 20 }}>
                <div className="detail-item">
                  <Clock size={18} />
                  <span>Kreirano: {formatDate(selectedRequest.created_at)}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-danger" onClick={() => handleDelete(selectedRequest.id)}>
                <Trash2 size={18} />
                Obrisi
              </button>
              <button className="btn btn-success" onClick={() => handleProcessed(selectedRequest)}>
                <CheckCircle size={18} />
                Obradjen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Settings size={20} /> Podesavanja</h3>
              <button className="modal-close" onClick={() => setShowSettings(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-group">
                <div className="detail-label">Informacije o firmi</div>
                <div className="settings-item">
                  <span className="label">Naziv</span>
                  <span className="value">{companyName}</span>
                </div>
                <div className="settings-item">
                  <span className="label">Kod firme</span>
                  <div className="code-copy">
                    <code>{companyCode}</code>
                    <button onClick={handleCopyCode}><Copy size={14} /></button>
                  </div>
                </div>
                <div className="settings-item">
                  <span className="label">Menadzer</span>
                  <span className="value">{user?.name}</span>
                </div>
              </div>

              <div className="info-banner">
                <AlertTriangle size={18} />
                <p>Podelite kod firme sa klijentima da bi se povezali sa vama i slali zahteve za preuzimanje.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-danger" onClick={handleLogout}>
                <LogOut size={18} />
                Odjavi se
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clients Modal */}
      {showClients && (
        <div className="modal-overlay" onClick={() => setShowClients(false)}>
          <div className="modal wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Users size={20} /> Moji klijenti ({clients.length})</h3>
              <button className="modal-close" onClick={() => setShowClients(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {clients.length === 0 ? (
                <div className="empty-state">
                  <Users size={48} />
                  <h3>Nemate registrovanih klijenata</h3>
                  <p>Klijenti ce se pojaviti ovde kada se registruju sa vašim kodom firme</p>
                </div>
              ) : (
                <div className="clients-grid">
                  {clients.map(client => (
                    <div key={client.id} className="client-card">
                      <div className="client-avatar">{client.name?.charAt(0) || 'K'}</div>
                      <div className="client-details">
                        <div className="client-name">{client.name}</div>
                        <div className="client-address">
                          <MapPin size={12} />
                          {client.address}
                        </div>
                        <a href={`tel:${client.phone}`} className="client-phone">
                          <Phone size={12} />
                          {client.phone}
                        </a>
                        {client.equipment_types?.length > 0 && (
                          <div className="equipment-tags">
                            {client.equipment_types.map((eq, i) => (
                              <span key={i} className="equipment-tag">{eq}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
