import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  LogOut, Users, Clock, Package, MapPin, Phone, FileText,
  Trash2, CheckCircle, Settings, Copy, History, X, AlertTriangle,
  LayoutDashboard, Mountain, Map, Filter, Printer, Plus, Edit2, Save, Wrench, Menu
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
    removePickupRequest, markRequestAsProcessed, fetchCompanyClients,
    fetchCompanyEquipmentTypes, updateCompanyEquipmentTypes, updateClientDetails
  } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [clients, setClients] = useState([]);
  const [showClients, setShowClients] = useState(false);
  const [showEquipment, setShowEquipment] = useState(false);

  // Handle tab query parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'equipment') {
      setShowEquipment(true);
      setSearchParams({});
    } else if (tab === 'settings') {
      setShowSettings(true);
      setSearchParams({});
    } else if (tab === 'clients') {
      setShowClients(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [newEquipmentType, setNewEquipmentType] = useState('');

  // Filter states
  const [filterClient, setFilterClient] = useState('');
  const [filterWasteType, setFilterWasteType] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Edit client states
  const [editingClient, setEditingClient] = useState(null);
  const [clientNote, setClientNote] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState([]);

  // Mobile menu state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const printRef = useRef();

  const pendingRequests = pickupRequests.filter(r => r.status === 'pending');
  const urgentCount = pendingRequests.filter(r => r.urgency === '24h').length;
  const mediumCount = pendingRequests.filter(r => r.urgency === '48h').length;

  useEffect(() => {
    loadClients();
    loadEquipmentTypes();
  }, []);

  const loadClients = async () => {
    const data = await fetchCompanyClients();
    setClients(data);
  };

  const loadEquipmentTypes = async () => {
    const types = await fetchCompanyEquipmentTypes();
    setEquipmentTypes(types || []);
  };

  const handleLogout = () => {
    if (window.confirm('Da li ste sigurni da zelite da se odjavite?')) {
      logout();
      navigate('/');
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(companyCode);
    toast.success('Kod je kopiran!');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Da li ste sigurni da zelite da obrisete ovaj zahtev?')) {
      try {
        await removePickupRequest(id);
        setSelectedRequest(null);
        toast.success('Zahtev je obrisan');
      } catch (error) {
        toast.error('Greska pri brisanju zahteva');
      }
    }
  };

  const handleProcessed = async (request) => {
    if (window.confirm('Da li je zahtev obradjen?')) {
      try {
        await markRequestAsProcessed(request);
        setSelectedRequest(null);
        toast.success('Zahtev je oznacen kao obradjen');
      } catch (error) {
        toast.error('Greska pri obradi zahteva');
      }
    }
  };

  // Equipment management
  const handleAddEquipment = async () => {
    if (!newEquipmentType.trim()) return;
    try {
      const newTypes = [...equipmentTypes, newEquipmentType.trim()];
      await updateCompanyEquipmentTypes(newTypes);
      setEquipmentTypes(newTypes);
      setNewEquipmentType('');
      toast.success('Oprema je dodata');
    } catch (error) {
      toast.error('Greska pri dodavanju opreme');
    }
  };

  const handleDeleteEquipment = async (type) => {
    if (!window.confirm(`Da li ste sigurni da zelite da obrisete "${type}"?`)) return;
    try {
      const newTypes = equipmentTypes.filter(t => t !== type);
      await updateCompanyEquipmentTypes(newTypes);
      setEquipmentTypes(newTypes);
      toast.success('Oprema je obrisana');
    } catch (error) {
      toast.error('Greska pri brisanju opreme');
    }
  };

  // Client editing
  const handleEditClient = (client) => {
    setEditingClient(client);
    setClientNote(client.manager_note || '');
    setSelectedEquipment(client.equipment_types || []);
  };

  const toggleEquipmentForClient = (type) => {
    setSelectedEquipment(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleSaveClientDetails = async () => {
    if (!editingClient) return;
    try {
      await updateClientDetails(editingClient.id, selectedEquipment, clientNote);
      setClients(clients.map(c =>
        c.id === editingClient.id
          ? { ...c, equipment_types: selectedEquipment, manager_note: clientNote }
          : c
      ));
      setEditingClient(null);
      toast.success('Izmene su sacuvane');
    } catch (error) {
      toast.error('Greska pri cuvanju izmena');
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

  // Get unique waste types from requests
  const uniqueWasteTypes = useMemo(() => {
    const types = new Set(pendingRequests.map(r => r.waste_type));
    return Array.from(types);
  }, [pendingRequests]);

  // Get unique client names from requests
  const uniqueClients = useMemo(() => {
    const names = new Set(pendingRequests.map(r => r.client_name));
    return Array.from(names);
  }, [pendingRequests]);

  // Filtered and sorted requests
  const filteredRequests = useMemo(() => {
    let filtered = [...pendingRequests];

    if (filterClient) {
      filtered = filtered.filter(r => r.client_name === filterClient);
    }
    if (filterWasteType) {
      filtered = filtered.filter(r => r.waste_type === filterWasteType);
    }
    if (filterUrgency) {
      filtered = filtered.filter(r => r.urgency === filterUrgency);
    }

    // Sort by remaining time
    return filtered.sort((a, b) => {
      const getTimeLeft = (req) => {
        const created = new Date(req.created_at);
        let hours = req.urgency === '48h' ? 48 : req.urgency === '72h' ? 72 : 24;
        return new Date(created.getTime() + hours * 60 * 60 * 1000) - new Date();
      };
      return getTimeLeft(a) - getTimeLeft(b);
    });
  }, [pendingRequests, filterClient, filterWasteType, filterUrgency]);

  const clearFilters = () => {
    setFilterClient('');
    setFilterWasteType('');
    setFilterUrgency('');
  };

  const hasActiveFilters = filterClient || filterWasteType || filterUrgency;

  // Print functionality
  const handlePrint = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Zahtevi za preuzimanje - ${companyName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 18px; margin-bottom: 5px; }
          .subtitle { color: #666; margin-bottom: 20px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
          th { background: #f5f5f5; font-weight: bold; }
          .urgent { color: #dc2626; font-weight: bold; }
          .warning { color: #d97706; }
          .success { color: #059669; }
          .footer { margin-top: 20px; font-size: 10px; color: #666; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <h1>Zahtevi za preuzimanje</h1>
        <div class="subtitle">${companyName} | ${new Date().toLocaleString('sr-RS')} | ${filteredRequests.length} zahteva</div>
        ${hasActiveFilters ? `<div class="subtitle">Filteri: ${filterClient ? `Klijent: ${filterClient}` : ''} ${filterWasteType ? `Tip: ${filterWasteType}` : ''} ${filterUrgency ? `Hitnost: ${filterUrgency}` : ''}</div>` : ''}
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Klijent</th>
              <th>Telefon</th>
              <th>Adresa</th>
              <th>Tip otpada</th>
              <th>Hitnost</th>
              <th>Preostalo</th>
            </tr>
          </thead>
          <tbody>
            ${filteredRequests.map((req, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${req.client_name}</td>
                <td>${req.client_phone}</td>
                <td>${req.client_address}</td>
                <td>${WASTE_ICONS[req.waste_type] || '📦'} ${req.waste_label}</td>
                <td class="${getUrgencyClass(req.urgency)}">${req.urgency}</td>
                <td class="${getUrgencyClass(req.urgency)}">${getTimeRemaining(req.created_at, req.urgency)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">Stampano: ${new Date().toLocaleString('sr-RS')} | EcoPlanina</div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  return (
    <div className="dashboard-layout">
      {/* Mobile sidebar overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>
          <X size={20} />
        </button>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-icon">
              <Mountain size={24} />
            </div>
            <div className="brand-text">
              <h1>EcoPlanina</h1>
              <p>{companyName}</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Glavna</div>
            <a href="#" className="nav-item active" onClick={() => setSidebarOpen(false)}>
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
              {urgentCount > 0 && <span className="badge">{urgentCount}</span>}
            </a>
            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); setSidebarOpen(false); navigate('/map'); }}>
              <Map size={20} />
              <span>Mapa klijenata</span>
            </a>
            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); setSidebarOpen(false); navigate('/requests-map'); }}>
              <MapPin size={20} />
              <span>Mapa zahteva</span>
            </a>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">Upravljanje</div>
            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); setSidebarOpen(false); setShowClients(true); }}>
              <Users size={20} />
              <span>Klijenti</span>
            </a>
            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); setSidebarOpen(false); setShowEquipment(true); }}>
              <Wrench size={20} />
              <span>Vrste opreme</span>
            </a>
            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); setSidebarOpen(false); navigate('/history'); }}>
              <History size={20} />
              <span>Istorija</span>
            </a>
            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); setSidebarOpen(false); setShowSettings(true); }}>
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
            <button className="logout-btn" onClick={handleLogout} title="Odjavi se">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="page-header">
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="page-header-content">
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
                <p>
                  {hasActiveFilters
                    ? `Prikazano ${filteredRequests.length} od ${pendingRequests.length} zahteva`
                    : 'Sortirano po preostalom vremenu'}
                </p>
              </div>
              <div className="card-actions">
                <button
                  className={`btn btn-secondary ${showFilters ? 'active' : ''}`}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter size={18} />
                  Filteri
                  {hasActiveFilters && <span className="filter-badge"></span>}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handlePrint}
                  disabled={filteredRequests.length === 0}
                >
                  <Printer size={18} />
                  Stampaj
                </button>
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="filter-panel">
                <div className="filter-group">
                  <label>Klijent</label>
                  <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
                    <option value="">Svi klijenti</option>
                    {uniqueClients.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Tip otpada</label>
                  <select value={filterWasteType} onChange={(e) => setFilterWasteType(e.target.value)}>
                    <option value="">Svi tipovi</option>
                    {uniqueWasteTypes.map(type => (
                      <option key={type} value={type}>{WASTE_ICONS[type] || '📦'} {type}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Hitnost</label>
                  <select value={filterUrgency} onChange={(e) => setFilterUrgency(e.target.value)}>
                    <option value="">Sve hitnosti</option>
                    <option value="24h">24h - Hitno</option>
                    <option value="48h">48h - Srednje</option>
                    <option value="72h">72h - Normalno</option>
                  </select>
                </div>
                {hasActiveFilters && (
                  <button className="btn btn-link" onClick={clearFilters}>
                    <X size={16} />
                    Ponisti filtere
                  </button>
                )}
              </div>
            )}

            {filteredRequests.length === 0 ? (
              <div className="empty-state">
                <CheckCircle size={56} />
                <h3>{hasActiveFilters ? 'Nema zahteva za ovaj filter' : 'Nema aktivnih zahteva'}</h3>
                <p>{hasActiveFilters ? 'Probajte sa drugim filterima' : 'Svi zahtevi su obradjeni'}</p>
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
                    {filteredRequests.map(request => (
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

      {/* Equipment Types Modal */}
      {showEquipment && (
        <div className="modal-overlay" onClick={() => setShowEquipment(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Wrench size={20} /> Vrste opreme</h3>
              <button className="modal-close" onClick={() => setShowEquipment(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="equipment-add-row">
                <input
                  type="text"
                  placeholder="Nova vrsta opreme..."
                  value={newEquipmentType}
                  onChange={(e) => setNewEquipmentType(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddEquipment()}
                />
                <button className="btn btn-primary" onClick={handleAddEquipment}>
                  <Plus size={18} />
                  Dodaj
                </button>
              </div>

              {equipmentTypes.length === 0 ? (
                <div className="empty-state small">
                  <Wrench size={40} />
                  <h4>Nema definisanih vrsta opreme</h4>
                  <p>Dodajte vrste opreme koje koristite</p>
                </div>
              ) : (
                <div className="equipment-list">
                  {equipmentTypes.map(type => (
                    <div key={type} className="equipment-item">
                      <span>{type}</span>
                      <button
                        className="btn-icon danger"
                        onClick={() => handleDeleteEquipment(type)}
                        title="Obrisi"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clients Modal */}
      {showClients && !editingClient && (
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
                        {client.manager_note && (
                          <div className="client-note">
                            <FileText size={12} />
                            {client.manager_note}
                          </div>
                        )}
                      </div>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleEditClient(client)}
                      >
                        <Edit2 size={14} />
                        Izmeni
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {editingClient && (
        <div className="modal-overlay" onClick={() => setEditingClient(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Edit2 size={20} /> Izmena klijenta</h3>
              <button className="modal-close" onClick={() => setEditingClient(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-group">
                <div className="detail-label">Klijent</div>
                <div className="detail-item">
                  <Users size={18} />
                  <span>{editingClient.name}</span>
                </div>
                <div className="detail-item">
                  <Phone size={18} />
                  <span>{editingClient.phone}</span>
                </div>
              </div>

              <div className="form-group">
                <label>Dodeljena oprema</label>
                <p className="form-hint">Izaberite tipove opreme koje ovaj klijent koristi</p>
                {equipmentTypes.length === 0 ? (
                  <div className="info-banner warning">
                    <AlertTriangle size={18} />
                    <p>Nemate definisanih vrsta opreme. Dodajte ih u sekciji "Vrste opreme".</p>
                  </div>
                ) : (
                  <div className="equipment-chips">
                    {equipmentTypes.map(type => (
                      <button
                        key={type}
                        className={`equipment-chip ${selectedEquipment.includes(type) ? 'selected' : ''}`}
                        onClick={() => toggleEquipmentForClient(type)}
                      >
                        {selectedEquipment.includes(type) && <CheckCircle size={14} />}
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Beleska</label>
                <textarea
                  value={clientNote}
                  onChange={(e) => setClientNote(e.target.value)}
                  placeholder="Unesite belesku o klijentu..."
                  rows={3}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditingClient(null)}>
                Otkazi
              </button>
              <button className="btn btn-success" onClick={handleSaveClientDetails}>
                <Save size={18} />
                Sacuvaj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
