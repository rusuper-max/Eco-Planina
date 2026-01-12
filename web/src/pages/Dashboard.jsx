import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    LayoutDashboard, Truck, Users, Settings, LogOut, Leaf, MapPin, Bell, Search, Menu, X, Plus, Recycle, BarChart3,
    FileText, Building2, AlertCircle, CheckCircle2, Clock, Package, Send, Trash2, Eye, Copy, ChevronRight,
    Phone, RefreshCw, Info, Box, ArrowUpDown, ArrowUp, ArrowDown, Filter, Upload, Image, Globe, ChevronDown, MessageCircle, Edit3
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
    if (diff <= 0) return { text: '00:00:00', color: 'text-red-600', bg: 'bg-red-100', ms: diff };
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    const text = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    if (h < 6) return { text, color: 'text-red-600', bg: 'bg-red-100', ms: diff };
    if (h < 24) return { text, color: 'text-amber-600', bg: 'bg-amber-100', ms: diff };
    return { text, color: 'text-emerald-600', bg: 'bg-emerald-100', ms: diff };
};

const WASTE_TYPES = [
    { id: 'cardboard', label: 'Karton', icon: '📦' },
    { id: 'plastic', label: 'Plastika', icon: '♻️' },
    { id: 'glass', label: 'Staklo', icon: '🍾' },
];

// Image upload helper
const uploadImage = async (file, folder = 'uploads') => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage.from('assets').upload(fileName, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(fileName);
    return publicUrl;
};

// Image upload component
const ImageUploader = ({ currentImage, onUpload, onRemove, label = "Koristi svoju sliku" }) => {
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Molimo izaberite sliku');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            alert('Slika mora biti manja od 2MB');
            return;
        }
        setUploading(true);
        try {
            const url = await uploadImage(file);
            onUpload(url);
        } catch (err) {
            alert('Greška pri uploadu: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center">
            <p className="text-sm font-medium text-slate-700 mb-3">{label}</p>
            {currentImage ? (
                <div className="relative inline-block">
                    <img src={currentImage} alt="Custom" className="w-20 h-20 object-cover rounded-xl" />
                    <button
                        type="button"
                        onClick={onRemove}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <label className="cursor-pointer">
                    <div className="w-20 h-20 mx-auto bg-slate-100 rounded-xl flex flex-col items-center justify-center hover:bg-slate-200 transition-colors">
                        {uploading ? (
                            <RefreshCw size={24} className="text-slate-400 animate-spin" />
                        ) : (
                            <>
                                <Upload size={24} className="text-slate-400 mb-1" />
                                <span className="text-xs text-slate-500">Upload</span>
                            </>
                        )}
                    </div>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={uploading} />
                </label>
            )}
        </div>
    );
};

