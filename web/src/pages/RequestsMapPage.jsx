import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  LogOut, Users, History, Settings, Mountain, Map, MapPin, Phone,
  LayoutDashboard, X, Printer, Wrench, Clock, AlertTriangle, CheckCircle, Package
} from 'lucide-react';

// Fix for default marker icons in Leaflet with webpack/vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const WASTE_ICONS = {
  cardboard: '📦',
  glass: '🍾',
  plastic: '♻️',
  trash: '🗑️',
};

// Custom marker icon creator
const createCustomIcon = (color, emoji) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        font-size: 18px;
      ">${emoji}</div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

// Component to fit map bounds
const FitBounds = ({ items }) => {
  const map = useMap();

  useEffect(() => {
    if (items.length > 0) {
      const validItems = items.filter(item => item.latitude && item.longitude);
      if (validItems.length > 0) {
        const bounds = L.latLngBounds(
          validItems.map(item => [item.latitude, item.longitude])
        );
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }
  }, [items, map]);

  return null;
};

const RequestsMapPage = () => {
  const { user, companyName, logout, pickupRequests } = useAuth();
  const navigate = useNavigate();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    if (window.confirm('Da li ste sigurni da zelite da se odjavite?')) {
      logout();
      navigate('/');
    }
  };

  // Filter only pending requests with valid coordinates
  const requestsWithCoords = useMemo(() => {
    return pickupRequests
      .filter(r => r.status === 'pending')
      .filter(r => r.latitude && r.longitude && !isNaN(r.latitude) && !isNaN(r.longitude));
  }, [pickupRequests]);

  const pendingRequests = pickupRequests.filter(r => r.status === 'pending');

  // Calculate map center
  const mapCenter = useMemo(() => {
    if (requestsWithCoords.length === 0) {
      return [44.8176, 20.4633]; // Default to Belgrade
    }
    const lats = requestsWithCoords.map(r => r.latitude);
    const lngs = requestsWithCoords.map(r => r.longitude);
    return [
      (Math.min(...lats) + Math.max(...lats)) / 2,
      (Math.min(...lngs) + Math.max(...lngs)) / 2
    ];
  }, [requestsWithCoords]);

  // Get marker color based on urgency
  const getMarkerColor = (urgency) => {
    switch (urgency) {
      case '24h': return '#EF4444'; // Red
      case '48h': return '#F59E0B'; // Orange
      default: return '#10B981'; // Green
    }
  };

  // Get marker icon based on waste type and urgency
  const getRequestIcon = (request) => {
    const color = getMarkerColor(request.urgency);
    const emoji = WASTE_ICONS[request.waste_type] || '📦';
    return createCustomIcon(color, emoji);
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

  // Print requests list
  const handlePrintRequests = () => {
    if (pendingRequests.length === 0) {
      alert('Nema zahteva za stampanje');
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Aktivni zahtevi - ${companyName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 18px; margin-bottom: 5px; }
          .subtitle { color: #666; margin-bottom: 20px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
          th { background: #f5f5f5; font-weight: bold; }
          .footer { margin-top: 20px; font-size: 10px; color: #666; }
          .urgent { color: #EF4444; font-weight: bold; }
          .warning { color: #F59E0B; }
          .normal { color: #10B981; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <h1>Aktivni zahtevi za preuzimanje</h1>
        <div class="subtitle">${companyName} | ${new Date().toLocaleString('sr-RS')} | ${pendingRequests.length} zahteva</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Klijent</th>
              <th>Adresa</th>
              <th>Telefon</th>
              <th>Tip otpada</th>
              <th>Hitnost</th>
              <th>Datum</th>
            </tr>
          </thead>
          <tbody>
            ${pendingRequests.map((req, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${req.client_name || '-'}</td>
                <td>${req.client_address || '-'}</td>
                <td>${req.client_phone || '-'}</td>
                <td>${req.waste_label || req.waste_type || '-'}</td>
                <td class="${req.urgency === '24h' ? 'urgent' : req.urgency === '48h' ? 'warning' : 'normal'}">${req.urgency || '-'}</td>
                <td>${formatDate(req.created_at)}</td>
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
      {/* Sidebar */}
      <aside className="sidebar">
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
            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate('/manager'); }}>
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </a>
            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate('/map'); }}>
              <Map size={20} />
              <span>Mapa klijenata</span>
            </a>
            <a href="#" className="nav-item active">
              <MapPin size={20} />
              <span>Mapa zahteva</span>
            </a>
          </div>

          <div className="nav-section">
            <div className="nav-section-title">Upravljanje</div>
            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate('/manager'); }}>
              <Users size={20} />
              <span>Klijenti</span>
            </a>
            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate('/manager?tab=equipment'); }}>
              <Wrench size={20} />
              <span>Vrste opreme</span>
            </a>
            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate('/history'); }}>
              <History size={20} />
              <span>Istorija</span>
            </a>
            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate('/manager?tab=settings'); }}>
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
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <header className="page-header">
          <div>
            <h1>Mapa zahteva</h1>
            <p>Pregled lokacija aktivnih zahteva ({pendingRequests.length} zahteva)</p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-secondary"
              onClick={handlePrintRequests}
              disabled={pendingRequests.length === 0}
            >
              <Printer size={18} />
              Stampaj zahteve
            </button>
          </div>
        </header>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Map Area */}
          <div className="map-wrapper" style={{ flex: 1, position: 'relative' }}>
            {loading ? (
              <div className="map-placeholder">
                <Map size={64} />
                <h3>Ucitavanje mape...</h3>
              </div>
            ) : (
              <MapContainer
                center={mapCenter}
                zoom={12}
                style={{ height: '100%', width: '100%', borderRadius: '16px' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitBounds items={requestsWithCoords} />

                {requestsWithCoords.map(request => (
                  <Marker
                    key={request.id}
                    position={[request.latitude, request.longitude]}
                    icon={getRequestIcon(request)}
                    eventHandlers={{
                      click: () => setSelectedRequest(request)
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: '180px' }}>
                        <strong>{request.client_name}</strong>
                        <br />
                        <small>{request.client_address}</small>
                        <br />
                        <span style={{
                          color: getMarkerColor(request.urgency),
                          fontWeight: 'bold'
                        }}>
                          {request.urgency}
                        </span>
                        {' - '}
                        {request.waste_label || request.waste_type}
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {requestsWithCoords.map(request => (
                  <Circle
                    key={`circle-${request.id}`}
                    center={[request.latitude, request.longitude]}
                    radius={60}
                    pathOptions={{
                      color: getMarkerColor(request.urgency),
                      fillColor: getMarkerColor(request.urgency),
                      fillOpacity: 0.2,
                      weight: 2
                    }}
                  />
                ))}
              </MapContainer>
            )}

            {/* Legend */}
            {!loading && (
              <div className="map-legend">
                <div className="legend-title">Hitnost:</div>
                <div className="legend-item">
                  <div className="legend-dot" style={{ backgroundColor: '#EF4444' }}></div>
                  <span>24h (Hitno)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{ backgroundColor: '#F59E0B' }}></div>
                  <span>48h (Srednje)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{ backgroundColor: '#10B981' }}></div>
                  <span>7 dana (Normalno)</span>
                </div>
              </div>
            )}

            {/* No requests message */}
            {!loading && requestsWithCoords.length === 0 && (
              <div className="map-no-data">
                <CheckCircle size={48} />
                <h3>Nema aktivnih zahteva</h3>
                <p>Svi zahtevi su obradjeni ili nemaju lokaciju</p>
              </div>
            )}
          </div>

          {/* Requests Sidebar */}
          <div className="map-sidebar">
            <div className="map-sidebar-header">
              <h3>Zahtevi ({pendingRequests.length})</h3>
            </div>
            <div className="map-client-list">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-500)' }}>
                  Ucitavanje...
                </div>
              ) : pendingRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--gray-500)' }}>
                  Nema aktivnih zahteva
                </div>
              ) : (
                pendingRequests.map(request => (
                  <div
                    key={request.id}
                    className={`map-client-item ${selectedRequest?.id === request.id ? 'active' : ''}`}
                    onClick={() => setSelectedRequest(request)}
                    style={{ borderLeft: `4px solid ${getMarkerColor(request.urgency)}` }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4>{request.client_name}</h4>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: getMarkerColor(request.urgency)
                      }}>
                        {request.urgency}
                      </span>
                    </div>
                    <p>
                      <MapPin size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                      {request.client_address}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--gray-500)' }}>
                      {WASTE_ICONS[request.waste_type]} {request.waste_label || request.waste_type}
                    </p>
                    {!request.latitude && (
                      <span className="no-location-badge">Bez lokacije</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedRequest.client_name}</h3>
              <button className="modal-close" onClick={() => setSelectedRequest(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-group">
                <div className="detail-label">Hitnost</div>
                <div className="detail-item">
                  <AlertTriangle size={18} style={{ color: getMarkerColor(selectedRequest.urgency) }} />
                  <span style={{
                    fontWeight: 'bold',
                    color: getMarkerColor(selectedRequest.urgency)
                  }}>
                    {selectedRequest.urgency}
                  </span>
                </div>
              </div>
              <div className="detail-group">
                <div className="detail-label">Tip otpada</div>
                <div className="detail-item">
                  <Package size={18} />
                  <span>{selectedRequest.waste_label || selectedRequest.waste_type}</span>
                </div>
              </div>
              <div className="detail-group">
                <div className="detail-label">Lokacija</div>
                <div className="detail-item">
                  <MapPin size={18} />
                  <span>{selectedRequest.client_address}</span>
                </div>
              </div>
              <div className="detail-group">
                <div className="detail-label">Kontakt</div>
                <div className="detail-item">
                  <Phone size={18} />
                  <a href={`tel:${selectedRequest.client_phone}`}>{selectedRequest.client_phone}</a>
                </div>
              </div>
              <div className="detail-group">
                <div className="detail-label">Datum zahteva</div>
                <div className="detail-item">
                  <Clock size={18} />
                  <span>{formatDate(selectedRequest.created_at)} u {formatTime(selectedRequest.created_at)}</span>
                </div>
              </div>
              {selectedRequest.fill_level && (
                <div className="detail-group">
                  <div className="detail-label">Popunjenost</div>
                  <div className="detail-item">
                    <span>{selectedRequest.fill_level}%</span>
                  </div>
                </div>
              )}
              {selectedRequest.note && (
                <div className="detail-group">
                  <div className="detail-label">Napomena</div>
                  <div className="detail-item">
                    <span>{selectedRequest.note}</span>
                  </div>
                </div>
              )}
              {selectedRequest.latitude && selectedRequest.longitude && (
                <div className="detail-group">
                  <div className="detail-label">Koordinate</div>
                  <div className="detail-item">
                    <span>{selectedRequest.latitude.toFixed(6)}, {selectedRequest.longitude.toFixed(6)}</span>
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

export default RequestsMapPage;
