import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    LayoutDashboard, Truck, Users, Settings, LogOut, Leaf, MapPin, Bell, Search, Menu, X, Plus, Recycle, BarChart3,
    FileText, Building2, AlertCircle, CheckCircle2, Clock, Package, Send, Trash2, Eye, Copy, ChevronRight,
    Phone, RefreshCw, Info, Box
} from 'lucide-react';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createIcon = (color) => new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const urgencyIcons = { '24h': createIcon('red'), '48h': createIcon('orange'), '72h': createIcon('green') };

// Helper
const getRemainingTime = (createdAt, urgency) => {
    const hours = urgency === '24h' ? 24 : urgency === '48h' ? 48 : 72;
    const deadline = new Date(new Date(createdAt).getTime() + hours * 60 * 60 * 1000);
    const diff = deadline - new Date();
    if (diff <= 0) return { text: '00:00:00', color: 'text-red-600', bg: 'bg-red-100' };
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    const text = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    if (h < 6) return { text, color: 'text-red-600', bg: 'bg-red-100' };
    if (h < 24) return { text, color: 'text-amber-600', bg: 'bg-amber-100' };
    return { text, color: 'text-emerald-600', bg: 'bg-emerald-100' };
};

const WASTE_TYPES = [
    { id: 'cardboard', label: 'Karton', icon: '📦' },
    { id: 'plastic', label: 'Plastika', icon: '♻️' },
    { id: 'glass', label: 'Staklo', icon: '🍾' },
];

// Components
const StatCard = ({ label, value, icon }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-slate-500 text-sm">{label}</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-1">{value}</h3>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">{icon}</div>
        </div>
    </div>
);

