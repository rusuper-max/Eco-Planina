import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import toast from 'react-hot-toast';
import { Building2, RefreshCw, Search, X, Users, Trash2, Pencil, Save, Package, UserCheck, Eye } from 'lucide-react';

const AdminCompaniesPage = () => {
  const { user, logout, fetchAllCompanies, isGod, deleteCompany, updateCompany, fetchCompanyDetails } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadCompanies(); }, []);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const data = await fetchAllCompanies();
      setCompanies(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Odjaviti se?')) { logout(); navigate('/'); }
  };

  const handleDelete = async (code) => {
    if (!window.confirm('SIGURNI ste? Svi korisnici će biti obrisani!')) return;
    try {
      await deleteCompany(code);
      loadCompanies();
      setSelectedCompany(null);
      toast.success('Obrisano!');
    } catch (error) {
      toast.error('Greška: ' + error.message);
    }
  };

  const openDetails = async (company) => {
    setSelectedCompany(company);
    setLoadingDetails(true);
    try {
      const details = await fetchCompanyDetails(company.code);
      setCompanyDetails(details);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const openEditModal = (company) => {
    setEditingCompany(company);
    setEditForm({ name: company.name || '', pib: company.pib || '', equipment_types: company.equipment_types || [] });
  };

  const handleSaveEdit = async () => {
    if (!editingCompany) return;
    setSaving(true);
    try {
      await updateCompany(editingCompany.code, editForm);
      loadCompanies();
      setEditingCompany(null);
      toast.success('Sačuvano!');
    } catch (error) {
      toast.error('Greška: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredCompanies = companies.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.pib?.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <Sidebar activeItem="companies" user={user} isGod={isGod()} onLogout={handleLogout} />

      <main className="lg:ml-72 min-h-screen">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-100">
          <div className="px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="pt-10 lg:pt-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Firme</h1>
                <p className="text-slate-500 mt-1">Upravljanje registrovanim firmama</p>
              </div>
              <button onClick={loadCompanies} disabled={loading} className="btn-secondary">
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Osveži
              </button>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {/* Search */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-6">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Pretraži po imenu, kodu ili PIB-u..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input pl-11" />
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl mb-6">
            <Building2 size={20} className="text-emerald-600" />
            <span className="text-emerald-800 font-medium">{filteredCompanies.length} firmi</span>
          </div>

          {/* Companies */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {loading ? (
              <div className="p-8 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="skeleton w-10 h-10 rounded-xl" />
                    <div className="flex-1"><div className="skeleton w-32 h-4 mb-2" /><div className="skeleton w-24 h-3" /></div>
                    <div className="skeleton w-20 h-8 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="empty-state"><Building2 size={64} className="text-slate-300" /><h3>Nema firmi</h3><p>Nema rezultata</p></div>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="data-table">
                    <thead><tr><th>Ime</th><th>Kod</th><th>PIB</th><th>Menadžeri</th><th>Klijenti</th><th>Oprema</th><th className="text-right">Akcije</th></tr></thead>
                    <tbody>
                      {filteredCompanies.map(c => (
                        <tr key={c.id}>
                          <td className="font-medium text-slate-900">{c.name}</td>
                          <td><code className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-mono text-sm">{c.code}</code></td>
                          <td className="text-slate-600">{c.pib || '—'}</td>
                          <td className="text-slate-600">{c.managerCount}</td>
                          <td className="text-slate-600">{c.clientCount}</td>
                          <td><span className="badge badge-info">{c.equipment_types?.length || 0} tipova</span></td>
                          <td>
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => openDetails(c)} className="btn-ghost text-sm"><Eye size={16} /> Detalji</button>
                              <button onClick={() => openEditModal(c)} className="btn-icon success"><Pencil size={16} /></button>
                              {isGod() && <button onClick={() => handleDelete(c.code)} className="btn-icon danger"><Trash2 size={16} /></button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile */}
                <div className="lg:hidden divide-y divide-slate-100">
                  {filteredCompanies.map(c => (
                    <div key={c.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-semibold text-slate-900">{c.name}</p>
                        <code className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono">{c.code}</code>
                      </div>
                      <div className="text-sm text-slate-500 mb-3 space-y-1">
                        <p>PIB: {c.pib || '—'}</p>
                        <p>👥 {c.managerCount} menadžera, {c.clientCount} klijenata</p>
                        <p>📦 {c.equipment_types?.length || 0} tipova</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openDetails(c)} className="btn-secondary flex-1 text-sm py-2">Detalji</button>
                        <button onClick={() => openEditModal(c)} className="btn-icon success"><Pencil size={16} /></button>
                        {isGod() && <button onClick={() => handleDelete(c.code)} className="btn-icon danger"><Trash2 size={16} /></button>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Details Modal */}
      {selectedCompany && (
        <div className="modal-overlay" onClick={() => { setSelectedCompany(null); setCompanyDetails(null); }}>
          <div className="modal max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Building2 size={18} /> {selectedCompany.name}</h3>
              <button onClick={() => { setSelectedCompany(null); setCompanyDetails(null); }} className="btn-icon"><X size={20} /></button>
            </div>
            <div className="modal-body max-h-[70vh] overflow-y-auto">
              {loadingDetails ? (
                <div className="flex items-center justify-center py-12"><RefreshCw size={32} className="animate-spin text-slate-400" /></div>
              ) : companyDetails ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-sm text-slate-500 mb-1">Kod</p><code className="px-3 py-1.5 bg-slate-900 text-emerald-400 rounded-lg font-mono">{companyDetails.code}</code></div>
                    <div><p className="text-sm text-slate-500 mb-1">PIB</p><p className="font-medium">{companyDetails.pib || '—'}</p></div>
                  </div>

                  <div>
                    <p className="flex items-center gap-2 text-sm text-slate-500 mb-2"><Package size={16} /> Tipovi opreme</p>
                    {companyDetails.equipment_types?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">{companyDetails.equipment_types.map((eq, i) => <span key={i} className="badge badge-success">{eq}</span>)}</div>
                    ) : <p className="text-slate-400">Nema</p>}
                  </div>

                  <div>
                    <p className="flex items-center gap-2 text-sm text-slate-500 mb-2"><UserCheck size={16} /> Menadžeri ({companyDetails.managers?.length || 0})</p>
                    {companyDetails.managers?.length > 0 ? (
                      <div className="space-y-2">{companyDetails.managers.map(m => <div key={m.id} className="flex justify-between p-3 bg-slate-50 rounded-xl"><span className="font-medium">{m.name}</span><span className="text-slate-500">{m.phone}</span></div>)}</div>
                    ) : <p className="text-slate-400">Nema</p>}
                  </div>

                  <div>
                    <p className="flex items-center gap-2 text-sm text-slate-500 mb-2"><Users size={16} /> Klijenti ({companyDetails.clients?.length || 0})</p>
                    {companyDetails.clients?.length > 0 ? (
                      <div className="space-y-2">{companyDetails.clients.map(c => (
                        <div key={c.id} className="p-3 bg-slate-50 rounded-xl">
                          <div className="flex justify-between mb-1"><span className="font-medium">{c.name}</span><span className="text-slate-500 text-sm">{c.phone}</span></div>
                          {c.address && <p className="text-sm text-slate-500">{c.address}</p>}
                          {c.equipment_types?.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{c.equipment_types.map((eq, i) => <span key={i} className="badge badge-info text-xs">{eq}</span>)}</div>}
                        </div>
                      ))}</div>
                    ) : <p className="text-slate-400">Nema</p>}
                  </div>

                  {isGod() && (
                    <button onClick={() => { handleDelete(companyDetails.code); setSelectedCompany(null); }} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
                      <Trash2 size={18} /> Obriši firmu
                    </button>
                  )}
                </div>
              ) : <p className="text-center text-slate-400 py-12">Greška</p>}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingCompany && (
        <div className="modal-overlay" onClick={() => setEditingCompany(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Pencil size={18} /> Izmena firme</h3>
              <button onClick={() => setEditingCompany(null)} className="btn-icon"><X size={20} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Ime</label><input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="input" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">PIB</label><input type="text" value={editForm.pib} onChange={(e) => setEditForm({ ...editForm, pib: e.target.value })} className="input" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Tipovi opreme (zarezom)</label><textarea value={editForm.equipment_types?.join(', ') || ''} onChange={(e) => setEditForm({ ...editForm, equipment_types: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} rows={3} className="input resize-none" /></div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setEditingCompany(null)} className="btn-secondary">Otkaži</button>
              <button onClick={handleSaveEdit} disabled={saving} className="btn-primary">{saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />} Sačuvaj</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCompaniesPage;
