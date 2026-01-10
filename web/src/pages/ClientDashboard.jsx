import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LogOut, MapPin, Send, Package, Clock, CheckCircle, X, Mountain
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

const ClientDashboard = () => {
  const { user, companyName, logout, addPickupRequest } = useAuth();
  const navigate = useNavigate();

  const [selectedWaste, setSelectedWaste] = useState(null);
  const [fillLevel, setFillLevel] = useState(null);
  const [urgency, setUrgency] = useState(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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

      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      alert('Greska pri slanju zahteva: ' + error.message);
    } finally {
      setLoading(false);
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
            <div>
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
        </div>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Odjavi se</span>
          </button>
        </div>
      </aside>

      {/* Main Form Area */}
      <main className="main-content client-main-content">
        <header className="page-header">
          <div>
            <h1>Novi zahtev za preuzimanje</h1>
            <p>Popunite formu da posaljete zahtev menadzeru</p>
          </div>
        </header>

        <div className="page-content">
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
    </div>
  );
};

export default ClientDashboard;
