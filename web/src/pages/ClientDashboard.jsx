import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LogOut, MapPin, Send, Package, Clock, CheckCircle, X, Mountain,
  AlertTriangle, RefreshCw
} from 'lucide-react';

const WASTE_TYPES = [
  { id: 'cardboard', label: 'Karton', icon: '📦', desc: 'Kartonske kutije' },
  { id: 'plastic', label: 'Plastika', icon: '♻️', desc: 'Najlon i folije' },
  { id: 'glass', label: 'Staklo', icon: '🍾', desc: 'Staklene flase' },
];

const FILL_LEVELS = [
  { value: 50, label: 'Polupuno', desc: '~50%' },
  { value: 75, label: 'Skoro puno', desc: '~75%' },
  { value: 100, label: 'Potpuno puno', desc: '100%' },
];

const URGENCY_OPTIONS = [
  { value: '24h', label: 'Hitno', desc: 'U roku od 24 sata', color: '#EF4444' },
  { value: '48h', label: 'Srednje', desc: 'U roku od 48 sati', color: '#F59E0B' },
  { value: '72h', label: 'Nije hitno', desc: 'U roku od 72 sata', color: '#10B981' },
];

const WASTE_ICONS = {
  cardboard: '📦',
  glass: '🍾',
  plastic: '♻️',
  trash: '🗑️',
};