const SidebarItem = ({ icon: Icon, label, active, onClick, badge }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${active ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
        <Icon size={20} />
        <span className="flex-1 text-left">{label}</span>
        {badge > 0 && <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${active ? 'bg-white text-emerald-600' : 'bg-red-500 text-white'}`}>{badge}</span>}
    </button>
);

const Modal = ({ open, onClose, title, children }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                    <h2 className="text-lg font-bold">{title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

const EmptyState = ({ icon: Icon, title, desc }) => (
    <div className="text-center py-16">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400"><Icon size={40} /></div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-500">{desc}</p>
    </div>
);

// Client Form
const NewRequestForm = ({ onSubmit, loading }) => {
    const [wasteType, setWasteType] = useState(null);
    const [fillLevel, setFillLevel] = useState(null);
    const [urgency, setUrgency] = useState(null);
    const [note, setNote] = useState('');

    return (
        <div className="space-y-6 bg-white rounded-2xl p-6 border">
            <div>
                <h3 className="font-semibold mb-4">Tip otpada</h3>
                <div className="grid grid-cols-3 gap-3">
                    {WASTE_TYPES.map(w => (
                        <button key={w.id} onClick={() => setWasteType(w.id)} className={`p-4 rounded-xl border-2 text-center ${wasteType === w.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>
                            <span className="text-3xl block mb-2">{w.icon}</span>
                            <span className="text-sm font-medium">{w.label}</span>
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <h3 className="font-semibold mb-4">Popunjenost</h3>
                <div className="grid grid-cols-3 gap-3">
                    {[50, 75, 100].map(v => (
                        <button key={v} onClick={() => setFillLevel(v)} className={`p-4 rounded-xl border-2 text-center ${fillLevel === v ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>
                            <span className="text-lg font-bold">{v}%</span>
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <h3 className="font-semibold mb-4">Hitnost</h3>
                <div className="grid grid-cols-3 gap-3">
                    {[{ v: '24h', l: 'Hitno', c: 'red' }, { v: '48h', l: 'Srednje', c: 'amber' }, { v: '72h', l: 'Normalno', c: 'emerald' }].map(u => (
                        <button key={u.v} onClick={() => setUrgency(u.v)} className={`p-4 rounded-xl border-2 text-center ${urgency === u.v ? `border-${u.c}-500 bg-${u.c}-50` : 'border-slate-200'}`}>
                            <span className="text-sm font-bold">{u.l}</span>
                        </button>
                    ))}
                </div>
            </div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Napomena (opciono)" className="w-full p-4 border rounded-xl" rows={2} />
            <button onClick={() => wasteType && fillLevel && urgency && onSubmit({ wasteType, wasteLabel: WASTE_TYPES.find(w => w.id === wasteType)?.label, fillLevel, urgency, note })} disabled={loading || !wasteType || !fillLevel || !urgency} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium py-4 rounded-xl flex items-center justify-center gap-2">
                {loading ? <RefreshCw className="animate-spin" size={20} /> : <><Send size={20} /> Pošalji</>}
            </button>
        </div>
    );
};

// Manager Table
const ManagerRequestsTable = ({ requests, onProcess, onDelete, onView }) => {
    if (!requests?.length) return <EmptyState icon={Truck} title="Nema zahteva" desc="Zahtevi će se prikazati ovde" />;
    return (
        <div className="bg-white rounded-2xl border overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b">
                    <tr>
                        <th className="px-4 py-3 text-left">Klijent</th>
                        <th className="px-4 py-3 text-left">Tip</th>
                        <th className="px-4 py-3 text-left">%</th>
                        <th className="px-4 py-3 text-left">Preostalo</th>
                        <th className="px-4 py-3 text-left">Datum</th>
                        <th className="px-4 py-3 text-right">Akcije</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {requests.map(req => {
                        const rem = getRemainingTime(req.created_at, req.urgency);
                        return (
                            <tr key={req.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{req.client_name}</span>
                                        <button onClick={() => onView(req)} className="p-1 text-slate-400 hover:text-emerald-600"><Info size={14} /></button>
                                    </div>
                                </td>
                                <td className="px-4 py-3">{WASTE_TYPES.find(w => w.id === req.waste_type)?.icon} {req.waste_label}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-12 h-2 bg-slate-200 rounded-full"><div className={`h-full rounded-full ${req.fill_level > 80 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${req.fill_level}%` }} /></div>
                                        <span className="text-xs">{req.fill_level}%</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-medium rounded-full ${rem.bg} ${rem.color}`}>{rem.text}</span></td>
                                <td className="px-4 py-3 text-xs text-slate-500">{new Date(req.created_at).toLocaleDateString('sr-RS')}</td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => onProcess(req)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><CheckCircle2 size={18} /></button>
                                    <button onClick={() => onDelete(req.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

// Clients Table
const ClientsTable = ({ clients, onView, onDelete }) => {
    if (!clients?.length) return <EmptyState icon={Users} title="Nema klijenata" desc="Klijenti će se prikazati ovde" />;
    return (
        <div className="bg-white rounded-2xl border overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b">
                    <tr>
                        <th className="px-4 py-3 text-left">Klijent</th>
                        <th className="px-4 py-3 text-left">Telefon</th>
                        <th className="px-4 py-3 text-right">Akcije</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {clients.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium">{c.name}</td>
                            <td className="px-4 py-3 text-slate-600">{c.phone}</td>
                            <td className="px-4 py-3 text-right">
                                <button onClick={() => onView(c)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"><Eye size={18} /></button>
                                <button onClick={() => onDelete(c.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// Map
const MapView = ({ requests, clients, type }) => {
    const items = type === 'requests' ? requests : clients;
    return (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ height: '500px' }}>
            <MapContainer center={[44.8, 20.45]} zoom={11} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {items?.map((item, i) => (
                    <Marker key={item.id || i} position={[44.8 + (Math.random() - 0.5) * 0.2, 20.45 + (Math.random() - 0.5) * 0.2]} icon={type === 'requests' ? urgencyIcons[item.urgency] || urgencyIcons['72h'] : createIcon('blue')}>
                        <Popup>
                            <p className="font-bold">{type === 'requests' ? item.client_name : item.name}</p>
                            <p className="text-sm">{type === 'requests' ? item.waste_label : item.phone}</p>
                            <p className="text-xs text-gray-500">{type === 'requests' ? item.client_address : item.address}</p>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

// Request Details Modal
const RequestDetailsModal = ({ request, onClose }) => {
    if (!request) return null;
    const rem = getRemainingTime(request.created_at, request.urgency);
    return (
        <Modal open={!!request} onClose={onClose} title="Detalji zahteva">
            <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <span className="text-4xl">{WASTE_TYPES.find(w => w.id === request.waste_type)?.icon}</span>
                    <div>
                        <h3 className="font-bold text-lg">{request.waste_label}</h3>
                        <p className="text-sm text-slate-500">Popunjenost: {request.fill_level}%</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-xs text-slate-500">Klijent</p>
                        <p className="font-semibold">{request.client_name}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-xs text-slate-500">Preostalo</p>
                        <p className={`font-semibold ${rem.color}`}>{rem.text}</p>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500">Adresa</p>
                    <p className="font-medium">{request.client_address || 'Nije uneta'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500">Telefon</p>
                    <p className="font-medium">{request.client_phone || 'Nije unet'}</p>
                </div>
                {request.note && <div className="p-4 bg-amber-50 rounded-xl"><p className="text-xs text-amber-600">Napomena</p><p>{request.note}</p></div>}
            </div>
        </Modal>
    );
};

// Client Details Modal
const ClientDetailsModal = ({ client, onClose }) => {
    if (!client) return null;
    return (
        <Modal open={!!client} onClose={onClose} title="Detalji klijenta">
            <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-2xl">{client.name?.charAt(0)}</div>
                    <div>
                        <h3 className="font-bold text-lg">{client.name}</h3>
                        <p className="text-sm text-slate-500">Klijent</p>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500">Telefon</p>
                    <p className="font-medium flex items-center gap-2"><Phone size={16} /> {client.phone}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500">Adresa</p>
                    <p className="font-medium flex items-center gap-2"><MapPin size={16} /> {client.address || 'Nije uneta'}</p>
                </div>
            </div>
        </Modal>
    );
};

// Admin Tables
const AdminCompaniesTable = ({ companies, onView }) => {
    if (!companies?.length) return <EmptyState icon={Building2} title="Nema firmi" desc="Firme će se prikazati ovde" />;
    return (
        <div className="bg-white rounded-2xl border overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b">
                    <tr><th className="px-6 py-4 text-left">Firma</th><th className="px-6 py-4 text-left">ECO Kod</th><th className="px-6 py-4">Menadžeri</th><th className="px-6 py-4">Klijenti</th><th className="px-6 py-4 text-right">Akcije</th></tr>
                </thead>
                <tbody className="divide-y">
                    {companies.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-medium">{c.name}</td>
                            <td className="px-6 py-4"><code className="px-2 py-1 bg-slate-100 rounded text-xs">{c.code}</code></td>
                            <td className="px-6 py-4 text-center">{c.managerCount || 0}</td>
                            <td className="px-6 py-4 text-center">{c.clientCount || 0}</td>
                            <td className="px-6 py-4 text-right"><button onClick={() => onView(c)} className="p-2 hover:bg-slate-100 rounded-lg"><Eye size={18} /></button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const AdminUsersTable = ({ users, onDelete, isDeveloper }) => {
    if (!users?.length) return <EmptyState icon={Users} title="Nema korisnika" desc="Korisnici će se prikazati ovde" />;
    const roles = { developer: 'Developer', admin: 'Admin', manager: 'Menadžer', client: 'Klijent' };
    return (
        <div className="bg-white rounded-2xl border overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b">
                    <tr><th className="px-6 py-4 text-left">Korisnik</th><th className="px-6 py-4 text-left">Telefon</th><th className="px-6 py-4 text-left">Uloga</th><th className="px-6 py-4 text-left">Firma</th>{isDeveloper && <th className="px-6 py-4 text-right">Akcije</th>}</tr>
                </thead>
                <tbody className="divide-y">
                    {users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-medium">{u.name}</td>
                            <td className="px-6 py-4 text-slate-600">{u.phone}</td>
                            <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100">{roles[u.role] || u.role}</span></td>
                            <td className="px-6 py-4 text-slate-600">{u.company?.name || '-'}</td>
                            {isDeveloper && <td className="px-6 py-4 text-right"><button onClick={() => onDelete(u.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button></td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const MasterCodesTable = ({ codes, onGenerate, onCopy, onDelete, isDeveloper }) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">Master Kodovi</h2>
            <button onClick={onGenerate} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-sm"><Plus size={18} /> Generiši</button>
        </div>
        {!codes?.length ? <EmptyState icon={FileText} title="Nema kodova" desc="Generiši prvi kod" /> : (
            <div className="bg-white rounded-2xl border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 border-b">
                        <tr><th className="px-6 py-4 text-left">Kod</th><th className="px-6 py-4 text-left">Status</th><th className="px-6 py-4 text-left">Firma</th><th className="px-6 py-4 text-left">Kreiran</th><th className="px-6 py-4 text-right">Akcije</th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {codes.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4"><code className="px-3 py-1.5 bg-slate-100 rounded-lg font-mono">{c.code}</code></td>
                                <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${c.status === 'used' ? 'bg-slate-100' : 'bg-emerald-100 text-emerald-700'}`}>{c.status === 'used' ? 'Iskorišćen' : 'Dostupan'}</span></td>
                                <td className="px-6 py-4 text-slate-600">{c.company?.name || '-'}</td>
                                <td className="px-6 py-4 text-xs text-slate-500">{new Date(c.created_at).toLocaleDateString('sr-RS')}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => onCopy(c.code)} className="p-2 hover:bg-slate-100 rounded-lg"><Copy size={16} /></button>
                                    {isDeveloper && c.status !== 'used' && <button onClick={() => onDelete(c.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
);

// Main Dashboard
export default function Dashboard() {
    const navigate = useNavigate();
    const { user, logout, companyName, pickupRequests, clientRequests, processedNotification, clearProcessedNotification, addPickupRequest, markRequestAsProcessed, removePickupRequest, fetchCompanyClients, getAdminStats, fetchAllCompanies, fetchAllUsers, fetchAllMasterCodes, generateMasterCode, deleteMasterCode, deleteUser, isDeveloper, deleteClient } = useAuth();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [mapType, setMapType] = useState('requests');
    const [stats, setStats] = useState(null);
    const [clients, setClients] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [users, setUsers] = useState([]);
    const [masterCodes, setMasterCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedClient, setSelectedClient] = useState(null);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [prevRequestCount, setPrevRequestCount] = useState(0);
    const [prevClientCount, setPrevClientCount] = useState(0);

    const userRole = user?.role === 'developer' || user?.role === 'admin' ? 'admin' : user?.role || 'client';

    useEffect(() => { loadData(); }, [userRole, activeTab]);

    // Track new requests/clients for notifications
    useEffect(() => {
        if (userRole === 'manager' && pickupRequests) {
            const currentCount = pickupRequests.filter(r => r.status === 'pending').length;
            if (prevRequestCount > 0 && currentCount > prevRequestCount) {
                const newCount = currentCount - prevRequestCount;
                setNotifications(prev => [{ id: Date.now(), type: 'request', text: `${newCount} novi zahtev${newCount > 1 ? 'a' : ''}`, time: new Date() }, ...prev.slice(0, 9)]);
            }
            setPrevRequestCount(currentCount);
        }
    }, [pickupRequests, userRole]);

    useEffect(() => {
        if (userRole === 'manager' && clients.length > 0) {
            if (prevClientCount > 0 && clients.length > prevClientCount) {
                const newClient = clients[0];
                setNotifications(prev => [{ id: Date.now(), type: 'client', text: `Novi klijent: ${newClient.name}`, time: new Date() }, ...prev.slice(0, 9)]);
            }
            setPrevClientCount(clients.length);
        }
    }, [clients, userRole]);

    const clearNotification = (id) => setNotifications(prev => prev.filter(n => n.id !== id));
    const clearAllNotifications = () => setNotifications([]);

    // Real-time countdown refresh
    const [, setTick] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            if (userRole === 'admin') {
                setStats(await getAdminStats());
                if (activeTab === 'companies') setCompanies(await fetchAllCompanies());
                if (activeTab === 'users') setUsers(await fetchAllUsers());
                if (activeTab === 'codes') setMasterCodes(await fetchAllMasterCodes());
            } else if (userRole === 'manager') {
                setClients(await fetchCompanyClients() || []);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleLogout = () => { if (window.confirm('Odjaviti se?')) { logout(); navigate('/'); } };
    const handleNewRequest = async (data) => { setSubmitLoading(true); try { await addPickupRequest(data); setActiveTab('requests'); } catch (err) { alert(err.message); } finally { setSubmitLoading(false); } };
    const handleProcessRequest = async (req) => { if (window.confirm(`Označiti kao obrađen?`)) try { await markRequestAsProcessed(req); } catch (err) { alert(err.message); } };
    const handleDeleteRequest = async (id) => { if (window.confirm('Obrisati?')) try { await removePickupRequest(id); } catch (err) { alert(err.message); } };
    const handleDeleteClient = async (id) => { if (window.confirm('Obrisati klijenta?')) try { await deleteClient?.(id); setClients(await fetchCompanyClients()); } catch (err) { alert(err.message); } };
    const handleGenerateCode = async () => { try { await generateMasterCode(); setMasterCodes(await fetchAllMasterCodes()); } catch (err) { alert(err.message); } };
    const handleCopyCode = (code) => { navigator.clipboard.writeText(code); alert('Kopirano!'); };
    const handleDeleteCode = async (id) => { if (window.confirm('Obrisati?')) try { await deleteMasterCode(id); setMasterCodes(await fetchAllMasterCodes()); } catch (err) { alert(err.message); } };
    const handleDeleteUser = async (id) => { if (window.confirm('Obrisati?')) try { await deleteUser(id); setUsers(await fetchAllUsers()); } catch (err) { alert(err.message); } };

    const getMenu = () => {
        if (userRole === 'admin') return [{ id: 'dashboard', icon: LayoutDashboard, label: 'Pregled' }, { id: 'companies', icon: Building2, label: 'Firme' }, { id: 'users', icon: Users, label: 'Korisnici' }, { id: 'codes', icon: FileText, label: 'Master Kodovi' }];
        if (userRole === 'manager') return [{ id: 'dashboard', icon: LayoutDashboard, label: 'Pregled' }, { id: 'requests', icon: Truck, label: 'Zahtevi', badge: pickupRequests?.filter(r => r.status === 'pending').length }, { id: 'clients', icon: Users, label: 'Klijenti' }, { id: 'map', icon: MapPin, label: 'Mapa' }];
        return [{ id: 'dashboard', icon: LayoutDashboard, label: 'Početna' }, { id: 'new', icon: Plus, label: 'Novi zahtev' }, { id: 'requests', icon: Truck, label: 'Moji zahtevi', badge: clientRequests?.length }];
    };

    const getStats = () => {
        if (userRole === 'admin' && stats) return [{ label: 'Firme', value: stats.totalCompanies, icon: <Building2 className="w-6 h-6 text-emerald-600" /> }, { label: 'Korisnici', value: stats.totalUsers, icon: <Users className="w-6 h-6 text-blue-600" /> }, { label: 'Master kodovi', value: stats.totalCodes, icon: <FileText className="w-6 h-6 text-orange-600" /> }, { label: 'Dostupni', value: stats.availableCodes, icon: <Recycle className="w-6 h-6 text-green-600" /> }];
        if (userRole === 'manager') { const p = pickupRequests?.filter(r => r.status === 'pending') || []; return [{ label: 'Zahtevi', value: p.length, icon: <Truck className="w-6 h-6 text-emerald-600" /> }, { label: 'Klijenti', value: clients.length, icon: <Users className="w-6 h-6 text-blue-600" /> }, { label: 'Hitni', value: p.filter(r => r.urgency === '24h').length, icon: <AlertCircle className="w-6 h-6 text-red-600" /> }]; }
        return [{ label: 'Aktivni zahtevi', value: clientRequests?.length || 0, icon: <Truck className="w-6 h-6 text-emerald-600" /> }];
    };

    const menu = getMenu();
    const statCards = getStats();
    const pending = pickupRequests?.filter(r => r.status === 'pending') || [];

    const renderContent = () => {
        if (userRole === 'client') {
            if (activeTab === 'new') return <NewRequestForm onSubmit={handleNewRequest} loading={submitLoading} />;
            if (activeTab === 'requests') return clientRequests?.length ? <div className="space-y-4">{clientRequests.map(r => <div key={r.id} className="bg-white rounded-xl border p-5"><div className="flex justify-between"><div className="flex items-center gap-3"><span className="text-2xl">{WASTE_TYPES.find(w => w.id === r.waste_type)?.icon}</span><div><h4 className="font-semibold">{r.waste_label}</h4><p className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString('sr-RS')}</p></div></div><span className={`px-3 py-1 text-xs font-medium rounded-full ${r.urgency === '24h' ? 'bg-red-100 text-red-700' : r.urgency === '48h' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100'}`}>{r.urgency === '24h' ? 'Hitno' : r.urgency === '48h' ? 'Srednje' : 'Normalno'}</span></div></div>)}</div> : <EmptyState icon={CheckCircle2} title="Nema zahteva" desc="Vaši zahtevi će se prikazati ovde" />;
            return <div className="space-y-8"><div className="grid md:grid-cols-2 gap-6">{statCards.map((s, i) => <StatCard key={i} {...s} />)}</div><div className="bg-white rounded-2xl border p-8 text-center"><Recycle size={40} className="mx-auto text-emerald-600 mb-4" /><h3 className="text-xl font-bold mb-2">{clientRequests?.length ? `Imate ${clientRequests.length} zahteva` : 'Sve je pod kontrolom'}</h3><button onClick={() => setActiveTab('new')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-medium mt-4"><Plus size={20} className="inline mr-2" />Novi zahtev</button></div></div>;
        }
        if (userRole === 'manager') {
            if (activeTab === 'requests') return <ManagerRequestsTable requests={pending} onProcess={handleProcessRequest} onDelete={handleDeleteRequest} onView={setSelectedRequest} />;
            if (activeTab === 'clients') return <ClientsTable clients={clients} onView={setSelectedClient} onDelete={handleDeleteClient} />;
            if (activeTab === 'map') return <div className="space-y-4"><div className="flex gap-2"><button onClick={() => setMapType('requests')} className={`px-4 py-2 rounded-xl text-sm font-medium ${mapType === 'requests' ? 'bg-emerald-600 text-white' : 'bg-white border'}`}>Zahtevi ({pending.length})</button><button onClick={() => setMapType('clients')} className={`px-4 py-2 rounded-xl text-sm font-medium ${mapType === 'clients' ? 'bg-emerald-600 text-white' : 'bg-white border'}`}>Klijenti ({clients.length})</button></div><MapView requests={pending} clients={clients} type={mapType} /></div>;
            return <div className="space-y-8"><div className="grid md:grid-cols-3 gap-6">{statCards.map((s, i) => <StatCard key={i} {...s} />)}</div>{pending.length > 0 && <div><div className="flex justify-between mb-4"><h2 className="text-lg font-bold">Nedavni zahtevi</h2><button onClick={() => setActiveTab('requests')} className="text-emerald-600 text-sm font-medium">Vidi sve <ChevronRight size={16} className="inline" /></button></div><ManagerRequestsTable requests={pending.slice(0, 5)} onProcess={handleProcessRequest} onDelete={handleDeleteRequest} onView={setSelectedRequest} /></div>}</div>;
        }
        if (userRole === 'admin') {
            if (activeTab === 'companies') return <AdminCompaniesTable companies={companies} onView={(c) => alert(`${c.name}\n${c.code}`)} />;
            if (activeTab === 'users') return <AdminUsersTable users={users} onDelete={handleDeleteUser} isDeveloper={isDeveloper()} />;
            if (activeTab === 'codes') return <MasterCodesTable codes={masterCodes} onGenerate={handleGenerateCode} onCopy={handleCopyCode} onDelete={handleDeleteCode} isDeveloper={isDeveloper()} />;
            return <div className="space-y-8"><div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">{statCards.map((s, i) => <StatCard key={i} {...s} />)}</div><div className="bg-white rounded-2xl border p-6"><h2 className="font-bold mb-4">Brze akcije</h2><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{[{ icon: FileText, label: 'Generiši kod', onClick: handleGenerateCode }, { icon: Building2, label: 'Firme', onClick: () => setActiveTab('companies') }, { icon: Users, label: 'Korisnici', onClick: () => setActiveTab('users') }, { icon: BarChart3, label: 'Kodovi', onClick: () => setActiveTab('codes') }].map((a, i) => <button key={i} onClick={a.onClick} className="p-4 bg-slate-50 rounded-xl hover:bg-emerald-50 text-left"><a.icon size={20} className="mb-3 text-slate-500" /><p className="font-semibold">{a.label}</p></button>)}</div></div></div>;
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex">
            {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}
            <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-800 transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="h-full flex flex-col">
                    <div className="h-20 flex items-center justify-between px-6 border-b border-slate-700">
                        <div className="flex items-center gap-2"><div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white"><Leaf size={20} /></div><span className="font-bold text-xl text-white">EcoPlanina</span></div>
                        <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400"><X size={24} /></button>
                    </div>
                    <nav className="flex-1 p-4 space-y-1">{menu.map(m => <SidebarItem key={m.id} icon={m.icon} label={m.label} active={activeTab === m.id} badge={m.badge} onClick={() => { setActiveTab(m.id); setSidebarOpen(false); }} />)}</nav>
                    <div className="p-4 border-t border-slate-700"><SidebarItem icon={Settings} label="Podešavanja" onClick={() => {}} /><SidebarItem icon={LogOut} label="Odjavi se" onClick={handleLogout} /></div>
                </div>
            </aside>
            <div className="flex-1 flex flex-col min-w-0 relative">
                <div className="absolute inset-0 bg-cover bg-center opacity-10 pointer-events-none" style={{ backgroundImage: 'url(https://vmsfsstxxndpxbsdylog.supabase.co/storage/v1/object/public/assets/background.jpg)' }} />
                <header className="h-20 bg-white/80 backdrop-blur-sm border-b flex items-center justify-between px-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-500 lg:hidden"><Menu size={24} /></button>
                        <div className="hidden md:flex items-center bg-slate-100 rounded-full px-4 py-2.5 w-72"><Search size={18} className="text-slate-400 mr-2" /><input placeholder="Pretraži..." className="bg-transparent outline-none text-sm w-full" /></div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2.5 text-slate-500 hover:bg-slate-50 rounded-full">
                                <Bell size={20} />
                                {(notifications.length > 0 || pending.some(r => r.urgency === '24h')) && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />}
                            </button>
                            {showNotifications && (
                                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-800">Obaveštenja</h3>
                                        {notifications.length > 0 && <button onClick={clearAllNotifications} className="text-xs text-emerald-600 hover:text-emerald-700">Obriši sve</button>}
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {pending.filter(r => r.urgency === '24h').length > 0 && (
                                            <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-start gap-3">
                                                <AlertCircle size={18} className="text-red-500 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-medium text-red-700">{pending.filter(r => r.urgency === '24h').length} hitnih zahteva</p>
                                                    <p className="text-xs text-red-500">Potrebna hitna akcija</p>
                                                </div>
                                            </div>
                                        )}
                                        {notifications.length > 0 ? notifications.map(n => (
                                            <div key={n.id} className="px-4 py-3 border-b border-slate-50 hover:bg-slate-50 flex items-start gap-3">
                                                {n.type === 'request' ? <Truck size={18} className="text-emerald-500 mt-0.5" /> : <Users size={18} className="text-blue-500 mt-0.5" />}
                                                <div className="flex-1">
                                                    <p className="text-sm text-slate-700">{n.text}</p>
                                                    <p className="text-xs text-slate-400">{new Date(n.time).toLocaleTimeString('sr-RS')}</p>
                                                </div>
                                                <button onClick={() => clearNotification(n.id)} className="p-1 text-slate-300 hover:text-slate-500"><X size={14} /></button>
                                            </div>
                                        )) : pending.filter(r => r.urgency === '24h').length === 0 && (
                                            <div className="px-4 py-8 text-center text-slate-400">
                                                <Bell size={24} className="mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">Nema novih obaveštenja</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-3 pl-4 border-l"><div className="text-right hidden sm:block"><p className="text-sm font-bold">{user?.name}</p><p className="text-xs text-slate-500">{companyName || (userRole === 'admin' ? 'Administrator' : 'Korisnik')}</p></div><div className="w-11 h-11 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-lg">{user?.name?.charAt(0)}</div></div>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-6 lg:p-8 relative z-10">
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-8"><h1 className="text-2xl font-bold">{activeTab === 'dashboard' ? `Dobrodošli, ${user?.name?.split(' ')[0]}!` : activeTab === 'new' ? 'Novi zahtev' : activeTab === 'requests' ? 'Zahtevi' : activeTab === 'clients' ? 'Klijenti' : activeTab === 'map' ? 'Mapa' : activeTab === 'companies' ? 'Firme' : activeTab === 'users' ? 'Korisnici' : 'Master kodovi'}</h1></div>
                        {loading ? <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-emerald-600" size={32} /></div> : renderContent()}
                    </div>
                </main>
            </div>
            <RequestDetailsModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />
            <ClientDetailsModal client={selectedClient} onClose={() => setSelectedClient(null)} />
            {processedNotification && <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-50"><CheckCircle2 size={24} /><div><p className="font-semibold">Zahtev obrađen!</p><p className="text-sm opacity-90">"{processedNotification.wasteLabel}" preuzet</p></div><button onClick={clearProcessedNotification} className="p-1 hover:bg-white/20 rounded-lg"><X size={20} /></button></div>}
        </div>
    );
}
