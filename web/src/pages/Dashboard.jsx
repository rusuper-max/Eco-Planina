import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Truck, Users, Settings, LogOut, Leaf, MapPin, Bell, Search, Menu, X, Plus, Recycle, BarChart3,
    FileText, Building2, AlertCircle, CheckCircle2, Clock, Package, Send, Trash2, Eye, Edit2, Copy, ChevronRight,
    Phone, Calendar, Filter, RefreshCw, ArrowLeft
} from 'lucide-react';

// ==================== REUSABLE COMPONENTS ====================

const StatCard = ({ label, value, icon, trend, color = 'emerald' }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-slate-500 text-sm font-medium">{label}</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-1">{value}</h3>
            </div>
            <div className={`p-3 bg-${color}-50 rounded-xl`}>{icon}</div>
        </div>
        {trend && <p className="text-xs text-slate-400">{trend}</p>}
    </div>
);

const SidebarItem = ({ icon: Icon, label, active, onClick, badge }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
    >
        <Icon size={20} />
        <span className="flex-1 text-left">{label}</span>
        {badge > 0 && <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">{badge}</span>}
    </button>
);

const StatusBadge = ({ status, urgency }) => {
    if (status === 'processed') return <span className="px-3 py-1 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full flex items-center gap-1"><CheckCircle2 size={12} /> Obrađeno</span>;
    if (status === 'in_progress') return <span className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full flex items-center gap-1"><Truck size={12} /> U toku</span>;
    const cfg = { '24h': 'text-red-700 bg-red-100', '48h': 'text-amber-700 bg-amber-100', '72h': 'text-slate-600 bg-slate-100' };
    const lbl = { '24h': 'Hitno', '48h': 'Srednje', '72h': 'Normalno' };
    return <span className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${cfg[urgency] || cfg['72h']}`}><Clock size={12} /> {lbl[urgency] || 'Na čekanju'}</span>;
};

const Modal = ({ open, onClose, title, children }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
                <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-800">{title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

const EmptyState = ({ icon: Icon, title, desc, action }) => (
    <div className="text-center py-16">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
            <Icon size={40} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-500 max-w-sm mx-auto mb-6">{desc}</p>
        {action}
    </div>
);

// ==================== CLIENT COMPONENTS ====================

const WASTE_TYPES = [
    { id: 'cardboard', label: 'Karton', icon: '📦', desc: 'Kartonske kutije' },
    { id: 'plastic', label: 'Plastika', icon: '♻️', desc: 'Najlon i folije' },
    { id: 'glass', label: 'Staklo', icon: '🍾', desc: 'Staklene flaše' },
];

const FILL_LEVELS = [
    { value: 50, label: '~50%', desc: 'Polupuno' },
    { value: 75, label: '~75%', desc: 'Skoro puno' },
    { value: 100, label: '100%', desc: 'Potpuno' },
];

const URGENCY_OPTIONS = [
    { value: '24h', label: 'Hitno', desc: '24 sata', color: 'red' },
    { value: '48h', label: 'Srednje', desc: '48 sati', color: 'amber' },
    { value: '72h', label: 'Normalno', desc: '72 sata', color: 'emerald' },
];

const NewRequestForm = ({ onSubmit, loading }) => {
    const [wasteType, setWasteType] = useState(null);
    const [fillLevel, setFillLevel] = useState(null);
    const [urgency, setUrgency] = useState(null);
    const [note, setNote] = useState('');

    const handleSubmit = () => {
        if (!wasteType || !fillLevel || !urgency) return;
        const waste = WASTE_TYPES.find(w => w.id === wasteType);
        onSubmit({ wasteType, wasteLabel: waste?.label, fillLevel, urgency, note });
    };

    return (
        <div className="space-y-8">
            {/* Waste Type */}
            <div>
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Package size={18} /> Tip otpada</h3>
                <div className="grid grid-cols-3 gap-3">
                    {WASTE_TYPES.map(w => (
                        <button
                            key={w.id}
                            onClick={() => setWasteType(w.id)}
                            className={`p-4 rounded-xl border-2 transition-all text-center ${wasteType === w.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                            <span className="text-3xl mb-2 block">{w.icon}</span>
                            <span className="text-sm font-medium text-slate-700">{w.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Fill Level */}
            <div>
                <h3 className="font-semibold text-slate-800 mb-4">Popunjenost</h3>
                <div className="grid grid-cols-3 gap-3">
                    {FILL_LEVELS.map(f => (
                        <button
                            key={f.value}
                            onClick={() => setFillLevel(f.value)}
                            className={`p-4 rounded-xl border-2 transition-all text-center ${fillLevel === f.value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                            <span className="text-lg font-bold text-slate-800">{f.label}</span>
                            <span className="text-xs text-slate-500 block mt-1">{f.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Urgency */}
            <div>
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Clock size={18} /> Hitnost</h3>
                <div className="grid grid-cols-3 gap-3">
                    {URGENCY_OPTIONS.map(u => (
                        <button
                            key={u.value}
                            onClick={() => setUrgency(u.value)}
                            className={`p-4 rounded-xl border-2 transition-all text-center ${urgency === u.value ? `border-${u.color}-500 bg-${u.color}-50` : 'border-slate-200 hover:border-slate-300'}`}
                        >
                            <span className={`text-sm font-bold ${urgency === u.value ? `text-${u.color}-700` : 'text-slate-800'}`}>{u.label}</span>
                            <span className="text-xs text-slate-500 block mt-1">{u.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Note */}
            <div>
                <h3 className="font-semibold text-slate-800 mb-4">Napomena (opciono)</h3>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Dodatne informacije..."
                    className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
                    rows={3}
                />
            </div>

            {/* Submit */}
            <button
                onClick={handleSubmit}
                disabled={loading || !wasteType || !fillLevel || !urgency}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium py-4 rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
            >
                {loading ? <RefreshCw className="animate-spin" size={20} /> : <><Send size={20} /> Pošalji zahtev</>}
            </button>
        </div>
    );
};

const ClientRequestsList = ({ requests }) => {
    if (!requests?.length) {
        return <EmptyState icon={CheckCircle2} title="Nema aktivnih zahteva" desc="Vaši zahtevi će se prikazati ovde" />;
    }
    return (
        <div className="space-y-4">
            {requests.map(req => (
                <div key={req.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{WASTE_TYPES.find(w => w.id === req.waste_type)?.icon || '📦'}</span>
                            <div>
                                <h4 className="font-semibold text-slate-800">{req.waste_label || req.waste_type}</h4>
                                <p className="text-xs text-slate-500">{new Date(req.created_at).toLocaleString('sr-RS')}</p>
                            </div>
                        </div>
                        <StatusBadge status={req.status} urgency={req.urgency} />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span className="flex items-center gap-1"><Package size={14} /> {req.fill_level}%</span>
                        {req.note && <span className="flex items-center gap-1 truncate"><FileText size={14} /> {req.note}</span>}
                    </div>
                </div>
            ))}
        </div>
    );
};

// ==================== MANAGER COMPONENTS ====================

const ManagerRequestsTable = ({ requests, onProcess, onDelete }) => {
    if (!requests?.length) {
        return <EmptyState icon={Truck} title="Nema zahteva" desc="Kada klijenti pošalju zahteve, pojaviće se ovde" />;
    }
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4">Klijent</th>
                            <th className="px-6 py-4">Tip</th>
                            <th className="px-6 py-4">Popunjenost</th>
                            <th className="px-6 py-4">Hitnost</th>
                            <th className="px-6 py-4">Datum</th>
                            <th className="px-6 py-4 text-right">Akcije</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {requests.map(req => (
                            <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div>
                                        <p className="font-medium text-slate-900">{req.client_name}</p>
                                        <p className="text-xs text-slate-500">{req.client_address}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="flex items-center gap-2">
                                        {WASTE_TYPES.find(w => w.id === req.waste_type)?.icon || '📦'}
                                        {req.waste_label || req.waste_type}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${req.fill_level > 80 ? 'bg-red-500' : req.fill_level > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${req.fill_level}%` }} />
                                        </div>
                                        <span className="text-xs">{req.fill_level}%</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4"><StatusBadge urgency={req.urgency} /></td>
                                <td className="px-6 py-4 text-slate-500 text-xs">{new Date(req.created_at).toLocaleDateString('sr-RS')}</td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => onProcess(req)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Obradi">
                                            <CheckCircle2 size={18} />
                                        </button>
                                        <button onClick={() => onDelete(req.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Obriši">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ClientsGrid = ({ clients }) => {
    if (!clients?.length) {
        return <EmptyState icon={Users} title="Nema klijenata" desc="Klijenti koji se registruju sa vašim kodom će se prikazati ovde" />;
    }
    return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map(client => (
                <div key={client.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-lg">
                            {client.name?.charAt(0) || 'K'}
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-800">{client.name}</h4>
                            <p className="text-xs text-slate-500 flex items-center gap-1"><Phone size={12} /> {client.phone}</p>
                        </div>
                    </div>
                    <p className="text-sm text-slate-600 flex items-center gap-1"><MapPin size={14} /> {client.address || 'Nema adresu'}</p>
                </div>
            ))}
        </div>
    );
};

// ==================== ADMIN COMPONENTS ====================

const AdminCompaniesTable = ({ companies, onView }) => {
    if (!companies?.length) {
        return <EmptyState icon={Building2} title="Nema firmi" desc="Registrovane firme će se prikazati ovde" />;
    }
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4">Firma</th>
                            <th className="px-6 py-4">ECO Kod</th>
                            <th className="px-6 py-4">Menadžeri</th>
                            <th className="px-6 py-4">Klijenti</th>
                            <th className="px-6 py-4 text-right">Akcije</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {companies.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-900">{c.name}</td>
                                <td className="px-6 py-4">
                                    <code className="px-2 py-1 bg-slate-100 rounded text-xs font-mono">{c.code}</code>
                                </td>
                                <td className="px-6 py-4">{c.managerCount || 0}</td>
                                <td className="px-6 py-4">{c.clientCount || 0}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => onView(c)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><Eye size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const AdminUsersTable = ({ users, onEdit, onDelete, isGod }) => {
    if (!users?.length) {
        return <EmptyState icon={Users} title="Nema korisnika" desc="Registrovani korisnici će se prikazati ovde" />;
    }
    const roleLabels = { god: 'GOD', admin: 'Admin', manager: 'Menadžer', client: 'Klijent' };
    const roleColors = { god: 'purple', admin: 'red', manager: 'blue', client: 'emerald' };
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4">Korisnik</th>
                            <th className="px-6 py-4">Telefon</th>
                            <th className="px-6 py-4">Uloga</th>
                            <th className="px-6 py-4">Firma</th>
                            {isGod && <th className="px-6 py-4 text-right">Akcije</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 bg-${roleColors[u.role] || 'slate'}-100 rounded-full flex items-center justify-center text-${roleColors[u.role] || 'slate'}-700 font-bold text-sm`}>
                                            {u.name?.charAt(0) || 'U'}
                                        </div>
                                        <span className="font-medium text-slate-900">{u.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600">{u.phone}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${roleColors[u.role] || 'slate'}-100 text-${roleColors[u.role] || 'slate'}-700`}>
                                        {roleLabels[u.role] || u.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600">{u.company?.name || '-'}</td>
                                {isGod && (
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => onDelete(u.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const MasterCodesTable = ({ codes, onGenerate, onCopy, onDelete, isGod }) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800">Master Kodovi</h2>
            <button onClick={onGenerate} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-sm">
                <Plus size={18} /> Generiši kod
            </button>
        </div>
        {!codes?.length ? (
            <EmptyState icon={FileText} title="Nema kodova" desc="Generiši prvi Master Code" />
        ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Kod</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Firma</th>
                                <th className="px-6 py-4">Kreiran</th>
                                <th className="px-6 py-4 text-right">Akcije</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {codes.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <code className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm font-mono font-medium">{c.code}</code>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${c.status === 'used' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {c.status === 'used' ? 'Iskorišćen' : 'Dostupan'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{c.company?.name || '-'}</td>
                                    <td className="px-6 py-4 text-slate-500 text-xs">{new Date(c.created_at).toLocaleDateString('sr-RS')}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button onClick={() => onCopy(c.code)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><Copy size={16} /></button>
                                            {isGod && c.status !== 'used' && (
                                                <button onClick={() => onDelete(c.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </div>
);

// ==================== MAIN DASHBOARD ====================

export default function Dashboard() {
    const navigate = useNavigate();
    const {
        user, logout, companyName, companyCode, pickupRequests, clientRequests, processedNotification, clearProcessedNotification,
        addPickupRequest, markRequestAsProcessed, removePickupRequest, fetchCompanyClients, getAdminStats,
        fetchAllCompanies, fetchAllUsers, fetchAllMasterCodes, generateMasterCode, deleteMasterCode, deleteUser, isGod
    } = useAuth();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [clients, setClients] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [users, setUsers] = useState([]);
    const [masterCodes, setMasterCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);

    const userRole = user?.role === 'god' || user?.role === 'admin' ? 'admin' : user?.role || 'client';

    useEffect(() => { loadData(); }, [userRole, activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (userRole === 'admin') {
                const s = await getAdminStats();
                setStats(s);
                if (activeTab === 'companies') setCompanies(await fetchAllCompanies());
                if (activeTab === 'users') setUsers(await fetchAllUsers());
                if (activeTab === 'codes') setMasterCodes(await fetchAllMasterCodes());
            } else if (userRole === 'manager') {
                const c = await fetchCompanyClients();
                setClients(c || []);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleLogout = () => { if (window.confirm('Odjaviti se?')) { logout(); navigate('/'); } };

    const handleNewRequest = async (data) => {
        setSubmitLoading(true);
        try {
            await addPickupRequest(data);
            setModalOpen(false);
            setActiveTab('requests');
        } catch (err) { alert(err.message); }
        finally { setSubmitLoading(false); }
    };

    const handleProcessRequest = async (req) => {
        if (!window.confirm(`Označiti zahtev od "${req.client_name}" kao obrađen?`)) return;
        try { await markRequestAsProcessed(req); } catch (err) { alert(err.message); }
    };

    const handleDeleteRequest = async (id) => {
        if (!window.confirm('Obrisati zahtev?')) return;
        try { await removePickupRequest(id); } catch (err) { alert(err.message); }
    };

    const handleGenerateCode = async () => {
        try {
            await generateMasterCode();
            setMasterCodes(await fetchAllMasterCodes());
        } catch (err) { alert(err.message); }
    };

    const handleCopyCode = (code) => {
        navigator.clipboard.writeText(code);
        alert('Kod kopiran!');
    };

    const handleDeleteCode = async (id) => {
        if (!window.confirm('Obrisati kod?')) return;
        try {
            await deleteMasterCode(id);
            setMasterCodes(await fetchAllMasterCodes());
        } catch (err) { alert(err.message); }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm('Obrisati korisnika?')) return;
        try {
            await deleteUser(id);
            setUsers(await fetchAllUsers());
        } catch (err) { alert(err.message); }
    };

    // Menus & Stats
    const getMenu = () => {
        if (userRole === 'admin') return [
            { id: 'dashboard', icon: LayoutDashboard, label: 'Pregled' },
            { id: 'companies', icon: Building2, label: 'Firme' },
            { id: 'users', icon: Users, label: 'Korisnici' },
            { id: 'codes', icon: FileText, label: 'Master Kodovi' },
        ];
        if (userRole === 'manager') return [
            { id: 'dashboard', icon: LayoutDashboard, label: 'Pregled' },
            { id: 'requests', icon: Truck, label: 'Zahtevi', badge: pickupRequests?.filter(r => r.status === 'pending').length },
            { id: 'clients', icon: Users, label: 'Klijenti' },
            { id: 'map', icon: MapPin, label: 'Mapa' },
        ];
        return [
            { id: 'dashboard', icon: LayoutDashboard, label: 'Početna' },
            { id: 'new', icon: Plus, label: 'Novi zahtev' },
            { id: 'requests', icon: Truck, label: 'Moji zahtevi', badge: clientRequests?.length },
        ];
    };

    const getStats = () => {
        if (userRole === 'admin' && stats) return [
            { label: 'Firme', value: stats.totalCompanies, icon: <Building2 className="w-6 h-6 text-emerald-600" /> },
            { label: 'Korisnici', value: stats.totalUsers, icon: <Users className="w-6 h-6 text-blue-600" /> },
            { label: 'Master kodovi', value: stats.totalCodes, icon: <FileText className="w-6 h-6 text-orange-600" /> },
            { label: 'Dostupni kodovi', value: stats.availableCodes, icon: <Recycle className="w-6 h-6 text-green-600" /> },
        ];
        if (userRole === 'manager') {
            const pending = pickupRequests?.filter(r => r.status === 'pending') || [];
            const urgent = pending.filter(r => r.urgency === '24h').length;
            return [
                { label: 'Zahtevi', value: pending.length, icon: <Truck className="w-6 h-6 text-emerald-600" /> },
                { label: 'Klijenti', value: clients.length, icon: <Users className="w-6 h-6 text-blue-600" /> },
                { label: 'Hitni', value: urgent, icon: <AlertCircle className="w-6 h-6 text-red-600" /> },
            ];
        }
        return [
            { label: 'Aktivni zahtevi', value: clientRequests?.length || 0, icon: <Truck className="w-6 h-6 text-emerald-600" /> },
        ];
    };

    const currentMenu = getMenu();
    const currentStats = getStats();
    const pendingRequests = pickupRequests?.filter(r => r.status === 'pending') || [];

    // Render content based on tab
    const renderContent = () => {
        // Client tabs
        if (userRole === 'client') {
            if (activeTab === 'new') return <NewRequestForm onSubmit={handleNewRequest} loading={submitLoading} />;
            if (activeTab === 'requests') return <ClientRequestsList requests={clientRequests} />;
            return (
                <div className="space-y-8">
                    <div className="grid md:grid-cols-2 gap-6">
                        {currentStats.map((s, i) => <StatCard key={i} {...s} />)}
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                            <Recycle size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">
                            {clientRequests?.length > 0 ? `Imate ${clientRequests.length} aktivnih zahteva` : 'Sve je pod kontrolom'}
                        </h3>
                        <p className="text-slate-500 max-w-md mx-auto mb-6">
                            {clientRequests?.length > 0 ? 'Menadžer je obavešten o vašim zahtevima.' : 'Kreirajte novi zahtev kada vam je potrebno preuzimanje.'}
                        </p>
                        <button
                            onClick={() => setActiveTab('new')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-medium inline-flex items-center gap-2"
                        >
                            <Plus size={20} /> Novi zahtev
                        </button>
                    </div>
                </div>
            );
        }

        // Manager tabs
        if (userRole === 'manager') {
            if (activeTab === 'requests') return <ManagerRequestsTable requests={pendingRequests} onProcess={handleProcessRequest} onDelete={handleDeleteRequest} />;
            if (activeTab === 'clients') return <ClientsGrid clients={clients} />;
            if (activeTab === 'map') return (
                <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
                    <MapPin size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Mapa klijenata</h3>
                    <p className="text-slate-500">Integracija mape dolazi uskoro...</p>
                </div>
            );
            return (
                <div className="space-y-8">
                    <div className="grid md:grid-cols-3 gap-6">
                        {currentStats.map((s, i) => <StatCard key={i} {...s} />)}
                    </div>
                    {pendingRequests.length > 0 && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-slate-800">Nedavni zahtevi</h2>
                                <button onClick={() => setActiveTab('requests')} className="text-emerald-600 text-sm font-medium hover:text-emerald-700 flex items-center gap-1">
                                    Vidi sve <ChevronRight size={16} />
                                </button>
                            </div>
                            <ManagerRequestsTable requests={pendingRequests.slice(0, 5)} onProcess={handleProcessRequest} onDelete={handleDeleteRequest} />
                        </div>
                    )}
                </div>
            );
        }

        // Admin tabs
        if (userRole === 'admin') {
            if (activeTab === 'companies') return <AdminCompaniesTable companies={companies} onView={(c) => alert(`Firma: ${c.name}\nKod: ${c.code}`)} />;
            if (activeTab === 'users') return <AdminUsersTable users={users} onDelete={handleDeleteUser} isGod={isGod()} />;
            if (activeTab === 'codes') return <MasterCodesTable codes={masterCodes} onGenerate={handleGenerateCode} onCopy={handleCopyCode} onDelete={handleDeleteCode} isGod={isGod()} />;
            return (
                <div className="space-y-8">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {currentStats.map((s, i) => <StatCard key={i} {...s} />)}
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 p-6">
                        <h2 className="font-bold text-slate-800 mb-4">Brze akcije</h2>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { icon: FileText, label: 'Generiši kod', onClick: handleGenerateCode },
                                { icon: Building2, label: 'Firme', onClick: () => setActiveTab('companies') },
                                { icon: Users, label: 'Korisnici', onClick: () => setActiveTab('users') },
                                { icon: BarChart3, label: 'Kodovi', onClick: () => setActiveTab('codes') },
                            ].map((a, i) => (
                                <button key={i} onClick={a.onClick} className="p-4 bg-slate-50 rounded-xl hover:bg-emerald-50 transition-colors text-left group">
                                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-slate-500 group-hover:text-emerald-600 shadow-sm mb-3">
                                        <a.icon size={20} />
                                    </div>
                                    <p className="font-semibold text-slate-800 group-hover:text-emerald-700">{a.label}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Overlay */}
            {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

            {/* Sidebar */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="h-full flex flex-col">
                    <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-sm">
                                <Leaf size={20} />
                            </div>
                            <span className="font-bold text-xl text-slate-800">EcoPlanina</span>
                        </div>
                        <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-slate-400"><X size={24} /></button>
                    </div>

                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {currentMenu.map((item) => (
                            <SidebarItem
                                key={item.id}
                                icon={item.icon}
                                label={item.label}
                                active={activeTab === item.id}
                                badge={item.badge}
                                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                            />
                        ))}
                    </nav>

                    <div className="p-4 border-t border-slate-100">
                        <SidebarItem icon={Settings} label="Podešavanja" active={false} onClick={() => { }} />
                        <SidebarItem icon={LogOut} label="Odjavi se" active={false} onClick={handleLogout} />
                    </div>
                </div>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg lg:hidden">
                            <Menu size={24} />
                        </button>
                        <div className="hidden md:flex items-center bg-slate-100 rounded-full px-4 py-2.5 w-72">
                            <Search size={18} className="text-slate-400 mr-2" />
                            <input type="text" placeholder="Pretraži..." className="bg-transparent border-none outline-none text-sm w-full" />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="relative p-2.5 text-slate-500 hover:bg-slate-50 rounded-full">
                            <Bell size={20} />
                            {(processedNotification || (userRole === 'manager' && pendingRequests.some(r => r.urgency === '24h'))) && (
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                            )}
                        </button>
                        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-slate-800">{user?.name}</p>
                                <p className="text-xs text-slate-500">{companyName || (userRole === 'admin' ? 'Administrator' : 'Korisnik')}</p>
                            </div>
                            <div className="w-11 h-11 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-lg border-2 border-white shadow-sm">
                                {user?.name?.charAt(0) || 'U'}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        {/* Page Title */}
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold text-slate-800">
                                {activeTab === 'dashboard' && `Dobrodošli, ${user?.name?.split(' ')[0]}!`}
                                {activeTab === 'new' && 'Novi zahtev'}
                                {activeTab === 'requests' && (userRole === 'client' ? 'Moji zahtevi' : 'Zahtevi za preuzimanje')}
                                {activeTab === 'clients' && 'Moji klijenti'}
                                {activeTab === 'map' && 'Mapa klijenata'}
                                {activeTab === 'companies' && 'Firme'}
                                {activeTab === 'users' && 'Korisnici'}
                                {activeTab === 'codes' && 'Master kodovi'}
                            </h1>
                            <p className="text-slate-500 mt-1">
                                {activeTab === 'dashboard' && 'Pregled vašeg EcoPlanina sistema'}
                                {activeTab === 'new' && 'Kreirajte zahtev za preuzimanje otpada'}
                                {activeTab === 'requests' && 'Pregled aktivnih zahteva'}
                            </p>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <RefreshCw className="animate-spin text-emerald-600" size={32} />
                            </div>
                        ) : (
                            renderContent()
                        )}
                    </div>
                </main>
            </div>

            {/* Processed Notification */}
            {processedNotification && (
                <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-50">
                    <CheckCircle2 size={24} />
                    <div>
                        <p className="font-semibold">Zahtev obrađen!</p>
                        <p className="text-sm opacity-90">"{processedNotification.wasteLabel}" je preuzet</p>
                    </div>
                    <button onClick={clearProcessedNotification} className="p-1 hover:bg-white/20 rounded-lg"><X size={20} /></button>
                </div>
            )}
        </div>
    );
}
