import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import toast from 'react-hot-toast';
import {
  Key, RefreshCw, Plus, Copy, Check, X, Trash2
} from 'lucide-react';

const AdminCodesPage = () => {
  const { user, logout, fetchAllMasterCodes, generateMasterCode, deleteMasterCode, isGod } = useAuth();
  const navigate = useNavigate();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [newCodeNote, setNewCodeNote] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    setLoading(true);
    try {
      const data = await fetchAllMasterCodes();
      setCodes(data);
    } catch (error) {
      console.error('Error loading codes:', error);
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

  const handleGenerateCode = async () => {
    setGenerating(true);
    try {
      await generateMasterCode(newCodeNote);
      setShowGenerateModal(false);
      setNewCodeNote('');
      loadCodes();
      toast.success('Master kod uspešno generisan!');
    } catch (error) {
      toast.error('Greška: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Kod kopiran u clipboard!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDeleteCode = async (codeId, codeValue, status) => {
    if (status === 'used') {
      toast.error('Ne možete obrisati iskorišćen kod. Prvo obrišite firmu.');
      return;
    }
    if (!window.confirm(`Da li ste sigurni da želite da obrišete kod "${codeValue}"?\n\nOva akcija je NEPOVRATNA!`)) {
      return;
    }
    try {
      await deleteMasterCode(codeId);
      loadCodes();
      toast.success('Master kod obrisan!');
    } catch (error) {
      toast.error('Greška: ' + error.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredCodes = codes.filter(c => {
    if (!filterStatus) return true;
    return c.status === filterStatus;
  });

  const availableCount = codes.filter(c => c.status === 'available').length;
  const usedCount = codes.filter(c => c.status === 'used').length;

  return (
    <div className="dashboard-layout">
      <Sidebar
        activeItem="codes"
        user={user}
        isGod={isGod()}
        onLogout={handleLogout}
      />

      <main className="main-content">
        <header className="page-header">
          <div>
            <h1>Master Kodovi</h1>
            <p>Generisanje i upravljanje kodovima za firme</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={loadCodes} disabled={loading}>
              <RefreshCw size={18} className={loading ? 'spin' : ''} />
              Osvezi
            </button>
            <button className="btn btn-primary" onClick={() => setShowGenerateModal(true)}>
              <Plus size={18} />
              Generiši novi kod
            </button>
          </div>
        </header>

        <div className="page-content">
          {/* Stats */}
          <div className="admin-stats-grid" style={{ marginBottom: 24 }}>
            <div className="admin-stat-card clickable" onClick={() => setFilterStatus('')}>
              <div className="stat-icon codes">
                <Key size={26} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{codes.length}</div>
                <div className="stat-label">Ukupno kodova</div>
              </div>
            </div>
            <div className="admin-stat-card clickable" onClick={() => setFilterStatus('available')}>
              <div className="stat-icon available">
                <Key size={26} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{availableCount}</div>
                <div className="stat-label">Slobodnih</div>
              </div>
            </div>
            <div className="admin-stat-card clickable" onClick={() => setFilterStatus('used')}>
              <div className="stat-icon used">
                <Key size={26} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{usedCount}</div>
                <div className="stat-label">Iskoriscenih</div>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="filter-pills" style={{ marginBottom: 24 }}>
            <button
              className={`filter-pill ${!filterStatus ? 'active' : ''}`}
              onClick={() => setFilterStatus('')}
            >
              Svi
            </button>
            <button
              className={`filter-pill ${filterStatus === 'available' ? 'active' : ''}`}
              onClick={() => setFilterStatus('available')}
            >
              Slobodni
            </button>
            <button
              className={`filter-pill ${filterStatus === 'used' ? 'active' : ''}`}
              onClick={() => setFilterStatus('used')}
            >
              Iskorisceni
            </button>
          </div>

          {/* Codes Table */}
          <div className="content-card">
            <div className="card-header">
              <h2>Lista kodova</h2>
            </div>

            {loading ? (
              <div className="empty-state">
                <RefreshCw size={48} className="spin" />
                <p>Ucitavanje...</p>
              </div>
            ) : filteredCodes.length === 0 ? (
              <div className="empty-state">
                <Key size={64} />
                <h3>Nema kodova</h3>
                <p>Generisite prvi Master Code</p>
                <button className="btn btn-primary" onClick={() => setShowGenerateModal(true)}>
                  <Plus size={18} />
                  Generiši kod
                </button>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Kod</th>
                      <th>Status</th>
                      <th>Kreirao</th>
                      <th>Datum kreiranja</th>
                      <th>Firma</th>
                      <th>PIB</th>
                      <th>Napomena</th>
                      {isGod() && <th>Akcije</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCodes.map(code => (
                      <tr key={code.id}>
                        <td>
                          <div className="code-cell">
                            <code className="master-code">{code.code}</code>
                            <button
                              className="copy-btn"
                              onClick={() => copyToClipboard(code.code)}
                              title="Kopiraj"
                            >
                              {copiedCode === code.code ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${code.status}`}>
                            {code.status === 'available' ? 'Slobodan' : 'Iskoriscen'}
                          </span>
                        </td>
                        <td>{code.creator?.name || '-'}</td>
                        <td>{formatDate(code.created_at)}</td>
                        <td>{code.company?.name || '-'}</td>
                        <td>{code.pib || '-'}</td>
                        <td className="note-cell">{code.note || '-'}</td>
                        {isGod() && (
                          <td>
                            <button
                              className={`btn-icon ${code.status === 'available' ? 'danger' : ''}`}
                              onClick={() => handleDeleteCode(code.id, code.code, code.status)}
                              title={code.status === 'used' ? 'Prvo obrišite firmu' : 'Obriši kod'}
                              disabled={code.status === 'used'}
                              style={code.status === 'used' ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Generate Code Modal */}
      {showGenerateModal && (
        <div className="modal-overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Generiši Master Code</h3>
              <button className="modal-close" onClick={() => setShowGenerateModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 20, color: 'var(--gray-600)' }}>
                Generisacete novi Master Code koji ce firma moci da koristi za registraciju.
              </p>

              <div className="form-group">
                <label>Napomena (opciono)</label>
                <textarea
                  value={newCodeNote}
                  onChange={(e) => setNewCodeNote(e.target.value)}
                  placeholder="npr. Za firmu XYZ, kontakt: 064..."
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowGenerateModal(false)}
                  disabled={generating}
                >
                  Otkazi
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleGenerateCode}
                  disabled={generating}
                >
                  {generating ? (
                    <RefreshCw size={18} className="spin" />
                  ) : (
                    <Plus size={18} />
                  )}
                  Generiši
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCodesPage;
