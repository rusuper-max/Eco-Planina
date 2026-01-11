import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import toast from 'react-hot-toast';
import {
  Users, RefreshCw, Search, ChevronUp, ChevronDown, X,
  Trash2, Pencil, Save, Phone, MapPin, Filter
} from 'lucide-react';

const AdminUsersPage = () => {
  const {
    user, logout, fetchAllUsers, promoteToAdmin, demoteFromAdmin,
    isGod, deleteUser, updateUser
  } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadUsers(); }, [roleFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (roleFilter) filters.role = roleFilter;
      const data = await fetchAllUsers(filters);
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
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

  const handlePromote = async (userId) => {
    if (!window.confirm('Promovišite ovog korisnika u admina?')) return;
    try {
      await promoteToAdmin(userId);
      loadUsers();
      setSelectedUser(null);
      toast.success('Korisnik promovisan!');
    } catch (error) {
      toast.error('Greška: ' + error.message);
    }
  };

  const handleDemote = async (userId) => {
    if (!window.confirm('Uklonite admin status?')) return;
    try {
      await demoteFromAdmin(userId);
      loadUsers();
      setSelectedUser(null);
      toast.success('Admin status uklonjen!');
    } catch (error) {
      toast.error('Greška: ' + error.message);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('SIGURNI ste? Ova akcija je NEPOVRATNA!')) return;
    try {
      await deleteUser(userId);
      loadUsers();
      toast.success('Korisnik obrisan!');
    } catch (error) {
      toast.error('Greška: ' + error.message);
    }
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setEditForm({ name: u.name || '', phone: u.phone || '', address: u.address || '', role: u.role || 'client' });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await updateUser(editingUser.id, editForm);
      loadUsers();
      setEditingUser(null);
      toast.success('Sačuvano!');
    } catch (error) {
      toast.error('Greška: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone?.includes(searchTerm)
  );

  const getRoleBadge = (role) => {
    const config = {
      god: { classes: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white', label: 'GOD' },
      admin: { classes: 'bg-gradient-to-r from-red-500 to-orange-500 text-white', label: 'Admin' },
      manager: { classes: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white', label: 'Menadžer' },
      client: { classes: 'bg-slate-100 text-slate-600', label: 'Klijent' },
    };
    const { classes, label } = config[role] || config.client;
    return <span className={`badge ${classes}`}>{label}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <Sidebar activeItem="users" user={user} isGod={isGod()} onLogout={handleLogout} />

      <main className="lg:ml-72 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-100">
          <div className="px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="pt-10 lg:pt-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Korisnici</h1>
                <p className="text-slate-500 mt-1">Upravljanje korisnicima sistema</p>
              </div>
              <button onClick={loadUsers} disabled={loading} className="btn-secondary">
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                Osveži
              </button>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pretraži po imenu ili telefonu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-11"
                />
              </div>
              <div className="sm:w-48 relative">
                <Filter size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="input pl-11 appearance-none cursor-pointer"
                >
                  <option value="">Sve uloge</option>
                  <option value="god">GOD</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Menadžer</option>
                  <option value="client">Klijent</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl mb-6">
            <Users size={20} className="text-emerald-600" />
            <span className="text-emerald-800 font-medium">{filteredUsers.length} korisnika</span>
          </div>

          {/* Table/Cards */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {loading ? (
              <div className="p-8">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 py-4 border-b border-slate-50">
                    <div className="skeleton w-10 h-10 rounded-full" />
                    <div className="flex-1"><div className="skeleton w-32 h-4 mb-2" /><div className="skeleton w-24 h-3" /></div>
                    <div className="skeleton w-20 h-6 rounded-full" />
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="empty-state"><Users size={64} className="text-slate-300" /><h3>Nema korisnika</h3><p>Nema rezultata za vašu pretragu</p></div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Ime</th>
                        <th>Telefon</th>
                        <th>Uloga</th>
                        <th>Firma</th>
                        <th>Adresa</th>
                        <th className="text-right">Akcije</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u.id}>
                          <td className="font-medium text-slate-900">{u.name}</td>
                          <td className="text-slate-600">{u.phone}</td>
                          <td>{getRoleBadge(u.role)}</td>
                          <td className="text-slate-600">{u.company?.name || '—'}</td>
                          <td className="text-slate-500 max-w-xs truncate">{u.address || '—'}</td>
                          <td>
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => openEditModal(u)} className="btn-icon success" title="Izmeni"><Pencil size={16} /></button>
                              {isGod() && u.role !== 'god' && (
                                <>
                                  <button onClick={() => setSelectedUser(u)} className="btn-ghost text-sm">Uloga</button>
                                  <button onClick={() => handleDelete(u.id)} className="btn-icon danger" title="Obriši"><Trash2 size={16} /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden divide-y divide-slate-100">
                  {filteredUsers.map(u => (
                    <div key={u.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div><p className="font-semibold text-slate-900">{u.name}</p><p className="text-sm text-slate-500">{u.phone}</p></div>
                        {getRoleBadge(u.role)}
                      </div>
                      {u.company?.name && <p className="text-sm text-slate-600 mb-1">🏢 {u.company.name}</p>}
                      {u.address && <p className="text-sm text-slate-500 truncate">📍 {u.address}</p>}
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => openEditModal(u)} className="btn-secondary flex-1 text-sm py-2">Izmeni</button>
                        {isGod() && u.role !== 'god' && (
                          <>
                            <button onClick={() => setSelectedUser(u)} className="btn-secondary flex-1 text-sm py-2">Uloga</button>
                            <button onClick={() => handleDelete(u.id)} className="btn-icon danger"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Role Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Upravljanje ulogom</h3>
              <button onClick={() => setSelectedUser(null)} className="btn-icon"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="mb-4"><p className="text-sm text-slate-500">Korisnik</p><p className="font-semibold text-slate-900">{selectedUser.name}</p></div>
              <div className="mb-6"><p className="text-sm text-slate-500 mb-1">Trenutna uloga</p>{getRoleBadge(selectedUser.role)}</div>
              {selectedUser.role === 'admin' ? (
                <button onClick={() => handleDemote(selectedUser.id)} className="w-full flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors">
                  <ChevronDown size={18} /> Ukloni Admin status
                </button>
              ) : selectedUser.role === 'manager' ? (
                <button onClick={() => handlePromote(selectedUser.id)} className="btn-primary w-full py-3">
                  <ChevronUp size={18} /> Promoviši u Admina
                </button>
              ) : (
                <p className="text-center text-slate-500 py-4">Samo menadžeri mogu biti promovisani</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Pencil size={18} /> Izmena korisnika</h3>
              <button onClick={() => setEditingUser(null)} className="btn-icon"><X size={20} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Ime</label>
                <div className="relative">
                  <Users size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="input pl-11" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefon</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="input pl-11" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Adresa</label>
                <div className="relative">
                  <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="input pl-11" />
                </div>
              </div>
              {editingUser.role !== 'god' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Uloga</label>
                  <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="input">
                    <option value="client">Klijent</option>
                    <option value="manager">Menadžer</option>
                    {isGod() && <option value="admin">Admin</option>}
                  </select>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setEditingUser(null)} className="btn-secondary">Otkaži</button>
              <button onClick={handleSaveEdit} disabled={saving} className="btn-primary">
                {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />} Sačuvaj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
