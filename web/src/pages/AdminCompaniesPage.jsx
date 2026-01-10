import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import {
  Building2, RefreshCw, Search, X, Users, Trash2, Pencil,
  Save, Package, UserCheck
} from 'lucide-react';

const AdminCompaniesPage = () => {
  const {
    user, logout, fetchAllCompanies, isGod,
    deleteCompany, updateCompany, fetchCompanyDetails
  } = useAuth();
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

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const data = await fetchAllCompanies();
      setCompanies(data);
    } catch (error) {
      console.error('Error loading companies:', error);
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

  const handleDelete = async (e, code) => {
    e.stopPropagation();
    if (!window.confirm('Da li ste SIGURNI da zelite da obrisete ovu firmu? Svi korisnici u okviru firme ce takodje biti obrisani! Ova akcija je NEPOVRATNA!')) return;
    try {
      await deleteCompany(code);
      loadCompanies();
      setSelectedCompany(null);
    } catch (error) {
      alert('Greska: ' + error.message);
    }
  };

  const openDetails = async (company) => {
    setSelectedCompany(company);
    setLoadingDetails(true);
    try {
      const details = await fetchCompanyDetails(company.code);
      setCompanyDetails(details);
    } catch (error) {
      console.error('Error loading details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const openEditModal = (company) => {
    setEditingCompany(company);
    setEditForm({
      name: company.name || '',
      pib: company.pib || '',
      equipment_types: company.equipment_types || []
    });
  };

  const handleSaveEdit = async () => {
    if (!editingCompany) return;
    setSaving(true);
    try {
      await updateCompany(editingCompany.code, editForm);
      loadCompanies();
      setEditingCompany(null);
    } catch (error) {
      alert('Greska: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEquipmentChange = (value) => {
    const items = value.split(',').map(s => s.trim()).filter(Boolean);
    setEditForm({ ...editForm, equipment_types: items });
  };

  const filteredCompanies = companies.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.pib?.includes(searchTerm)
  );

  return (
    <div className="dashboard-layout">
      <Sidebar
        activeItem="companies"
        user={user}
        isGod={isGod()}
        onLogout={handleLogout}
      />

      <main className="main-content">
        <header className="page-header">
          <div>
            <h1>Firme</h1>
            <p>Pregled i upravljanje svim registrovanim firmama</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={loadCompanies} disabled={loading}>
              <RefreshCw size={18} className={loading ? 'spin' : ''} />
              Osvezi
            </button>
          </div>
        </header>

        <div className="page-content">
          {/* Search */}
          <div className="content-card" style={{ marginBottom: 24 }}>
            <div className="filters-bar">
              <div className="filter-group" style={{ flex: 1 }}>
                <label>Pretraga</label>
                <div className="search-input">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Pretrazi po imenu, kodu ili PIB-u..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="history-stats">
            <div className="history-stat">
              <div className="value">{filteredCompanies.length}</div>
              <div className="label">Ukupno firmi</div>
            </div>
          </div>

          {/* Companies Table */}
          <div className="content-card">
            <div className="card-header">
              <h2>Lista firmi</h2>
            </div>

            {loading ? (
              <div className="empty-state">
                <RefreshCw size={48} className="spin" />
                <p>Ucitavanje...</p>
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="empty-state">
                <Building2 size={64} />
                <h3>Nema firmi</h3>
                <p>Nema registrovanih firmi</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ime firme</th>
                      <th>Kod</th>
                      <th>PIB</th>
                      <th>Menadzeri</th>
                      <th>Klijenti</th>
                      <th>Oprema</th>
                      <th>Akcije</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.map(company => (
                      <tr key={company.id}>
                        <td>
                          <div className="cell-main">{company.name}</div>
                        </td>
                        <td>
                          <code className="code-badge">{company.code}</code>
                        </td>
                        <td>{company.pib || '-'}</td>
                        <td>{company.managerCount}</td>
                        <td>{company.clientCount}</td>
                        <td>{company.equipment_types?.length || 0} tipova</td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              className="btn btn-sm"
                              onClick={() => openDetails(company)}
                            >
                              Detalji
                            </button>
                            <button
                              className="btn-icon success"
                              onClick={() => openEditModal(company)}
                              title="Izmeni"
                            >
                              <Pencil size={16} />
                            </button>
                            {isGod() && (
                              <button
                                className="btn-icon danger"
                                onClick={(e) => handleDelete(e, company.code)}
                                title="Obrisi"
                              >
                                <Trash2 size={16} />
                              </button>
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

      {/* Company Detail Modal */}
      {selectedCompany && (
        <div className="modal-overlay" onClick={() => { setSelectedCompany(null); setCompanyDetails(null); }}>
          <div className="modal wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Building2 size={20} />
                {selectedCompany.name}
              </h3>
              <button className="modal-close" onClick={() => { setSelectedCompany(null); setCompanyDetails(null); }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {loadingDetails ? (
                <div className="empty-state" style={{ padding: 40 }}>
                  <RefreshCw size={32} className="spin" />
                  <p>Ucitavanje detalja...</p>
                </div>
              ) : companyDetails ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    <div className="detail-group">
                      <div className="detail-label">Kod firme</div>
                      <code className="code-badge large">{companyDetails.code}</code>
                    </div>
                    <div className="detail-group">
                      <div className="detail-label">PIB</div>
                      <div className="detail-value">{companyDetails.pib || '-'}</div>
                    </div>
                  </div>

                  {/* Equipment Types */}
                  <div className="detail-group" style={{ marginTop: 24 }}>
                    <div className="detail-label">
                      <Package size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                      Tipovi opreme firme
                    </div>
                    {companyDetails.equipment_types?.length > 0 ? (
                      <div className="equipment-tags">
                        {companyDetails.equipment_types.map((eq, i) => (
                          <span key={i} className="equipment-tag">{eq}</span>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--gray-500)' }}>Nema definisanih tipova opreme</p>
                    )}
                  </div>

                  {/* Managers */}
                  <div className="detail-group" style={{ marginTop: 24 }}>
                    <div className="detail-label">
                      <UserCheck size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                      Menadzeri ({companyDetails.managers?.length || 0})
                    </div>
                    {companyDetails.managers?.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {companyDetails.managers.map(m => (
                          <div key={m.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '10px 14px',
                            background: 'var(--gray-50)',
                            borderRadius: 8
                          }}>
                            <span style={{ fontWeight: 600 }}>{m.name}</span>
                            <span style={{ color: 'var(--gray-500)' }}>{m.phone}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--gray-500)' }}>Nema menadzera</p>
                    )}
                  </div>

                  {/* Clients with Equipment */}
                  <div className="detail-group" style={{ marginTop: 24 }}>
                    <div className="detail-label">
                      <Users size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                      Klijenti ({companyDetails.clients?.length || 0})
                    </div>
                    {companyDetails.clients?.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {companyDetails.clients.map(c => (
                          <div key={c.id} style={{
                            padding: '12px 14px',
                            background: 'var(--gray-50)',
                            borderRadius: 8
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                              <span style={{ fontWeight: 600 }}>{c.name}</span>
                              <span style={{ color: 'var(--gray-500)' }}>{c.phone}</span>
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 8 }}>
                              {c.address || 'Nema adrese'}
                            </div>
                            {c.equipment_types?.length > 0 && (
                              <div className="equipment-tags" style={{ marginTop: 8 }}>
                                {c.equipment_types.map((eq, i) => (
                                  <span key={i} className="equipment-tag">{eq}</span>
                                ))}
                              </div>
                            )}
                            {c.manager_note && (
                              <div style={{
                                marginTop: 8,
                                padding: 8,
                                background: 'var(--orange-light)',
                                borderRadius: 6,
                                fontSize: 13
                              }}>
                                📝 {c.manager_note}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--gray-500)' }}>Nema klijenata</p>
                    )}
                  </div>

                  {/* Delete Button */}
                  {isGod() && (
                    <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--gray-200)' }}>
                      <button
                        className="btn btn-danger"
                        style={{ width: '100%' }}
                        onClick={() => {
                          if (window.confirm(`Da li ste SIGURNI da zelite da obrisete firmu "${companyDetails.name}"?\n\nSvi korisnici ove firme ce takodje biti obrisani!\n\nOva akcija je NEPOVRATNA!`)) {
                            deleteCompany(companyDetails.code)
                              .then(() => {
                                loadCompanies();
                                setSelectedCompany(null);
                                setCompanyDetails(null);
                              })
                              .catch(err => alert('Greska: ' + err.message));
                          }
                        }}
                      >
                        <Trash2 size={18} />
                        Obrisi firmu
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p>Greska pri ucitavanju</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Company Modal */}
      {editingCompany && (
        <div className="modal-overlay" onClick={() => setEditingCompany(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Pencil size={20} />
                Izmena firme
              </h3>
              <button className="modal-close" onClick={() => setEditingCompany(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Ime firme</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Ime firme"
                  style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--gray-300)' }}
                />
              </div>
              <div className="form-group">
                <label>PIB</label>
                <input
                  type="text"
                  value={editForm.pib}
                  onChange={(e) => setEditForm({ ...editForm, pib: e.target.value })}
                  placeholder="PIB"
                  style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--gray-300)' }}
                />
              </div>
              <div className="form-group">
                <label>Tipovi opreme (odvojeni zarezom)</label>
                <textarea
                  value={editForm.equipment_types?.join(', ') || ''}
                  onChange={(e) => handleEquipmentChange(e.target.value)}
                  placeholder="Kontejner, Kanta, Presa..."
                  rows={3}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: 24 }}>
                <button className="btn btn-secondary" onClick={() => setEditingCompany(null)}>
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

export default AdminCompaniesPage;