// Components
const StatCard = ({ label, value, icon, onClick }) => (
    <div
        onClick={onClick}
        className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all' : ''}`}
    >
        <div className="flex justify-between items-start">
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
const NewRequestForm = ({ onSubmit, loading, wasteTypes = WASTE_TYPES }) => {
    const [wasteType, setWasteType] = useState(null);
    const [fillLevel, setFillLevel] = useState(null);
    const [urgency, setUrgency] = useState(null);
    const [note, setNote] = useState('');

    return (
        <div className="space-y-6 bg-white rounded-2xl p-6 border">
            <div>
                <h3 className="font-semibold mb-4">Tip otpada</h3>
                <div className={`grid gap-3 ${wasteTypes.length <= 3 ? 'grid-cols-3' : wasteTypes.length <= 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'}`}>
                    {wasteTypes.map(w => (
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
            <button onClick={() => wasteType && fillLevel && urgency && onSubmit({ wasteType, wasteLabel: wasteTypes.find(w => w.id === wasteType)?.label, fillLevel, urgency, note })} disabled={loading || !wasteType || !fillLevel || !urgency} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium py-4 rounded-xl flex items-center justify-center gap-2">
                {loading ? <RefreshCw className="animate-spin" size={20} /> : <><Send size={20} /> Pošalji</>}
            </button>
        </div>
    );
};

// Manager Table with sorting, filtering and search
const ManagerRequestsTable = ({ requests, onProcess, onDelete, onView, wasteTypes = WASTE_TYPES, initialUrgencyFilter = 'all', onUrgencyFilterChange }) => {
    const [sortBy, setSortBy] = useState('remaining'); // remaining, client, type, fill, date
    const [sortDir, setSortDir] = useState('asc'); // asc, desc
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, or waste type id
    const [filterUrgency, setFilterUrgency] = useState(initialUrgencyFilter); // all, 24h, 48h, 72h

    // Sync with external filter
    useEffect(() => {
        setFilterUrgency(initialUrgencyFilter);
    }, [initialUrgencyFilter]);

    const handleUrgencyChange = (value) => {
        setFilterUrgency(value);
        onUrgencyFilterChange?.(value);
    };

    if (!requests?.length) return <EmptyState icon={Truck} title="Nema zahteva" desc="Zahtevi će se prikazati ovde" />;

    // Filter requests
    let filtered = requests.filter(req => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesName = req.client_name?.toLowerCase().includes(query);
            const matchesType = req.waste_label?.toLowerCase().includes(query);
            const matchesDate = new Date(req.created_at).toLocaleDateString('sr-RS').includes(query);
            if (!matchesName && !matchesType && !matchesDate) return false;
        }
        // Type filter
        if (filterType !== 'all' && req.waste_type !== filterType) return false;
        // Urgency filter
        if (filterUrgency !== 'all' && req.urgency !== filterUrgency) return false;
        return true;
    });

    // Sort requests
    filtered = [...filtered].sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
            case 'remaining':
                comparison = getRemainingTime(a.created_at, a.urgency).ms - getRemainingTime(b.created_at, b.urgency).ms;
                break;
            case 'client':
                comparison = (a.client_name || '').localeCompare(b.client_name || '');
                break;
            case 'type':
                comparison = (a.waste_label || '').localeCompare(b.waste_label || '');
                break;
            case 'fill':
                comparison = a.fill_level - b.fill_level;
                break;
            case 'date':
                comparison = new Date(a.created_at) - new Date(b.created_at);
                break;
            default:
                comparison = 0;
        }
        return sortDir === 'asc' ? comparison : -comparison;
    });

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortDir('asc');
        }
    };

    const SortIcon = ({ column }) => {
        if (sortBy !== column) return <ArrowUpDown size={14} className="text-slate-300" />;
        return sortDir === 'asc' ? <ArrowUp size={14} className="text-emerald-600" /> : <ArrowDown size={14} className="text-emerald-600" />;
    };

    return (
        <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Pretraži po imenu, vrsti, datumu..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm"
                    />
                </div>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm bg-white"
                >
                    <option value="all">Sve vrste</option>
                    {wasteTypes.map(w => <option key={w.id} value={w.id}>{w.icon} {w.label}</option>)}
                </select>
                <select
                    value={filterUrgency}
                    onChange={(e) => handleUrgencyChange(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm bg-white"
                >
                    <option value="all">Sva hitnost</option>
                    <option value="24h">🔴 Hitno (24h)</option>
                    <option value="48h">🟠 Srednje (48h)</option>
                    <option value="72h">🟢 Normalno (72h)</option>
                </select>
            </div>

            {/* Results count */}
            <div className="text-sm text-slate-500">
                Prikazano {filtered.length} od {requests.length} zahteva
                {(searchQuery || filterType !== 'all' || filterUrgency !== 'all') && (
                    <button onClick={() => { setSearchQuery(''); setFilterType('all'); handleUrgencyChange('all'); }} className="ml-2 text-emerald-600 hover:text-emerald-700">
                        Obriši filtere
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left">
                                <button onClick={() => handleSort('client')} className="flex items-center gap-1.5 hover:text-slate-700">
                                    Klijent <SortIcon column="client" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                                <button onClick={() => handleSort('type')} className="flex items-center gap-1.5 hover:text-slate-700">
                                    Tip <SortIcon column="type" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                                <button onClick={() => handleSort('fill')} className="flex items-center gap-1.5 hover:text-slate-700">
                                    % <SortIcon column="fill" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                                <button onClick={() => handleSort('remaining')} className="flex items-center gap-1.5 hover:text-slate-700">
                                    Preostalo <SortIcon column="remaining" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left">
                                <button onClick={() => handleSort('date')} className="flex items-center gap-1.5 hover:text-slate-700">
                                    Datum <SortIcon column="date" />
                                </button>
                            </th>
                            <th className="px-4 py-3 text-right">Akcije</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Nema rezultata za ovu pretragu</td></tr>
                        ) : filtered.map(req => {
                            const rem = getRemainingTime(req.created_at, req.urgency);
                            return (
                                <tr key={req.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <span className="font-medium">{req.client_name}</span>
                                            <button onClick={() => onView(req)} className="px-2.5 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors">
                                                <Info size={14} />
                                                Info
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">{wasteTypes.find(w => w.id === req.waste_type)?.icon || '📦'} {req.waste_label}</td>
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
        </div>
    );
};

// Clients Table
const ClientsTable = ({ clients, onView, onDelete, onEditLocation }) => {
    if (!clients?.length) return <EmptyState icon={Users} title="Nema klijenata" desc="Klijenti će se prikazati ovde" />;
    return (
        <div className="bg-white rounded-2xl border overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b">
                    <tr>
                        <th className="px-4 py-3 text-left">Klijent</th>
                        <th className="px-4 py-3 text-left">Telefon</th>
                        <th className="px-4 py-3 text-left">Lokacija</th>
                        <th className="px-4 py-3 text-right">Akcije</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {clients.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium">{c.name}</td>
                            <td className="px-4 py-3 text-slate-600">{c.phone}</td>
                            <td className="px-4 py-3">
                                {c.latitude && c.longitude ? (
                                    <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Podešena</span>
                                ) : (
                                    <span className="text-xs text-slate-400">Nije podešena</span>
                                )}
                            </td>
                            <td className="px-4 py-3 text-right flex justify-end gap-1">
                                <button onClick={() => onEditLocation(c)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Podesi lokaciju">
                                    <MapPin size={18} />
                                </button>
                                <button onClick={() => onView(c)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg" title="Detalji">
                                    <Eye size={18} />
                                </button>
                                <button onClick={() => onDelete(c.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Obriši">
                                    <Trash2 size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// Equipment Management
const EquipmentManagement = ({ equipment, onAdd, onAssign, onDelete, clients }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newEquipment, setNewEquipment] = useState({ name: '', description: '', customImage: null });
    const [assigningEquipment, setAssigningEquipment] = useState(null);

    const handleAdd = () => {
        if (newEquipment.name) {
            onAdd(newEquipment);
            setNewEquipment({ name: '', description: '', customImage: null });
            setShowAddForm(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">Oprema</h2>
                <button onClick={() => setShowAddForm(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-sm">
                    <Plus size={18} /> Dodaj opremu
                </button>
            </div>

            {showAddForm && (
                <div className="bg-white rounded-2xl border p-6 space-y-4">
                    <h3 className="font-semibold">Nova oprema</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Naziv opreme</label>
                                <input
                                    type="text"
                                    value={newEquipment.name}
                                    onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
                                    placeholder="npr. Kontejner za karton, Presa #1, Kanta za plastiku..."
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Opis (opciono)</label>
                                <textarea
                                    value={newEquipment.description}
                                    onChange={(e) => setNewEquipment({ ...newEquipment, description: e.target.value })}
                                    placeholder="Dodatan opis opreme..."
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                    rows={2}
                                />
                            </div>
                        </div>
                        <div>
                            <ImageUploader
                                currentImage={newEquipment.customImage}
                                onUpload={(url) => setNewEquipment({ ...newEquipment, customImage: url })}
                                onRemove={() => setNewEquipment({ ...newEquipment, customImage: null })}
                                label="Slika opreme (opciono)"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleAdd} disabled={!newEquipment.name} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-medium">Sačuvaj</button>
                        <button onClick={() => { setShowAddForm(false); setNewEquipment({ name: '', description: '', customImage: null }); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-medium">Otkaži</button>
                    </div>
                </div>
            )}

            {assigningEquipment && (
                <Modal open={!!assigningEquipment} onClose={() => setAssigningEquipment(null)} title="Dodeli opremu klijentu">
                    <div className="space-y-4">
                        <p className="text-slate-600">Dodeljivanje: <strong>{assigningEquipment.name}</strong></p>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {clients?.map(client => (
                                <button
                                    key={client.id}
                                    onClick={() => { onAssign(assigningEquipment.id, client.id); setAssigningEquipment(null); }}
                                    className="w-full p-4 bg-slate-50 hover:bg-emerald-50 rounded-xl text-left flex items-center gap-3"
                                >
                                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold">
                                        {client.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-medium">{client.name}</p>
                                        <p className="text-sm text-slate-500">{client.address || 'Bez adrese'}</p>
                                    </div>
                                </button>
                            ))}
                            {(!clients || clients.length === 0) && <p className="text-center text-slate-500 py-4">Nema dostupnih klijenata</p>}
                        </div>
                    </div>
                </Modal>
            )}

            {!equipment?.length ? (
                <EmptyState icon={Box} title="Nema opreme" desc="Dodajte prvu opremu klikom na dugme iznad" />
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {equipment.map(eq => (
                        <div key={eq.id} className="bg-white rounded-2xl border p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    {eq.customImage ? (
                                        <img src={eq.customImage} alt={eq.name} className="w-12 h-12 object-cover rounded-xl" />
                                    ) : (
                                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                                            <Box size={24} className="text-slate-400" />
                                        </div>
                                    )}
                                    <div>
                                        <h4 className="font-bold">{eq.name}</h4>
                                    </div>
                                </div>
                            </div>
                            {eq.description && <p className="text-sm text-slate-600 mb-3">{eq.description}</p>}
                            {eq.assigned_to_name && (
                                <div className="px-3 py-2 bg-emerald-50 rounded-lg mb-3">
                                    <p className="text-xs text-emerald-600">Dodeljeno:</p>
                                    <p className="text-sm font-medium text-emerald-700">{eq.assigned_to_name}</p>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <button onClick={() => setAssigningEquipment(eq)} className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">
                                    {eq.assigned_to ? 'Promeni' : 'Dodeli'}
                                </button>
                                <button onClick={() => onDelete(eq.id)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Waste Types Management
const WasteTypesManagement = ({ wasteTypes, onAdd, onDelete }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newType, setNewType] = useState({ label: '', icon: '📦', customImage: null });

    const iconOptions = ['📦', '♻️', '🍾', '🗑️', '🛢️', '📄', '🔋', '💡', '🧴', '🥫', '🪵', '🧱'];

    const handleAdd = () => {
        if (newType.label) {
            onAdd({ ...newType, id: newType.label.toLowerCase().replace(/\s/g, '_') });
            setNewType({ label: '', icon: '📦', customImage: null });
            setShowAddForm(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold">Vrste robe (otpada)</h2>
                    <p className="text-sm text-slate-500">Upravljajte vrstama otpada koje vaši klijenti mogu da prijavljuju</p>
                </div>
                <button onClick={() => setShowAddForm(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-sm">
                    <Plus size={18} /> Dodaj vrstu
                </button>
            </div>

            {showAddForm && (
                <div className="bg-white rounded-2xl border p-6 space-y-4">
                    <h3 className="font-semibold">Nova vrsta robe</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Naziv</label>
                                <input
                                    type="text"
                                    value={newType.label}
                                    onChange={(e) => setNewType({ ...newType, label: e.target.value })}
                                    placeholder="npr. Metal, Elektronski otpad..."
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Ikonica {newType.customImage && <span className="text-slate-400">(zamenjeno slikom)</span>}</label>
                                <div className="flex flex-wrap gap-2">
                                    {iconOptions.map(icon => (
                                        <button
                                            key={icon}
                                            onClick={() => setNewType({ ...newType, icon, customImage: null })}
                                            className={`w-12 h-12 text-2xl rounded-xl border-2 transition-all ${!newType.customImage && newType.icon === icon ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'} ${newType.customImage ? 'opacity-50' : ''}`}
                                        >
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div>
                            <ImageUploader
                                currentImage={newType.customImage}
                                onUpload={(url) => setNewType({ ...newType, customImage: url })}
                                onRemove={() => setNewType({ ...newType, customImage: null })}
                                label="Koristi svoju sliku"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-medium">Sačuvaj</button>
                        <button onClick={() => { setShowAddForm(false); setNewType({ label: '', icon: '📦', customImage: null }); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-medium">Otkaži</button>
                    </div>
                </div>
            )}

            {!wasteTypes?.length ? (
                <EmptyState icon={Recycle} title="Nema vrsta robe" desc="Dodajte prvu vrstu robe klikom na dugme iznad" />
            ) : (
                <div className="bg-white rounded-2xl border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 border-b">
                            <tr>
                                <th className="px-6 py-4 text-left">Ikonica</th>
                                <th className="px-6 py-4 text-left">Naziv</th>
                                <th className="px-6 py-4 text-right">Akcije</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {wasteTypes.map(wt => (
                                <tr key={wt.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        {wt.customImage ? (
                                            <img src={wt.customImage} alt={wt.label} className="w-12 h-12 object-cover rounded-xl" />
                                        ) : (
                                            <span className="text-3xl">{wt.icon}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-medium">{wt.label}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => onDelete(wt.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// Generate stable position from string (address or id)
const getStablePosition = (id, baseLatitude = 44.8, baseLongitude = 20.45) => {
    // Create a simple hash from the id string
    let hash = 0;
    const str = String(id);
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // Use hash to generate stable offsets - wider spread (0.3 degrees ~ 30km)
    const latOffset = ((Math.abs(hash) % 1000) / 1000 - 0.5) * 0.3;
    const lngOffset = ((Math.abs(hash >> 10) % 1000) / 1000 - 0.5) * 0.3;
    return [baseLatitude + latOffset, baseLongitude + lngOffset];
};

// Draggable Marker component
const DraggableMarker = ({ position, onPositionChange }) => {
    const [markerPosition, setMarkerPosition] = useState(position);

    const eventHandlers = useMemo(() => ({
        dragend(e) {
            const marker = e.target;
            const newPos = marker.getLatLng();
            setMarkerPosition([newPos.lat, newPos.lng]);
            onPositionChange([newPos.lat, newPos.lng]);
        },
    }), [onPositionChange]);

    useEffect(() => {
        setMarkerPosition(position);
    }, [position]);

    return (
        <Marker
            position={markerPosition}
            draggable={true}
            eventHandlers={eventHandlers}
            icon={createIcon('red')}
        >
            <Popup>Prevuci marker na željenu lokaciju</Popup>
        </Marker>
    );
};

// Location Picker component for setting client position
const LocationPicker = ({ initialPosition, onSave, onCancel, clientName }) => {
    const [position, setPosition] = useState(initialPosition || [44.8, 20.45]);
    const [manualLat, setManualLat] = useState(position[0].toString());
    const [manualLng, setManualLng] = useState(position[1].toString());

    const MapClickHandler = () => {
        useMapEvents({
            click(e) {
                const newPos = [e.latlng.lat, e.latlng.lng];
                setPosition(newPos);
                setManualLat(e.latlng.lat.toFixed(6));
                setManualLng(e.latlng.lng.toFixed(6));
            },
        });
        return null;
    };

    const handleManualUpdate = () => {
        const lat = parseFloat(manualLat);
        const lng = parseFloat(manualLng);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            setPosition([lat, lng]);
        }
    };

    const handlePositionChange = (newPos) => {
        setPosition(newPos);
        setManualLat(newPos[0].toFixed(6));
        setManualLng(newPos[1].toFixed(6));
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-600">
                Kliknite na mapu ili prevucite marker da postavite lokaciju za <strong>{clientName}</strong>
            </p>
            <div className="rounded-xl overflow-hidden border" style={{ height: '350px' }}>
                <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapClickHandler />
                    <DraggableMarker position={position} onPositionChange={handlePositionChange} />
                </MapContainer>
            </div>
            {/* Manual coordinate input */}
            <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-2">Ili unesite koordinate ručno:</p>
                <div className="flex gap-3 items-end">
                    <div className="flex-1">
                        <label className="text-xs text-slate-600 mb-1 block">Latitude</label>
                        <input
                            type="text"
                            value={manualLat}
                            onChange={(e) => setManualLat(e.target.value)}
                            onBlur={handleManualUpdate}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                            placeholder="44.8"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs text-slate-600 mb-1 block">Longitude</label>
                        <input
                            type="text"
                            value={manualLng}
                            onChange={(e) => setManualLng(e.target.value)}
                            onBlur={handleManualUpdate}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                            placeholder="20.45"
                        />
                    </div>
                    <button
                        onClick={handleManualUpdate}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm"
                    >
                        Primeni
                    </button>
                </div>
            </div>
            <div className="flex gap-3 justify-end">
                <button onClick={onCancel} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">
                    Otkaži
                </button>
                <button onClick={() => onSave(position)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">
                    Sačuvaj lokaciju
                </button>
            </div>
        </div>
    );
};

// Map
// Component to auto-fit map bounds to markers
const FitBounds = ({ positions }) => {
    const map = useMap();

    useEffect(() => {
        if (positions && positions.length > 0) {
            const bounds = L.latLngBounds(positions);
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
        }
    }, [map, positions]);

    return null;
};

const MapView = ({ requests, clients, type, onClientLocationEdit }) => {
    const items = type === 'requests' ? requests : clients;

    // Calculate positions for all items
    const markers = useMemo(() => {
        return (items || []).map((item, index) => {
            // Parse coordinates as numbers, use stable position as fallback
            const lat = item.latitude ? parseFloat(item.latitude) : null;
            const lng = item.longitude ? parseFloat(item.longitude) : null;

            const position = (lat && lng && !isNaN(lat) && !isNaN(lng))
                ? [lat, lng]
                : getStablePosition(item.id || `item-${index}`);

            return { item, position, index };
        });
    }, [items]);

    // Extract all positions for bounds fitting
    const allPositions = useMemo(() => markers.map(m => m.position), [markers]);

    return (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ height: '500px' }}>
            <MapContainer center={[44.8, 20.45]} zoom={11} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <FitBounds positions={allPositions} />
                {markers.map(({ item, position, index }) => (
                    <Marker
                        key={item.id || `marker-${index}`}
                        position={position}
                        icon={type === 'requests' ? (urgencyIcons[item.urgency] || urgencyIcons['72h']) : createIcon('blue')}
                    >
                        <Popup>
                            <p className="font-bold">{type === 'requests' ? item.client_name : item.name}</p>
                            <p className="text-sm">{type === 'requests' ? item.waste_label : item.phone}</p>
                            <p className="text-xs text-gray-500">{type === 'requests' ? item.client_address : item.address}</p>
                            {type === 'clients' && onClientLocationEdit && (
                                <button
                                    onClick={() => onClientLocationEdit(item)}
                                    className="mt-2 px-3 py-1 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700"
                                >
                                    Uredi lokaciju
                                </button>
                            )}
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
    const { user, logout, companyCode, companyName, pickupRequests, clientRequests, processedNotification, clearProcessedNotification, addPickupRequest, markRequestAsProcessed, removePickupRequest, fetchCompanyClients, getAdminStats, fetchAllCompanies, fetchAllUsers, fetchAllMasterCodes, generateMasterCode, deleteMasterCode, deleteUser, isDeveloper, deleteClient } = useAuth();

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
    const [editingClientLocation, setEditingClientLocation] = useState(null);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [prevRequestCount, setPrevRequestCount] = useState(0);
    const [prevClientCount, setPrevClientCount] = useState(0);
    const [equipment, setEquipment] = useState([]);
    const [wasteTypes, setWasteTypes] = useState(WASTE_TYPES);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [language, setLanguage] = useState('sr');
    const [editingProfile, setEditingProfile] = useState({ name: '', phone: '' });
    const [urgencyFilter, setUrgencyFilter] = useState('all');

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

    // Equipment handlers (local state for now, later connect to Supabase)
    const handleAddEquipment = (newEq) => {
        const eq = { id: Date.now().toString(), ...newEq, assigned_to: null, assigned_to_name: null };
        setEquipment(prev => [...prev, eq]);
    };
    const handleAssignEquipment = (eqId, clientId) => {
        const client = clients.find(c => c.id === clientId);
        setEquipment(prev => prev.map(eq => eq.id === eqId ? { ...eq, assigned_to: clientId, assigned_to_name: client?.name } : eq));
    };
    const handleDeleteEquipment = (id) => { if (window.confirm('Obrisati opremu?')) setEquipment(prev => prev.filter(eq => eq.id !== id)); };

    // Waste types handlers (local state for now, later connect to Supabase)
    const handleAddWasteType = (newType) => {
        setWasteTypes(prev => [...prev, newType]);
    };
    const handleDeleteWasteType = (id) => { if (window.confirm('Obrisati vrstu robe?')) setWasteTypes(prev => prev.filter(wt => wt.id !== id)); };

    // Client location handler
    const handleSaveClientLocation = async (position) => {
        if (editingClientLocation) {
            try {
                // Update in Supabase
                const { error } = await supabase
                    .from('users')
                    .update({ latitude: position[0], longitude: position[1] })
                    .eq('id', editingClientLocation.id);

                if (error) throw error;

                // Update local state
                setClients(prev => prev.map(c =>
                    c.id === editingClientLocation.id
                        ? { ...c, latitude: position[0], longitude: position[1] }
                        : c
                ));
                setEditingClientLocation(null);
            } catch (err) {
                alert('Greška pri čuvanju lokacije: ' + err.message);
            }
        }
    };

    const getMenu = () => {
        if (userRole === 'admin') return [{ id: 'dashboard', icon: LayoutDashboard, label: 'Pregled' }, { id: 'companies', icon: Building2, label: 'Firme' }, { id: 'users', icon: Users, label: 'Korisnici' }, { id: 'codes', icon: FileText, label: 'Master Kodovi' }];
        if (userRole === 'manager') return [
            { id: 'dashboard', icon: LayoutDashboard, label: 'Pregled' },
            { id: 'requests', icon: Truck, label: 'Zahtevi', badge: pickupRequests?.filter(r => r.status === 'pending').length },
            { id: 'clients', icon: Users, label: 'Klijenti' },
            { id: 'equipment', icon: Box, label: 'Oprema' },
            { id: 'wastetypes', icon: Recycle, label: 'Vrste robe' },
            { id: 'map', icon: MapPin, label: 'Mapa' }
        ];
        return [{ id: 'dashboard', icon: LayoutDashboard, label: 'Početna' }, { id: 'new', icon: Plus, label: 'Novi zahtev' }, { id: 'requests', icon: Truck, label: 'Moji zahtevi', badge: clientRequests?.length }];
    };

    const getStats = () => {
        if (userRole === 'admin' && stats) return [
            { label: 'Firme', value: stats.totalCompanies, icon: <Building2 className="w-6 h-6 text-emerald-600" />, onClick: () => setActiveTab('companies') },
            { label: 'Korisnici', value: stats.totalUsers, icon: <Users className="w-6 h-6 text-blue-600" />, onClick: () => setActiveTab('users') },
            { label: 'Master kodovi', value: stats.totalCodes, icon: <FileText className="w-6 h-6 text-orange-600" />, onClick: () => setActiveTab('codes') },
            { label: 'Dostupni', value: stats.availableCodes, icon: <Recycle className="w-6 h-6 text-green-600" />, onClick: () => setActiveTab('codes') }
        ];
        if (userRole === 'manager') {
            const p = pickupRequests?.filter(r => r.status === 'pending') || [];
            return [
                { label: 'Zahtevi', value: p.length, icon: <Truck className="w-6 h-6 text-emerald-600" />, onClick: () => { setUrgencyFilter('all'); setActiveTab('requests'); } },
                { label: 'Klijenti', value: clients.length, icon: <Users className="w-6 h-6 text-blue-600" />, onClick: () => setActiveTab('clients') },
                { label: 'Hitni', value: p.filter(r => r.urgency === '24h').length, icon: <AlertCircle className="w-6 h-6 text-red-600" />, onClick: () => { setUrgencyFilter('24h'); setActiveTab('requests'); } }
            ];
        }
        return [{ label: 'Aktivni zahtevi', value: clientRequests?.length || 0, icon: <Truck className="w-6 h-6 text-emerald-600" />, onClick: () => setActiveTab('requests') }];
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
            if (activeTab === 'requests') return <ManagerRequestsTable requests={pending} onProcess={handleProcessRequest} onDelete={handleDeleteRequest} onView={setSelectedRequest} wasteTypes={wasteTypes} initialUrgencyFilter={urgencyFilter} onUrgencyFilterChange={setUrgencyFilter} />;
            if (activeTab === 'clients') return <ClientsTable clients={clients} onView={setSelectedClient} onDelete={handleDeleteClient} onEditLocation={setEditingClientLocation} />;
            if (activeTab === 'equipment') return <EquipmentManagement equipment={equipment} onAdd={handleAddEquipment} onAssign={handleAssignEquipment} onDelete={handleDeleteEquipment} clients={clients} />;
            if (activeTab === 'wastetypes') return <WasteTypesManagement wasteTypes={wasteTypes} onAdd={handleAddWasteType} onDelete={handleDeleteWasteType} />;
            if (activeTab === 'map') return <div className="space-y-4"><div className="flex gap-2"><button onClick={() => setMapType('requests')} className={`px-4 py-2 rounded-xl text-sm font-medium ${mapType === 'requests' ? 'bg-emerald-600 text-white' : 'bg-white border'}`}>Zahtevi ({pending.length})</button><button onClick={() => setMapType('clients')} className={`px-4 py-2 rounded-xl text-sm font-medium ${mapType === 'clients' ? 'bg-emerald-600 text-white' : 'bg-white border'}`}>Klijenti ({clients.length})</button></div><MapView requests={pending} clients={clients} type={mapType} onClientLocationEdit={setEditingClientLocation} /></div>;
            return <div className="space-y-8"><div className="grid md:grid-cols-3 gap-6">{statCards.map((s, i) => <StatCard key={i} {...s} />)}</div>{pending.length > 0 && <div><div className="flex justify-between mb-4"><h2 className="text-lg font-bold">Nedavni zahtevi</h2><button onClick={() => setActiveTab('requests')} className="text-emerald-600 text-sm font-medium">Vidi sve <ChevronRight size={16} className="inline" /></button></div><ManagerRequestsTable requests={pending.slice(0, 5)} onProcess={handleProcessRequest} onDelete={handleDeleteRequest} onView={setSelectedRequest} wasteTypes={wasteTypes} /></div>}</div>;
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
                    <div className="p-4 border-t border-slate-700"><SidebarItem icon={LogOut} label="Odjavi se" onClick={handleLogout} /></div>
                </div>
            </aside>
            <div className="flex-1 flex flex-col min-w-0 relative">
                <div className="absolute inset-0 bg-cover bg-center opacity-10 pointer-events-none" style={{ backgroundImage: 'url(https://vmsfsstxxndpxbsdylog.supabase.co/storage/v1/object/public/assets/background.jpg)' }} />
                <header className="h-20 bg-white/80 backdrop-blur-sm border-b flex items-center justify-between px-6 relative z-30">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-500 lg:hidden"><Menu size={24} /></button>
                        {/* ECO Kod firme */}
                        {userRole !== 'admin' && companyCode && (
                            <button
                                onClick={() => { navigator.clipboard.writeText(companyCode); alert('ECO kod kopiran!'); }}
                                className="hidden md:flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl px-4 py-2.5 transition-colors"
                            >
                                <Building2 size={18} className="text-emerald-600" />
                                <span className="text-sm font-medium text-emerald-700">ECO Kod:</span>
                                <code className="text-sm font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">{companyCode}</code>
                                <Copy size={14} className="text-emerald-500" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Notifications */}
                        <div className="relative">
                            <button onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); }} className="relative p-2.5 text-slate-500 hover:bg-slate-50 rounded-full">
                                <Bell size={20} />
                                {(notifications.length > 0 || pending.some(r => r.urgency === '24h')) && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />}
                            </button>
                            {showNotifications && (
                                <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-800">{language === 'sr' ? 'Obaveštenja' : 'Notifications'}</h3>
                                        {notifications.length > 0 && <button onClick={clearAllNotifications} className="text-xs text-emerald-600 hover:text-emerald-700">{language === 'sr' ? 'Obriši sve' : 'Clear all'}</button>}
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {pending.filter(r => r.urgency === '24h').length > 0 && (
                                            <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-start gap-3">
                                                <AlertCircle size={18} className="text-red-500 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-medium text-red-700">{pending.filter(r => r.urgency === '24h').length} {language === 'sr' ? 'hitnih zahteva' : 'urgent requests'}</p>
                                                    <p className="text-xs text-red-500">{language === 'sr' ? 'Potrebna hitna akcija' : 'Urgent action needed'}</p>
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
                                                <p className="text-sm">{language === 'sr' ? 'Nema novih obaveštenja' : 'No new notifications'}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                </>
                            )}
                        </div>
                        {/* Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
                                className="flex items-center gap-3 pl-4 border-l hover:bg-slate-50 rounded-xl py-1 pr-2 transition-colors"
                            >
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-bold">{user?.name}</p>
                                    <p className="text-xs text-slate-500">{companyName || (userRole === 'admin' ? 'Administrator' : 'Korisnik')}</p>
                                </div>
                                <div className="w-11 h-11 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-lg">{user?.name?.charAt(0)}</div>
                                <ChevronDown size={16} className="text-slate-400 hidden sm:block" />
                            </button>
                            {showProfileMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 py-2">
                                        <div className="px-4 py-3 border-b border-slate-100">
                                            <p className="font-bold text-slate-800">{user?.name}</p>
                                            <p className="text-xs text-slate-500">{user?.phone}</p>
                                        </div>
                                        {/* ECO kod za mobilne */}
                                        {userRole !== 'admin' && companyCode && (
                                            <button
                                                onClick={() => { navigator.clipboard.writeText(companyCode); alert('ECO kod kopiran!'); setShowProfileMenu(false); }}
                                                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 text-left md:hidden"
                                            >
                                                <Copy size={18} className="text-slate-400" />
                                                <div>
                                                    <p className="text-sm font-medium">ECO Kod</p>
                                                    <p className="text-xs text-slate-500">{companyCode}</p>
                                                </div>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => { setShowSettings(true); setShowProfileMenu(false); setEditingProfile({ name: user?.name || '', phone: user?.phone || '' }); }}
                                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 text-left"
                                        >
                                            <Settings size={18} className="text-slate-400" />
                                            <span className="text-sm">{language === 'sr' ? 'Podešavanja' : 'Settings'}</span>
                                        </button>
                                        <button
                                            onClick={() => { setLanguage(language === 'sr' ? 'en' : 'sr'); setShowProfileMenu(false); }}
                                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 text-left"
                                        >
                                            <Globe size={18} className="text-slate-400" />
                                            <span className="text-sm">{language === 'sr' ? 'English' : 'Srpski'}</span>
                                        </button>
                                        <div className="border-t border-slate-100 mt-2 pt-2">
                                            <button
                                                onClick={() => { setShowProfileMenu(false); handleLogout(); }}
                                                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 text-left text-red-600"
                                            >
                                                <LogOut size={18} />
                                                <span className="text-sm">{language === 'sr' ? 'Odjavi se' : 'Log out'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-6 lg:p-8 relative z-10">
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-8"><h1 className="text-2xl font-bold">{activeTab === 'dashboard' ? `Dobrodošli, ${user?.name?.split(' ')[0]}!` : activeTab === 'new' ? 'Novi zahtev' : activeTab === 'requests' ? 'Zahtevi' : activeTab === 'clients' ? 'Klijenti' : activeTab === 'equipment' ? 'Upravljanje opremom' : activeTab === 'wastetypes' ? 'Vrste robe' : activeTab === 'map' ? 'Mapa' : activeTab === 'companies' ? 'Firme' : activeTab === 'users' ? 'Korisnici' : 'Master kodovi'}</h1></div>
                        {loading ? <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-emerald-600" size={32} /></div> : renderContent()}
                    </div>
                </main>
            </div>
            <RequestDetailsModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />
            <ClientDetailsModal client={selectedClient} onClose={() => setSelectedClient(null)} />
            {editingClientLocation && (
                <Modal open={!!editingClientLocation} onClose={() => setEditingClientLocation(null)} title="Podesi lokaciju klijenta">
                    <LocationPicker
                        initialPosition={editingClientLocation.latitude && editingClientLocation.longitude ? [editingClientLocation.latitude, editingClientLocation.longitude] : getStablePosition(editingClientLocation.id)}
                        onSave={handleSaveClientLocation}
                        onCancel={() => setEditingClientLocation(null)}
                        clientName={editingClientLocation.name}
                    />
                </Modal>
            )}
            {processedNotification && <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-50"><CheckCircle2 size={24} /><div><p className="font-semibold">{language === 'sr' ? 'Zahtev obrađen!' : 'Request processed!'}</p><p className="text-sm opacity-90">"{processedNotification.wasteLabel}" {language === 'sr' ? 'preuzet' : 'picked up'}</p></div><button onClick={clearProcessedNotification} className="p-1 hover:bg-white/20 rounded-lg"><X size={20} /></button></div>}
            {/* Settings Modal */}
            <Modal open={showSettings} onClose={() => setShowSettings(false)} title={language === 'sr' ? 'Podešavanja' : 'Settings'}>
                <div className="space-y-6">
                    {/* Language Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3">{language === 'sr' ? 'Jezik' : 'Language'}</label>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setLanguage('sr')}
                                className={`flex-1 p-4 rounded-xl border-2 text-center transition-all ${language === 'sr' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                            >
                                <span className="text-2xl mb-2 block">🇷🇸</span>
                                <span className="text-sm font-medium">Srpski</span>
                            </button>
                            <button
                                onClick={() => setLanguage('en')}
                                className={`flex-1 p-4 rounded-xl border-2 text-center transition-all ${language === 'en' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                            >
                                <span className="text-2xl mb-2 block">🇬🇧</span>
                                <span className="text-sm font-medium">English</span>
                            </button>
                        </div>
                    </div>
                    {/* Profile Info */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'sr' ? 'Ime i prezime' : 'Full name'}</label>
                        <input
                            type="text"
                            value={editingProfile.name}
                            onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'sr' ? 'Broj telefona' : 'Phone number'}</label>
                        <input
                            type="tel"
                            value={editingProfile.phone}
                            disabled
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-slate-400 mt-1">{language === 'sr' ? 'Broj telefona se ne može menjati jer se koristi za prijavu' : 'Phone number cannot be changed as it is used for login'}</p>
                    </div>
                    {/* ECO Code Display */}
                    {userRole !== 'admin' && companyCode && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">{language === 'sr' ? 'ECO Kod firme' : 'Company ECO Code'}</label>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-mono font-bold">{companyCode}</code>
                                <button
                                    onClick={() => { navigator.clipboard.writeText(companyCode); alert(language === 'sr' ? 'Kopirano!' : 'Copied!'); }}
                                    className="p-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl transition-colors"
                                >
                                    <Copy size={20} />
                                </button>
                            </div>
                        </div>
                    )}
                    {/* Save Button */}
                    <button
                        onClick={() => {
                            // Here you would save to Supabase
                            alert(language === 'sr' ? 'Podešavanja sačuvana!' : 'Settings saved!');
                            setShowSettings(false);
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl transition-colors"
                    >
                        {language === 'sr' ? 'Sačuvaj promene' : 'Save changes'}
                    </button>
                </div>
            </Modal>
        </div>
    );
}
