import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Download, Calendar, RefreshCw, LayoutDashboard, Users, History,
  Settings, LogOut, Mountain, Map, Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const HistoryPage = () => {
  const { user, companyName, logout, fetchProcessedRequests, fetchCompanyClients } = useAuth();
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedClient, setSelectedClient] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [historyData, clientsData] = await Promise.all([
        fetchProcessedRequests(),
        fetchCompanyClients(),
      ]);
      setHistory(historyData);
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (startDate) filters.startDate = new Date(startDate).toISOString();
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filters.endDate = end.toISOString();
      }
      if (selectedClient) filters.clientId = selectedClient;

      const data = await fetchProcessedRequests(filters);
      setHistory(data);
    } catch (error) {
      console.error('Error applying filters:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedClient('');
    loadData();
  };

  const handleLogout = () => {
    if (window.confirm('Da li ste sigurni da zelite da se odjavite?')) {
      logout();
      navigate('/');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('sr-RS', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleExportExcel = () => {
    if (history.length === 0) {
      alert('Nema podataka za izvoz');
      return;
    }

    const excelData = history.map(item => ({
      'Datum': formatDate(item.processed_at),
      'Vreme': formatTime(item.processed_at),
      'Klijent': item.client_name || '',
      'Adresa': item.client_address || '',
      'Tip otpada': item.waste_label || item.waste_type || '',
      'Popunjenost': item.fill_level ? `${item.fill_level}%` : '',
      'Hitnost': item.urgency || '',
      'Napomena': item.note || '',
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Istorija');

    ws['!cols'] = [
      { wch: 12 }, { wch: 8 }, { wch: 25 }, { wch: 35 },
      { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 30 },
    ];

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const dateStr = startDate && endDate ? `${startDate}_${endDate}` : 'svi_podaci';
    saveAs(blob, `EcoPlanina_istorija_${dateStr}.xlsx`);
  };

  const hasActiveFilters = startDate || endDate || selectedClient;

  const getUrgencyClass = (urgency) => {
    switch (urgency) {
      case '24h': return 'urgent';
      case '48h': return 'warning';
      default: return 'success';
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
            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate('/map'); }}>
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
            <a href="#" className="nav-item active">
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
      <main className="main-content">
        <header className="page-header">
          <div>
            <h1>Istorija preuzimanja</h1>
            <p>Pregled svih obradjenih zahteva</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-primary" onClick={handleExportExcel} disabled={history.length === 0}>
              <Download size={18} />
              Izvezi Excel
            </button>
          </div>
        </header>

        <div className="page-content">
          {/* Filters Card */}
          <div className="content-card" style={{ marginBottom: 20 }}>
            <div className="filters-bar">
              <div className="filter-group">
                <label>Od datuma</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label>Do datuma</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label>Klijent</label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                >
                  <option value="">Svi klijenti</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>

              <div className="quick-filters">
                <button className="quick-btn" onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setStartDate(today);
                  setEndDate(today);
                }}>Danas</button>
                <button className="quick-btn" onClick={() => {
                  const today = new Date();
                  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                  setStartDate(weekAgo.toISOString().split('T')[0]);
                  setEndDate(today.toISOString().split('T')[0]);
                }}>7 dana</button>
                <button className="quick-btn" onClick={() => {
                  const today = new Date();
                  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                  setStartDate(monthAgo.toISOString().split('T')[0]);
                  setEndDate(today.toISOString().split('T')[0]);
                }}>30 dana</button>
              </div>

              <div className="filter-actions">
                {hasActiveFilters && (
                  <button className="btn btn-secondary" onClick={clearFilters}>
                    Obrisi filtere
                  </button>
                )}
                <button className="btn btn-primary" onClick={applyFilters}>
                  Primeni
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="history-stats">
            <div className="history-stat">
              <div className="value">{history.length}</div>
              <div className="label">Ukupno obradjeno</div>
            </div>
          </div>

          {/* History Table */}
          <div className="content-card">
            <div className="card-header">
              <h2>Obradjeni zahtevi</h2>
            </div>

            {loading ? (
              <div className="empty-state">
                <RefreshCw size={40} className="spin" />
                <p>Ucitavanje...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="empty-state">
                <Calendar size={56} />
                <h3>Nema istorije</h3>
                <p>Obradjeni zahtevi ce se prikazati ovde</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Datum</th>
                      <th>Klijent</th>
                      <th>Adresa</th>
                      <th>Tip otpada</th>
                      <th>Popunjenost</th>
                      <th>Hitnost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(item => (
                      <tr key={item.id}>
                        <td>
                          <div className="cell-main">{formatDate(item.processed_at)}</div>
                          <div className="cell-sub">{formatTime(item.processed_at)}</div>
                        </td>
                        <td>
                          <div className="cell-main">{item.client_name}</div>
                        </td>
                        <td>{item.client_address}</td>
                        <td>{item.waste_label || item.waste_type}</td>
                        <td>
                          {item.fill_level && (
                            <div className="cell-progress">
                              <div className="progress-bar">
                                <div className="fill" style={{ width: `${item.fill_level}%` }}></div>
                              </div>
                              <span>{item.fill_level}%</span>
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`cell-badge ${getUrgencyClass(item.urgency)}`}>
                            {item.urgency}
                          </span>
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
    </div>
  );
};

export default HistoryPage;