const ClientDashboard = () => {
  const {
    user, companyName, logout, addPickupRequest,
    clientRequests, processedNotification, clearProcessedNotification, fetchClientRequests
  } = useAuth();
  const navigate = useNavigate();

  const [selectedWaste, setSelectedWaste] = useState(null);
  const [fillLevel, setFillLevel] = useState(null);
  const [urgency, setUrgency] = useState(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('form');

  useEffect(() => {
    if (fetchClientRequests) {
      fetchClientRequests();
    }
  }, []);

  const handleLogout = () => {
    if (window.confirm('Da li ste sigurni da zelite da se odjavite?')) {
      logout();
      navigate('/');
    }
  };

  const handleSubmit = async () => {
    if (!selectedWaste) {
      alert('Molimo izaberite tip otpada');
      return;
    }
    if (!fillLevel) {
      alert('Molimo izaberite nivo popunjenosti');
      return;
    }
    if (!urgency) {
      alert('Molimo izaberite hitnost');
      return;
    }

    setLoading(true);
    try {
      const wasteType = WASTE_TYPES.find(w => w.id === selectedWaste);
      await addPickupRequest({
        wasteType: selectedWaste,
        wasteLabel: wasteType?.label || selectedWaste,
        fillLevel: fillLevel,
        urgency: urgency,
        note: note.trim(),
      });

      setShowSuccess(true);
      setSelectedWaste(null);
      setFillLevel(null);
      setUrgency(null);
      setNote('');

      setTimeout(() => {
        setShowSuccess(false);
        setActiveTab('requests');
      }, 2000);
    } catch (error) {
      alert('Greska pri slanju zahteva: ' + error.message);
    } finally {
      setLoading(false);
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

  const getUrgencyColor = (urg) => {
    switch (urg) {
      case '24h': return '#EF4444';
      case '48h': return '#F59E0B';
      default: return '#10B981';
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar client-sidebar">
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

        <div className="client-sidebar-info">
          <div className="client-profile">
            <div className="user-avatar large">{user?.name?.charAt(0) || 'K'}</div>
            <div className="profile-details">
              <h3>{user?.name}</h3>
              <span className="role-badge">Klijent</span>
            </div>
          </div>

          <div className="location-card">
            <div className="location-icon">
              <MapPin size={20} />
            </div>
            <div className="location-details">
              <span className="label">Vasa lokacija</span>
              <span className="address">{user?.address || 'Nije uneta'}</span>
            </div>
          </div>

          {clientRequests && clientRequests.length > 0 && (
            <div className="active-requests-badge" onClick={() => setActiveTab('requests')}>
              <Clock size={18} />
              <span>{clientRequests.length} aktivan{clientRequests.length === 1 ? '' : clientRequests.length < 5 ? 'a' : 'ih'} zahtev{clientRequests.length === 1 ? '' : 'a'}</span>
            </div>
          )}
        </div>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Odjavi se</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content client-main-content">
        <header className="page-header">
          <div>
            <h1>{activeTab === 'form' ? 'Novi zahtev za preuzimanje' : 'Moji zahtevi'}</h1>
            <p>{activeTab === 'form' ? 'Popunite formu da posaljete zahtev menadzeru' : 'Pregled vasih aktivnih zahteva'}</p>
          </div>
          <div className="header-actions">
            <div className="tab-buttons">
              <button
                className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
                onClick={() => setActiveTab('form')}
              >
                <Send size={18} />
                Novi zahtev
              </button>
              <button
                className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
                onClick={() => setActiveTab('requests')}
              >
                <Clock size={18} />
                Moji zahtevi
                {clientRequests && clientRequests.length > 0 && (
                  <span className="tab-badge">{clientRequests.length}</span>
                )}
              </button>
            </div>
          </div>
        </header>

        <div className="page-content">
          {activeTab === 'form' ? (
            <div className="client-form-container">
              {/* Waste Type Selection */}
              <section className="form-section">
                <h3><Package size={20} /> Sta treba preuzeti?</h3>
                <div className="options-grid">
                  {WASTE_TYPES.map(waste => (
                    <button
                      key={waste.id}
                      className={`option-card ${selectedWaste === waste.id ? 'selected' : ''}`}
                      onClick={() => setSelectedWaste(waste.id)}
                    >
                      <span className="option-icon">{waste.icon}</span>
                      <span className="option-label">{waste.label}</span>
                      <span className="option-desc">{waste.desc}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Fill Level */}
              <section className="form-section">
                <h3>Popunjenost kontejnera</h3>
                <div className="options-row">
                  {FILL_LEVELS.map(level => (
                    <button
                      key={level.value}
                      className={`option-pill ${fillLevel === level.value ? 'selected' : ''}`}
                      onClick={() => setFillLevel(level.value)}
                    >
                      <span>{level.label}</span>
                      <span className="pill-desc">{level.desc}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Urgency */}
              <section className="form-section">
                <h3><Clock size={20} /> Hitnost preuzimanja</h3>
                <div className="urgency-options">
                  {URGENCY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      className={`urgency-card ${urgency === opt.value ? 'selected' : ''}`}
                      onClick={() => setUrgency(opt.value)}
                      style={{ '--urgency-color': opt.color }}
                    >
                      <span className="urgency-label">{opt.label}</span>
                      <span className="urgency-value">{opt.value}</span>
                      <span className="urgency-desc">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Note */}
              <section className="form-section">
                <h3>Dodatna napomena (opciono)</h3>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Unesite napomenu ako imate posebne instrukcije..."
                  rows={3}
                />
              </section>

              {/* Submit Button */}
              <button
                className="submit-btn"
                onClick={handleSubmit}
                disabled={loading || !selectedWaste || !fillLevel || !urgency}
              >
                {loading ? (
                  <span className="loading-spinner"></span>
                ) : (
                  <>
                    <Send size={20} />
                    Posalji zahtev
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="client-requests-container">
              {!clientRequests || clientRequests.length === 0 ? (
                <div className="empty-state">
                  <CheckCircle size={56} />
                  <h3>Nemate aktivnih zahteva</h3>
                  <p>Kada posaljete zahtev, ovde cete moci pratiti njegov status</p>
                  <button className="btn btn-primary" onClick={() => setActiveTab('form')}>
                    <Send size={18} />
                    Posalji novi zahtev
                  </button>
                </div>
              ) : (
                <div className="requests-list">
                  {clientRequests.map(request => (
                    <div key={request.id} className="request-card">
                      <div className="request-card-header">
                        <div className="request-type">
                          <span className="waste-icon">{WASTE_ICONS[request.waste_type] || '📦'}</span>
                          <div>
                            <h4>{request.waste_label || request.waste_type}</h4>
                            <span className="request-date">
                              {formatDate(request.created_at)} u {formatTime(request.created_at)}
                            </span>
                          </div>
                        </div>
                        <div
                          className="urgency-badge"
                          style={{ backgroundColor: getUrgencyColor(request.urgency) }}
                        >
                          <AlertTriangle size={14} />
                          {request.urgency}
                        </div>
                      </div>

                      <div className="request-card-body">
                        <div className="request-detail">
                          <span className="detail-label">Popunjenost</span>
                          <div className="fill-bar">
                            <div
                              className="fill-progress"
                              style={{ width: `${request.fill_level}%` }}
                            ></div>
                          </div>
                          <span className="detail-value">{request.fill_level}%</span>
                        </div>

                        {request.note && (
                          <div className="request-note">
                            <span className="detail-label">Napomena</span>
                            <p>{request.note}</p>
                          </div>
                        )}
                      </div>

                      <div className="request-card-footer">
                        <div className="status-badge pending">
                          <RefreshCw size={14} />
                          Ceka se obrada
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Success Message */}
      {showSuccess && (
        <div className="success-toast">
          <CheckCircle size={24} />
          <div>
            <strong>Zahtev poslat!</strong>
            <p>Vas zahtev je uspesno poslat menadzeru.</p>
          </div>
          <button onClick={() => setShowSuccess(false)}>
            <X size={20} />
          </button>
        </div>
      )}

      {/* Processed Notification */}
      {processedNotification && (
        <div className="processed-notification">
          <div className="notification-content">
            <CheckCircle size={32} />
            <div>
              <strong>Zahtev obradjen!</strong>
              <p>Vas zahtev za "{processedNotification.wasteLabel}" je uspesno obradjen.</p>
            </div>
          </div>
          <button className="notification-close" onClick={clearProcessedNotification}>
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;
