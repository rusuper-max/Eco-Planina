import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import toast from 'react-hot-toast';
import { Key, RefreshCw, Plus, Copy, Check, X, Trash2, Sparkles } from 'lucide-react';

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

  useEffect(() => { loadCodes(); }, []);

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
    if (window.confirm('Da li ste sigurni da želite da se odjavite?')) {
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
      toast.success('Master kod generisan!');
    } catch (error) {
      toast.error('Greška: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Kopirano!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDeleteCode = async (codeId, codeValue, status) => {
    if (status === 'used') {
      toast.error('Prvo obrišite firmu.');
      return;
    }
    if (!window.confirm(`Obrisati "${codeValue}"?`)) return;
    try {
      await deleteMasterCode(codeId);
      loadCodes();
      toast.success('Obrisano!');
    } catch (error) {
      toast.error('Greška: ' + error.message);
    }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('sr-RS', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  const filteredCodes = codes.filter(c => !filterStatus || c.status === filterStatus);
  const availableCount = codes.filter(c => c.status === 'available').length;
  const usedCount = codes.filter(c => c.status === 'used').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <Sidebar activeItem="codes" user={user} isGod={isGod()} onLogout={handleLogout} />

      <main className="lg:ml-72 min-h-screen">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-100">
          <div className="px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="pt-10 lg:pt-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Master Kodovi</h1>
                <p className="text-slate-500 mt-1">Generisanje i upravljanje kodovima</p>
              </div>
              <div className="flex gap-2">
                <button onClick={loadCodes} disabled={loading} className="btn-secondary">
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
                <button onClick={() => setShowGenerateModal(true)} className="btn-primary">
                  <Plus size={18} /> Generiši kod
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <button onClick={() => setFilterStatus('')} className={`stat-card ${!filterStatus ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}>
              <div className="stat-icon bg-gradient-to-br from-amber-500 to-orange-500"><Key size={22} /></div>
              <div><div className="text-2xl font-bold text-slate-900">{codes.length}</div><div className="text-sm text-slate-500">Ukupno</div></div>
            </button>
            <button onClick={() => setFilterStatus('available')} className={`stat-card ${filterStatus === 'available' ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}>
              <div className="stat-icon bg-gradient-to-br from-emerald-500 to-teal-500"><Key size={22} /></div>
              <div><div className="text-2xl font-bold text-slate-900">{availableCount}</div><div className="text-sm text-slate-500">Slobodnih</div></div>
            </button>
            <button onClick={() => setFilterStatus('used')} className={`stat-card ${filterStatus === 'used' ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}>
              <div className="stat-icon bg-gradient-to-br from-purple-500 to-pink-500"><Key size={22} /></div>
              <div><div className="text-2xl font-bold text-slate-900">{usedCount}</div><div className="text-sm text-slate-500">Iskorišćenih</div></div>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 mb-6">
            {[{ val: '', label: 'Svi' }, { val: 'available', label: 'Slobodni' }, { val: 'used', label: 'Iskorišćeni' }].map(f => (
              <button
                key={f.val}
                onClick={() => setFilterStatus(f.val)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filterStatus === f.val ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Codes */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {loading ? (
              <div className="p-8 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="skeleton w-32 h-8 rounded-lg" />
                    <div className="skeleton w-20 h-6 rounded-full" />
                    <div className="flex-1" />
                    <div className="skeleton w-24 h-4" />
                  </div>
                ))}
              </div>
            ) : filteredCodes.length === 0 ? (
              <div className="empty-state">
                <Key size={64} className="text-slate-300" />
                <h3>Nema kodova</h3>
                <p>Generiši prvi Master Code</p>
                <button onClick={() => setShowGenerateModal(true)} className="btn-primary mt-4"><Plus size={18} /> Generiši</button>
              </div>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="data-table">
                    <thead><tr><th>Kod</th><th>Status</th><th>Kreirao</th><th>Datum</th><th>Firma</th><th>Napomena</th>{isGod() && <th className="text-right">Akcije</th>}</tr></thead>
                    <tbody>
                      {filteredCodes.map(code => (
                        <tr key={code.id}>
                          <td>
                            <div className="flex items-center gap-2">
                              <code className="px-3 py-1.5 bg-slate-900 text-emerald-400 rounded-lg font-mono text-sm font-medium">{code.code}</code>
                              <button onClick={() => copyToClipboard(code.code)} className="btn-icon">
                                {copiedCode === code.code ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                              </button>
                            </div>
                          </td>
                          <td><span className={`badge ${code.status === 'available' ? 'badge-success' : 'badge-purple'}`}>{code.status === 'available' ? 'Slobodan' : 'Iskorišćen'}</span></td>
                          <td className="text-slate-600">{code.creator?.name || '—'}</td>
                          <td className="text-slate-500">{formatDate(code.created_at)}</td>
                          <td className="text-slate-600">{code.company?.name || '—'}</td>
                          <td className="text-slate-500 max-w-xs truncate">{code.note || '—'}</td>
                          {isGod() && (
                            <td className="text-right">
                              <button onClick={() => handleDeleteCode(code.id, code.code, code.status)} disabled={code.status === 'used'} className={`btn-icon ${code.status === 'used' ? 'opacity-30 cursor-not-allowed' : 'danger'}`}><Trash2 size={16} /></button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile */}
                <div className="lg:hidden divide-y divide-slate-100">
                  {filteredCodes.map(code => (
                    <div key={code.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <code className="px-3 py-1.5 bg-slate-900 text-emerald-400 rounded-lg font-mono text-sm">{code.code}</code>
                          <button onClick={() => copyToClipboard(code.code)} className="btn-icon">{copiedCode === code.code ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}</button>
                        </div>
                        <span className={`badge ${code.status === 'available' ? 'badge-success' : 'badge-purple'}`}>{code.status === 'available' ? 'Slobodan' : 'Iskorišćen'}</span>
                      </div>
                      <div className="text-sm text-slate-500 space-y-1">
                        <p>Kreirao: {code.creator?.name || '—'}</p>
                        <p>Datum: {formatDate(code.created_at)}</p>
                        {code.company?.name && <p>Firma: {code.company.name}</p>}
                      </div>
                      {isGod() && code.status === 'available' && (
                        <button onClick={() => handleDeleteCode(code.id, code.code, code.status)} className="w-full mt-3 py-2 text-sm bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors">Obriši</button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="modal-overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Sparkles size={18} className="text-amber-500" /> Generiši Master Code</h3>
              <button onClick={() => setShowGenerateModal(false)} className="btn-icon"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p className="text-slate-500 mb-4">Novi kod za registraciju firme</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Napomena (opciono)</label>
                <textarea value={newCodeNote} onChange={(e) => setNewCodeNote(e.target.value)} placeholder="npr. Za firmu XYZ..." rows={3} className="input resize-none" />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowGenerateModal(false)} className="btn-secondary">Otkaži</button>
              <button onClick={handleGenerateCode} disabled={generating} className="btn-primary">
                {generating ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />} Generiši
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCodesPage;
