import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import toast from 'react-hot-toast';
import {
  Users, RefreshCw, Search, ChevronUp, ChevronDown, X,
  Trash2, Pencil, Save, Phone, MapPin, Building2
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

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

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
    if (window.confirm('Da li ste sigurni da zelite da se odjavite?')) {
      logout();
      navigate('/');
    }
  };

  const handlePromote = async (userId) => {
    if (!window.confirm('Da li ste sigurni da zelite da promovisite ovog korisnika u admina?')) return;
    try {
      await promoteToAdmin(userId);
      loadUsers();
      setSelectedUser(null);
      toast.success('Korisnik promovisan u admina!');
    } catch (error) {
      toast.error('Greška: ' + error.message);
    }
  };

  const handleDemote = async (userId) => {
    if (!window.confirm('Da li ste sigurni da zelite da uklonite admin status?')) return;
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
    if (!window.confirm('Da li ste SIGURNI da zelite da obrisete ovog korisnika? Ova akcija je NEPOVRATNA!')) return;
    try {
      await deleteUser(userId);
      loadUsers();
      setSelectedUser(null);
      toast.success('Korisnik obrisan!');
    } catch (error) {
      toast.error('Greška: ' + error.message);
    }
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setEditForm({
      name: u.name || '',
      phone: u.phone || '',
      address: u.address || '',
      role: u.role || 'client'
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await updateUser(editingUser.id, editForm);
      loadUsers();
      setEditingUser(null);
      toast.success('Korisnik uspešno ažuriran!');
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

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'god': return 'badge-god';
      case 'admin': return 'badge-admin';
      case 'manager': return 'badge-manager';
      default: return 'badge-client';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'god': return 'GOD';
      case 'admin': return 'Admin';
      case 'manager': return 'Menadzer';
      default: return 'Klijent';
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar
        activeItem="users"
        user={user}
        isGod={isGod()}
        onLogout={handleLogout}
      />

      <main className="main-content">
        <header className="page-header">
          <div>
            <h1>Korisnici</h1>
            <p>Upravljanje svim korisnicima sistema</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={loadUsers} disabled={loading}>
              <RefreshCw size={18} className={loading ? 'spin' : ''} />
              Osvezi
            </button>
          </div>
        </header>

        <div className="page-content">
          {/* Filters */}
          <div className="content-card" style={{ marginBottom: 24 }}>
            <div className="filters-bar">
              <div className="filter-group" style={{ flex: 1 }}>
                <label>Pretraga</label>
                <div className="search-input">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Pretrazi po imenu ili telefonu..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="filter-group">
                <label>Uloga</label>
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                  <option value="">Sve uloge</option>
                  <option value="god">GOD</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Menadzer</option>
                  <option value="client">Klijent</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="history-stats">
            <div className="history-stat">
              <div className="value">{filteredUsers.length}</div>
              <div className="label">Prikazano korisnika</div>
            </div>
          </div>

          {/* Users Table */}
          <div className="content-card">
            <div className="card-header">
              <h2>Lista korisnika</h2>
            </div>

            {loading ? (
              <div className="empty-state">
                <RefreshCw size={48} className="spin" />
                <p>Ucitavanje...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="empty-state">
                <Users size={64} />
                <h3>Nema korisnika</h3>
                <p>Nema korisnika koji odgovaraju kriterijumima</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ime</th>
                      <th>Telefon</th>
                      <th>Uloga</th>
                      <th>Firma</th>
                      <th>Adresa</th>
                      <th>Akcije</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div className="cell-main">{u.name}</div>
                        </td>
                        <td>{u.phone}</td>
                        <td>
                          <span className={`role-badge ${getRoleBadgeClass(u.role)}`}>
                            {getRoleLabel(u.role)}
                          </span>
                        </td>
                        <td>{u.company?.name || '-'}</td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.address || '-'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              className="btn-icon success"
                              onClick={() => openEditModal(u)}
                              title="Izmeni"
                            >
                              <Pencil size={16} />
                            </button>
                            {isGod() && u.role !== 'god' && (
                              <>
                                <button
                                  className="btn btn-sm"
                                  onClick={() => setSelectedUser(u)}
                                >
                                  Uloga
                                </button>
                                <button
                                  className="btn-icon danger"
                                  onClick={() => handleDelete(u.id)}
                                  title="Obrisi"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
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

      {/* Role Management Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Upravljanje ulogom</h3>
              <button className="modal-close" onClick={() => setSelectedUser(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-group">
                <div className="detail-label">Korisnik</div>
                <div className="detail-value">{selectedUser.name}</div>
              </div>
              <div className="detail-group">
                <div className="detail-label">Trenutna uloga</div>
                <span className={`role-badge ${getRoleBadgeClass(selectedUser.role)}`}>
                  {getRoleLabel(selectedUser.role)}
                </span>
              </div>

              <div className="modal-actions" style={{ marginTop: 28 }}>
                {selectedUser.role === 'admin' ? (
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDemote(selectedUser.id)}
                  >
                    <ChevronDown size={18} />
                    Ukloni Admin status
                  </button>
                ) : selectedUser.role === 'manager' ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => handlePromote(selectedUser.id)}
                  >
                    <ChevronUp size={18} />
                    Promovisi u Admina
                  </button>
                ) : (
                  <p style={{ color: 'var(--gray-500)' }}>
                    Samo menadžeri mogu biti promovisani u admine
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Pencil size={20} />
                Izmena korisnika
              </h3>
              <button className="modal-close" onClick={() => setEditingUser(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Ime</label>
                <div className="input-wrapper">
                  <Users size={18} />
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Ime korisnika"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Telefon</label>
                <div className="input-wrapper">
                  <Phone size={18} />
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="Broj telefona"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Adresa</label>
                <div className="input-wrapper">
                  <MapPin size={18} />
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    placeholder="Adresa"
                  />
                </div>
              </div>
              {editingUser.role !== 'god' && (
                <div className="form-group">
                  <label>Uloga</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--gray-300)' }}
                  >
                    <option value="client">Klijent</option>
                    <option value="manager">Menadzer</option>
                    {isGod() && <option value="admin">Admin</option>}
                  </select>
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: 24 }}>
                <button className="btn btn-secondary" onClick={() => setEditingUser(null)}>
                  Otkazi
                </button>
                <button className="btn btn-primary" onClick={handleSaveEdit} disabled={saving}>
                  {saving ? <RefreshCw size={18} className="spin" /> : <Save size={18} />}
                  Sacuvaj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
