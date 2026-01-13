import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    LayoutDashboard, Truck, Users, Settings, LogOut, Mountain, MapPin, Bell, Search, Menu, X, Plus, Recycle, BarChart3,
    FileText, Building2, AlertCircle, CheckCircle2, Clock, Package, Send, Trash2, Eye, Copy, ChevronRight, Phone,
    RefreshCw, Info, Box, ArrowUpDown, ArrowUp, ArrowDown, Filter, Upload, Image, Globe, ChevronDown, MessageCircle, Edit3, ArrowLeft, Loader2, History, Calendar, XCircle, Printer, Download, FileSpreadsheet,
    Lock, Unlock, AlertTriangle, LogIn, Scale
} from 'lucide-react';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export const createIcon = (color) => new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

export const urgencyIcons = { '24h': createIcon('red'), '48h': createIcon('orange'), '72h': createIcon('green') };

// Custom marker icons like mobile app
export const URGENCY_COLORS = { '24h': '#EF4444', '48h': '#F59E0B', '72h': '#10B981' };
export const WASTE_ICONS_MAP = { cardboard: '📦', glass: '🍾', plastic: '♻️', trash: '🗑️' };

export const createCustomIcon = (urgency, iconEmoji, isClient = false) => {
    const color = isClient ? '#3B82F6' : (URGENCY_COLORS[urgency] || '#10B981');
    const icon = iconEmoji || (isClient ? '🏢' : '📦');
    const badge = isClient ? '' : urgency;

    return L.divIcon({
        className: 'custom-marker',
        html: `
            <div class="marker-container">
                ${!isClient ? `<div class="pulse-ring" style="border-color: ${color};"></div>` : ''}
                <div class="marker-pin" style="background-color: ${color};">
                    <span class="marker-icon">${icon}</span>
                </div>
                ${badge ? `<div class="urgency-badge" style="background-color: ${color};">${badge}</div>` : ''}
            </div>
        `,
        iconSize: [50, 60],
        iconAnchor: [25, 50],
        popupAnchor: [0, -50]
    });
};

// Add CSS for custom markers
export const markerStyles = document.createElement('style');
markerStyles.textContent = `
    .custom-marker { background: transparent !important; border: none !important; }
    .marker-container { position: relative; width: 50px; height: 60px; }
    .pulse-ring {
        position: absolute;
        width: 40px; height: 40px;
        border-radius: 50%;
        border: 3px solid;
        top: 5px; left: 5px;
        animation: pulse 1.5s ease-out infinite;
    }
    @keyframes pulse {
        0% { transform: scale(1); opacity: 0.8; }
        100% { transform: scale(2); opacity: 0; }
    }
    .marker-pin {
        position: absolute;
        width: 40px; height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        top: 5px; left: 5px;
    }
    .marker-icon { font-size: 20px; }
    .urgency-badge {
        position: absolute;
        bottom: 0; left: 50%;
        transform: translateX(-50%);
        padding: 2px 8px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: bold;
        color: white;
        white-space: nowrap;
    }
`;
if (!document.getElementById('marker-styles')) {
    markerStyles.id = 'marker-styles';
    document.head.appendChild(markerStyles);
}

// Helper
export const getRemainingTime = (createdAt, urgency) => {
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

// Get current urgency based on remaining time (not original urgency)
export const getCurrentUrgency = (createdAt, originalUrgency) => {
    const hours = originalUrgency === '24h' ? 24 : originalUrgency === '48h' ? 48 : 72;
    const deadline = new Date(new Date(createdAt).getTime() + hours * 60 * 60 * 1000);
    const diff = deadline - new Date();
    const remainingHours = diff / (1000 * 60 * 60);

    if (remainingHours <= 0) return '24h';   // Expired = most urgent
    if (remainingHours <= 24) return '24h';  // Less than 24h = urgent (red)
    if (remainingHours <= 48) return '48h';  // Less than 48h = medium (orange)
    return '72h';                             // More than 48h = not urgent (green)
};

// Self-updating countdown timer component (prevents full page re-renders)
export const CountdownTimer = ({ createdAt, urgency }) => {
    const [, setTick] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);
    const rem = getRemainingTime(createdAt, urgency);
    return <span className={`text-sm font-mono font-bold ${rem.color}`}>⏱ {rem.text}</span>;
};

// Fill level colors based on capacity (50%=green, 75%=orange, 100%=red, null/undefined=blue)
export const getFillLevelColor = (fillLevel) => {
    if (fillLevel === null || fillLevel === undefined || fillLevel === '') {
        return { bg: 'bg-blue-500', text: 'text-blue-600', hex: '#3B82F6' };
    }
    const level = parseInt(fillLevel);
    if (level >= 100) return { bg: 'bg-red-500', text: 'text-red-600', hex: '#EF4444' };
    if (level >= 75) return { bg: 'bg-amber-500', text: 'text-amber-600', hex: '#F59E0B' };
    return { bg: 'bg-emerald-500', text: 'text-emerald-600', hex: '#10B981' };
};

// Fill level bar component with proper coloring
export const FillLevelBar = ({ fillLevel, showLabel = true }) => {
    const colors = getFillLevelColor(fillLevel);
    const displayLevel = fillLevel !== null && fillLevel !== undefined && fillLevel !== '' ? fillLevel : 0;
    const labelText = fillLevel !== null && fillLevel !== undefined && fillLevel !== '' ? `${fillLevel}%` : '-';

    return (
        <div className="flex items-center gap-2">
            <div className="w-12 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${colors.bg}`} style={{ width: `${displayLevel}%` }} />
            </div>
            {showLabel && <span className={`text-xs font-medium ${colors.text}`}>{labelText}</span>}
        </div>
    );
};

export const WASTE_TYPES = [
    { id: 'cardboard', label: 'Karton', icon: '📦' },
    { id: 'plastic', label: 'Plastika', icon: '♻️' },
    { id: 'glass', label: 'Staklo', icon: '🍾' },
];

// Request Status Badge for manager view
export const RequestStatusBadge = ({ status, driverName }) => {
    const configs = {
        'not_assigned': { label: 'Nije dodeljeno', bg: 'bg-slate-100', color: 'text-slate-600', icon: '○' },
        'assigned': { label: 'Čeka preuzimanje', bg: 'bg-blue-100', color: 'text-blue-700', icon: '⏳' },
        'in_progress': { label: 'U toku', bg: 'bg-blue-100', color: 'text-blue-700', icon: '🚚' },
        'picked_up': { label: 'Preuzeto', bg: 'bg-amber-100', color: 'text-amber-700', icon: '📦' },
        'delivered': { label: 'Dostavljeno', bg: 'bg-emerald-100', color: 'text-emerald-700', icon: '✓' }
    };
    const config = configs[status] || configs['not_assigned'];
    return (
        <div className="flex flex-col gap-0.5">
            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.color}`}>
                <span>{config.icon}</span>
                {config.label}
            </span>
            {driverName && status !== 'not_assigned' && (
                <span className="text-xs text-slate-400 pl-1 truncate max-w-[100px]">{driverName}</span>
            )}
        </div>
    );
};

// Image upload helper
export const uploadImage = async (file, folder = 'uploads', bucket = 'receipts') => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return publicUrl;
};

// Image upload component
export const ImageUploader = ({ currentImage, onUpload, onRemove, label = "Koristi svoju sliku", bucket = 'receipts' }) => {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const resetInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.type = 'text';
            fileInputRef.current.type = 'file';
        }
    };

    const handleFileChange = async (e) => {
        const files = e.target.files;
        console.log('Files in input:', files?.length, 'files');

        const file = files?.[0];
        if (!file) {
            console.log('No file selected');
            return;
        }

        // Debug: log file info
        console.log('=== FILE INFO ===');
        console.log('Name:', file.name);
        console.log('Size:', file.size, 'bytes');
        console.log('Size in MB:', (file.size / 1024 / 1024).toFixed(2), 'MB');
        console.log('Type:', file.type);
        console.log('Last modified:', new Date(file.lastModified).toISOString());
        console.log('=================');

        if (!file.type.startsWith('image/')) {
            alert('Molimo izaberite sliku');
            resetInput();
            return;
        }

        const sizeMB = file.size / 1024 / 1024;
        if (sizeMB > 2) {
            alert(`Slika "${file.name}" je prevelika: ${sizeMB.toFixed(2)}MB (max 2MB)`);
            resetInput();
            return;
        }

        setUploading(true);
        try {
            const url = await uploadImage(file, 'uploads', bucket);
            onUpload(url);
        } catch (err) {
            alert('Greška pri uploadu: ' + err.message);
        } finally {
            setUploading(false);
            resetInput();
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
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={uploading} />
                </label>
            )}
        </div>
    );
};

// Components - memoized for performance
export const StatCard = memo(({ label, value, icon, onClick }) => (
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
));

export const SidebarItem = memo(({ icon: Icon, label, active, onClick, badge, isLink, href }) => {
    const baseClasses = `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${active ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`;

    if (isLink && href) {
        return (
            <a href={href} className={baseClasses}>
                <Icon size={20} />
                <span className="flex-1 text-left">{label}</span>
                {badge > 0 && <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${active ? 'bg-white text-emerald-600' : 'bg-red-500 text-white'}`}>{badge}</span>}
            </a>
        );
    }

    return (
        <button onClick={onClick} className={baseClasses}>
            <Icon size={20} />
            <span className="flex-1 text-left">{label}</span>
            {badge > 0 && <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${active ? 'bg-white text-emerald-600' : 'bg-red-500 text-white'}`}>{badge}</span>}
        </button>
    );
});

export const Modal = ({ open, onClose, title, children }) => {
    if (!open) return null;
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                    <h2 className="text-lg font-bold">{title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>,
        document.body
    );
};

export const EmptyState = memo(({ icon: Icon, title, desc }) => (
    <div className="text-center py-16">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400"><Icon size={40} /></div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-500">{desc}</p>
    </div>
));

// Client Form
export const NewRequestForm = ({ onSubmit, loading, wasteTypes = WASTE_TYPES }) => {
    const [wasteType, setWasteType] = useState(null);
    const [fillLevel, setFillLevel] = useState(null);
    const [urgency, setUrgency] = useState(null);
    const [note, setNote] = useState('');

    return (
        <div className="space-y-6 bg-white rounded-2xl p-6 border">
            <div>
                <h3 className="font-semibold mb-4">Vrsta Robe</h3>
                <div className={`grid gap-3 ${wasteTypes.length === 1 ? 'grid-cols-1 md:grid-cols-1' :
                    wasteTypes.length === 2 ? 'grid-cols-2 md:grid-cols-2' :
                        wasteTypes.length === 3 ? 'grid-cols-3 md:grid-cols-3' :
                            wasteTypes.length === 4 ? 'grid-cols-2 md:grid-cols-4' :
                                'grid-cols-3 md:grid-cols-5'
                    }`}>
                    {wasteTypes.map(w => (
                        <button
                            key={w.id}
                            onClick={() => setWasteType(w.id)}
                            className={`relative group overflow-hidden rounded-xl border-2 transition-all duration-200 ${wasteType === w.id ? 'border-emerald-500 ring-2 ring-emerald-500 ring-offset-2' : 'border-slate-200 hover:border-emerald-300'
                                } ${w.customImage ? 'h-32 p-0' : 'h-32 p-4 flex flex-col items-center justify-center'}`}
                        >
                            {w.customImage ? (
                                <>
                                    <img src={w.customImage} alt={w.label} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    <div className={`absolute inset-0 flex items-end justify-center p-2 ${wasteType === w.id ? 'bg-black/40' : 'bg-black/20 group-hover:bg-black/30'}`}>
                                        <span className="text-white text-sm font-bold drop-shadow-md text-center leading-tight">{w.label}</span>
                                    </div>
                                    {wasteType === w.id && (
                                        <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full shadow-lg">
                                            <CheckCircle2 size={14} />
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <span className="text-4xl block mb-2 filter drop-shadow-sm transition-transform duration-200 group-hover:scale-110">{w.icon}</span>
                                    <span className={`text-sm font-medium text-center ${wasteType === w.id ? 'text-emerald-700' : 'text-slate-600'}`}>{w.label}</span>
                                </>
                            )}
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
                    {[{ v: '24h', l: 'Hitno', h: '24h', c: 'red' }, { v: '48h', l: 'Srednje', h: '48h', c: 'amber' }, { v: '72h', l: 'Normalno', h: '72h', c: 'emerald' }].map(u => (
                        <button key={u.v} onClick={() => setUrgency(u.v)} className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-1 ${urgency === u.v ? `border-${u.c}-500 bg-${u.c}-50` : 'border-slate-200'}`}>
                            <span className="text-sm font-bold block">{u.l}</span>
                            <span className={`text-xs ${urgency === u.v ? `text-${u.c}-700` : 'text-slate-500'}`}>({u.h})</span>
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

// Client Requests View - Shows active pending requests
export const ClientRequestsView = ({ requests, wasteTypes }) => {
    const [sortBy, setSortBy] = useState('date'); // date, urgency, type
    const [sortDir, setSortDir] = useState('desc');

    if (!requests?.length) {
        return (
            <div className="bg-white rounded-2xl border p-12 text-center">
                <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">Nema aktivnih zahteva</h3>
                <p className="text-slate-500">Trenutno nemate zahteve na čekanju</p>
            </div>
        );
    }

    const sorted = [...requests].sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'date') cmp = new Date(b.created_at) - new Date(a.created_at);
        else if (sortBy === 'urgency') {
            const urgencyOrder = { '24h': 0, '48h': 1, '72h': 2 };
            cmp = (urgencyOrder[a.urgency] || 2) - (urgencyOrder[b.urgency] || 2);
        } else if (sortBy === 'type') cmp = (a.waste_label || '').localeCompare(b.waste_label || '');
        return sortDir === 'desc' ? -cmp : cmp;
    });

    const toggleSort = (key) => {
        if (sortBy === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        else { setSortBy(key); setSortDir('asc'); }
    };

    return (
        <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
                <h2 className="font-bold text-lg">Aktivni zahtevi ({requests.length})</h2>
                <div className="flex gap-2">
                    {[{ key: 'date', label: 'Datum' }, { key: 'urgency', label: 'Hitnost' }, { key: 'type', label: 'Tip' }].map(s => (
                        <button
                            key={s.key}
                            onClick={() => toggleSort(s.key)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${sortBy === s.key ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                            {s.label}
                            {sortBy === s.key && (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                        </button>
                    ))}
                </div>
            </div>
            <div className="divide-y">
                {sorted.map(r => (
                        <div key={r.id} className="p-5 hover:bg-slate-50 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center text-3xl">
                                        {wasteTypes.find(w => w.id === r.waste_type)?.icon || '📦'}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-800 text-lg">{r.waste_label}</h4>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                {new Date(r.created_at).toLocaleDateString('sr-RS', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock size={14} />
                                                {new Date(r.created_at).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        {r.note && <p className="text-sm text-slate-400 mt-2 italic">"{r.note}"</p>}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className={`px-4 py-2 text-sm font-semibold rounded-xl ${r.urgency === '24h' ? 'bg-red-100 text-red-700' : r.urgency === '48h' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {r.urgency === '24h' ? 'Hitno (24h)' : r.urgency === '48h' ? 'Srednje (48h)' : 'Normalno (72h)'}
                                    </span>
                                    <CountdownTimer createdAt={r.created_at} urgency={r.urgency} />
                                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                                        Na čekanju
                                    </span>
                                </div>
                            </div>
                        </div>
                ))}
            </div>
        </div>
    );
};

// Client History View - Shows past processed requests with pagination and search
export const ClientHistoryView = ({ history, loading, wasteTypes }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortBy, setSortBy] = useState('processed_at'); // processed_at, created_at, type
    const [sortDir, setSortDir] = useState('desc');
    const [viewingProof, setViewingProof] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const itemsPerPage = 10;

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border p-12 text-center">
                <Loader2 size={40} className="mx-auto text-emerald-500 mb-4 animate-spin" />
                <p className="text-slate-500">Učitavanje istorije...</p>
            </div>
        );
    }

    if (!history?.length) {
        return (
            <div className="bg-white rounded-2xl border p-12 text-center">
                <History size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">Nema istorije</h3>
                <p className="text-slate-500">Vaši obrađeni zahtevi će se pojaviti ovde</p>
            </div>
        );
    }

    // Filter by search query
    const filtered = searchQuery.trim()
        ? history.filter(r => {
            const query = searchQuery.toLowerCase();
            return (
                (r.waste_label || '').toLowerCase().includes(query) ||
                (r.waste_type || '').toLowerCase().includes(query) ||
                (r.note || '').toLowerCase().includes(query) ||
                (r.processing_note || '').toLowerCase().includes(query) ||
                new Date(r.processed_at).toLocaleDateString('sr-RS').includes(query) ||
                new Date(r.created_at).toLocaleDateString('sr-RS').includes(query)
            );
        })
        : history;

    const sorted = [...filtered].sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'processed_at') cmp = new Date(b.processed_at) - new Date(a.processed_at);
        else if (sortBy === 'created_at') cmp = new Date(b.created_at) - new Date(a.created_at);
        else if (sortBy === 'type') cmp = (a.waste_label || '').localeCompare(b.waste_label || '');
        return sortDir === 'desc' ? cmp : -cmp;
    });

    const totalPages = Math.ceil(sorted.length / itemsPerPage);
    const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const toggleSort = (key) => {
        if (sortBy === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        else { setSortBy(key); setSortDir('desc'); }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border overflow-hidden">
                <div className="p-4 border-b bg-slate-50 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h2 className="font-bold text-lg">Istorija zahteva ({filtered.length}{searchQuery && ` od ${history.length}`})</h2>
                        <div className="flex gap-2">
                            {[{ key: 'processed_at', label: 'Datum obrade' }, { key: 'created_at', label: 'Datum zahteva' }, { key: 'type', label: 'Tip' }].map(s => (
                                <button
                                    key={s.key}
                                    onClick={() => toggleSort(s.key)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${sortBy === s.key ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    {s.label}
                                    {sortBy === s.key && (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Pretraži po tipu, datumu, napomeni..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
                <div className="divide-y">
                    {paginated.map((r, idx) => (
                        <div key={r.id || idx} className="p-5 hover:bg-slate-50 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center text-3xl">
                                        {wasteTypes.find(w => w.id === r.waste_type)?.icon || '📦'}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-800 text-lg">{r.waste_label || r.waste_type}</h4>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Send size={14} className="text-blue-500" />
                                                Podneto: {new Date(r.created_at).toLocaleDateString('sr-RS', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <CheckCircle2 size={14} className="text-emerald-500" />
                                                Obrađeno: {new Date(r.processed_at).toLocaleDateString('sr-RS', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        {r.note && <p className="text-sm text-slate-400 mt-2 italic">"{r.note}"</p>}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-100 text-emerald-700 flex items-center gap-2">
                                        <CheckCircle2 size={16} /> Obrađeno
                                    </span>
                                    {r.urgency && (
                                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${r.urgency === '24h' ? 'bg-red-50 text-red-600' : r.urgency === '48h' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                                            {r.urgency === '24h' ? 'Bilo hitno' : r.urgency === '48h' ? 'Bilo srednje' : 'Bilo normalno'}
                                        </span>
                                    )}
                                    {r.proof_image_url && (
                                        <button
                                            onClick={() => setViewingProof(r)}
                                            className="px-3 py-1.5 text-xs font-medium rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1"
                                        >
                                            <Image size={14} /> Dokaz
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Proof Image/PDF Modal */}
            {viewingProof && (
                <Modal open={!!viewingProof} onClose={() => setViewingProof(null)} title="Dokaz o izvršenoj usluzi">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <span className="text-2xl">{wasteTypes.find(w => w.id === viewingProof.waste_type)?.icon}</span>
                            <div>
                                <p className="font-medium">{viewingProof.waste_label}</p>
                                <p className="text-xs text-slate-500">
                                    Obrađeno: {new Date(viewingProof.processed_at).toLocaleDateString('sr-RS', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>

                        {/* Check if PDF or Image */}
                        {viewingProof.proof_image_url?.toLowerCase().endsWith('.pdf') ? (
                            <div className="border rounded-xl overflow-hidden">
                                <iframe
                                    src={viewingProof.proof_image_url}
                                    className="w-full h-96"
                                    title="PDF Dokaz"
                                />
                            </div>
                        ) : (
                            <img
                                src={viewingProof.proof_image_url}
                                alt="Dokaz o izvršenoj usluzi"
                                className="w-full rounded-xl"
                            />
                        )}

                        {viewingProof.processing_note && (
                            <div className="p-3 bg-amber-50 rounded-xl">
                                <p className="text-xs text-amber-600 mb-1">Napomena pri obradi</p>
                                <p className="text-sm">{viewingProof.processing_note}</p>
                            </div>
                        )}

                        {/* Download button */}
                        <a
                            href={viewingProof.proof_image_url}
                            download={`dokaz_${viewingProof.id || Date.now()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium transition-colors"
                        >
                            <Download size={18} />
                            Preuzmi dokaz
                        </a>
                    </div>
                </Modal>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 bg-white rounded-2xl border p-4">
                    <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 rounded-xl border bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                        <ChevronDown size={16} className="rotate-90" /> Prethodna
                    </button>
                    <div className="flex items-center gap-1">
                        {/* Smart pagination: show limited pages with ellipsis */}
                        {(() => {
                            const pages = [];
                            const showPages = 5; // Max pages to show
                            let start = Math.max(1, currentPage - Math.floor(showPages / 2));
                            let end = Math.min(totalPages, start + showPages - 1);
                            if (end - start + 1 < showPages) {
                                start = Math.max(1, end - showPages + 1);
                            }

                            if (start > 1) {
                                pages.push(
                                    <button key={1} onClick={() => setCurrentPage(1)} className="w-10 h-10 rounded-xl font-medium bg-white border text-slate-600 hover:bg-slate-50">1</button>
                                );
                                if (start > 2) pages.push(<span key="start-dots" className="px-1 text-slate-400">...</span>);
                            }

                            for (let i = start; i <= end; i++) {
                                pages.push(
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(i)}
                                        className={`w-10 h-10 rounded-xl font-medium transition-colors ${currentPage === i ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        {i}
                                    </button>
                                );
                            }

                            if (end < totalPages) {
                                if (end < totalPages - 1) pages.push(<span key="end-dots" className="px-1 text-slate-400">...</span>);
                                pages.push(
                                    <button key={totalPages} onClick={() => setCurrentPage(totalPages)} className="w-10 h-10 rounded-xl font-medium bg-white border text-slate-600 hover:bg-slate-50">{totalPages}</button>
                                );
                            }

                            return pages;
                        })()}
                    </div>
                    <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 rounded-xl border bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                        Sledeća <ChevronDown size={16} className="-rotate-90" />
                    </button>
                    <span className="text-sm text-slate-500 ml-2">
                        Stranica {currentPage} od {totalPages}
                    </span>
                </div>
            )}

            {/* No results message */}
            {filtered.length === 0 && searchQuery && (
                <div className="bg-white rounded-2xl border p-8 text-center">
                    <Search size={40} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-600 font-medium">Nema rezultata za "{searchQuery}"</p>
                    <button onClick={() => setSearchQuery('')} className="mt-3 text-emerald-600 hover:underline text-sm">
                        Obriši pretragu
                    </button>
                </div>
            )}
        </div>
    );
};

// Manager Table with sorting, filtering and search
export const ManagerRequestsTable = ({ requests, onProcess, onDelete, onView, onClientClick, wasteTypes = WASTE_TYPES, initialUrgencyFilter = 'all', onUrgencyFilterChange, assignments = [] }) => {
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
        // Urgency filter - use current urgency based on remaining time, not original
        if (filterUrgency !== 'all') {
            const currentUrgency = getCurrentUrgency(req.created_at, req.urgency);
            if (currentUrgency !== filterUrgency) return false;
        }
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
                <div className="relative flex-1 md:max-w-md">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                    <input
                        type="text"
                        placeholder="Pretraži po imenu, vrsti, datumu..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none text-sm placeholder:text-slate-400"
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
                            <th className="px-3 md:px-4 py-3 text-left">
                                <button onClick={() => handleSort('client')} className="flex items-center gap-1.5 hover:text-slate-700">
                                    Klijent <SortIcon column="client" />
                                </button>
                            </th>
                            <th className="px-3 md:px-4 py-3 text-left">
                                <button onClick={() => handleSort('type')} className="flex items-center gap-1.5 hover:text-slate-700">
                                    Tip <SortIcon column="type" />
                                </button>
                            </th>
                            <th className="hidden lg:table-cell px-4 py-3 text-left">Status</th>
                            <th className="hidden md:table-cell px-4 py-3 text-left">
                                <button onClick={() => handleSort('fill')} className="flex items-center gap-1.5 hover:text-slate-700">
                                    % <SortIcon column="fill" />
                                </button>
                            </th>
                            <th className="px-3 md:px-4 py-3 text-left">
                                <button onClick={() => handleSort('remaining')} className="flex items-center gap-1.5 hover:text-slate-700">
                                    <span className="hidden sm:inline">Preostalo</span>
                                    <span className="sm:hidden">Vreme</span>
                                    <SortIcon column="remaining" />
                                </button>
                            </th>
                            <th className="hidden md:table-cell px-4 py-3 text-left">
                                <button onClick={() => handleSort('date')} className="flex items-center gap-1.5 hover:text-slate-700">
                                    Datum <SortIcon column="date" />
                                </button>
                            </th>
                            <th className="px-2 md:px-4 py-3 text-center">Akcije</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Nema rezultata za ovu pretragu</td></tr>
                        ) : filtered.map(req => {
                            const rem = getRemainingTime(req.created_at, req.urgency);
                            const currentUrg = getCurrentUrgency(req.created_at, req.urgency);
                            const assignment = assignments.find(a => a.request_id === req.id);
                            const assignmentStatus = assignment?.status || 'not_assigned';
                            const driverName = assignment?.driver?.name;
                            return (
                                <tr key={req.id} className="hover:bg-slate-50">
                                    <td className="px-3 md:px-4 py-3">
                                        <button
                                            onClick={() => onClientClick?.(req.user_id)}
                                            className="font-medium text-sm text-blue-600 hover:text-blue-800 hover:underline text-left"
                                        >
                                            {req.client_name}
                                        </button>
                                    </td>
                                    <td className="px-3 md:px-4 py-3">
                                        <span className="text-lg">{wasteTypes.find(w => w.id === req.waste_type)?.icon || '📦'}</span>
                                        <span className="hidden sm:inline ml-1">{req.waste_label}</span>
                                    </td>
                                    <td className="hidden lg:table-cell px-4 py-3">
                                        <RequestStatusBadge status={assignmentStatus} driverName={driverName} />
                                    </td>
                                    <td className="hidden md:table-cell px-4 py-3">
                                        <FillLevelBar fillLevel={req.fill_level} />
                                    </td>
                                    <td className="px-3 md:px-4 py-3"><span className={`px-2 py-1 text-xs font-medium rounded-full ${rem.bg} ${rem.color}`}>{rem.text}</span></td>
                                    <td className="hidden md:table-cell px-4 py-3 text-xs text-slate-500">{new Date(req.created_at).toLocaleDateString('sr-RS')}</td>
                                    <td className="px-2 md:px-4 py-3 text-center whitespace-nowrap">
                                        <button onClick={() => onView(req)} className="p-1.5 md:p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Info"><Info size={18} /></button>
                                        <button onClick={() => onProcess(req)} className="p-1.5 md:p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Obradi"><CheckCircle2 size={18} /></button>
                                        <button onClick={() => onDelete(req.id)} className="p-1.5 md:p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Obriši"><Trash2 size={18} /></button>
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

// Print & Export Component
export const PrintExport = ({ clients, requests, processedRequests, wasteTypes = WASTE_TYPES, onClientClick }) => {
    const [dataType, setDataType] = useState('clients'); // clients, requests, history
    const [selectedFields, setSelectedFields] = useState({
        clients: { name: true, phone: true, address: true, equipment: false },
        requests: { client: true, type: true, urgency: true, date: true, fillLevel: false, note: false },
        history: { client: true, type: true, created: true, processed: true }
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredData, setFilteredData] = useState([]);
    const [sortBy, setSortBy] = useState('name'); // name, remaining, date, processed
    const [sortDir, setSortDir] = useState('asc');

    // Reset sort when changing data type
    useEffect(() => {
        setSortBy('name');
        setSortDir('asc');
    }, [dataType]);

    useEffect(() => {
        let data = [];
        const query = searchQuery.toLowerCase();

        if (dataType === 'clients') {
            data = (clients || []).filter(c =>
                !query || c.name?.toLowerCase().includes(query) || c.phone?.includes(query) || c.address?.toLowerCase().includes(query)
            );
        } else if (dataType === 'requests') {
            data = (requests || []).filter(r =>
                !query || r.client_name?.toLowerCase().includes(query) || r.waste_label?.toLowerCase().includes(query)
            );
        } else if (dataType === 'history') {
            data = (processedRequests || []).filter(r =>
                !query || r.client_name?.toLowerCase().includes(query) || r.waste_label?.toLowerCase().includes(query)
            );
        }

        // Sort data
        data = [...data].sort((a, b) => {
            let comparison = 0;
            if (dataType === 'clients') {
                if (sortBy === 'name') comparison = (a.name || '').localeCompare(b.name || '');
            } else if (dataType === 'requests') {
                if (sortBy === 'name') comparison = (a.client_name || '').localeCompare(b.client_name || '');
                else if (sortBy === 'remaining') comparison = getRemainingTime(a.created_at, a.urgency).ms - getRemainingTime(b.created_at, b.urgency).ms;
                else if (sortBy === 'date') comparison = new Date(a.created_at) - new Date(b.created_at);
            } else if (dataType === 'history') {
                if (sortBy === 'name') comparison = (a.client_name || '').localeCompare(b.client_name || '');
                else if (sortBy === 'date') comparison = new Date(a.created_at) - new Date(b.created_at);
                else if (sortBy === 'processed') comparison = new Date(a.processed_at) - new Date(b.processed_at);
            }
            return sortDir === 'asc' ? comparison : -comparison;
        });

        setFilteredData(data);
    }, [dataType, clients, requests, processedRequests, searchQuery, sortBy, sortDir]);

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortDir('asc');
        }
    };

    const toggleField = (type, field) => {
        setSelectedFields(prev => ({
            ...prev,
            [type]: { ...prev[type], [field]: !prev[type][field] }
        }));
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        const fields = selectedFields[dataType];

        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>EcoMountainTracking - Štampa</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #059669; margin-bottom: 5px; }
                    .subtitle { color: #64748b; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
                    th { background: #f1f5f9; font-weight: 600; }
                    tr:nth-child(even) { background: #f8fafc; }
                    .footer { margin-top: 20px; color: #94a3b8; font-size: 12px; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                <h1>EcoMountainTracking</h1>
                <p class="subtitle">${dataType === 'clients' ? 'Lista klijenata' : dataType === 'requests' ? 'Aktivni zahtevi' : 'Istorija zahteva'} - ${new Date().toLocaleDateString('sr-RS')}</p>
                <table>
                    <thead><tr>
        `;

        // Headers
        if (dataType === 'clients') {
            if (fields.name) html += '<th>Ime</th>';
            if (fields.phone) html += '<th>Telefon</th>';
            if (fields.address) html += '<th>Adresa</th>';
            if (fields.equipment) html += '<th>Oprema</th>';
        } else if (dataType === 'requests') {
            if (fields.client) html += '<th>Klijent</th>';
            if (fields.type) html += '<th>Tip</th>';
            if (fields.urgency) html += '<th>Preostalo</th>';
            if (fields.date) html += '<th>Datum</th>';
            if (fields.fillLevel) html += '<th>Popunjenost</th>';
            if (fields.note) html += '<th>Napomena</th>';
        } else {
            if (fields.client) html += '<th>Klijent</th>';
            if (fields.type) html += '<th>Tip</th>';
            if (fields.created) html += '<th>Podneto</th>';
            if (fields.processed) html += '<th>Obrađeno</th>';
        }

        html += '</tr></thead><tbody>';

        // Rows
        filteredData.forEach(item => {
            html += '<tr>';
            if (dataType === 'clients') {
                if (fields.name) html += `<td>${item.name || '-'}</td>`;
                if (fields.phone) html += `<td>${item.phone || '-'}</td>`;
                if (fields.address) html += `<td>${item.address || '-'}</td>`;
                if (fields.equipment) html += `<td>${item.equipment_types?.length || 0} kom</td>`;
            } else if (dataType === 'requests') {
                if (fields.client) html += `<td>${item.client_name || '-'}</td>`;
                if (fields.type) html += `<td>${item.waste_label || '-'}</td>`;
                if (fields.urgency) {
                    const remaining = getRemainingTime(item.created_at, item.urgency);
                    html += `<td>${remaining.text}</td>`;
                }
                if (fields.date) html += `<td>${new Date(item.created_at).toLocaleDateString('sr-RS')}</td>`;
                if (fields.fillLevel) html += `<td>${item.fill_level}%</td>`;
                if (fields.note) html += `<td>${item.note || '-'}</td>`;
            } else {
                if (fields.client) html += `<td>${item.client_name || '-'}</td>`;
                if (fields.type) html += `<td>${item.waste_label || '-'}</td>`;
                if (fields.created) html += `<td>${new Date(item.created_at).toLocaleDateString('sr-RS')}</td>`;
                if (fields.processed) html += `<td>${new Date(item.processed_at).toLocaleDateString('sr-RS')}</td>`;
            }
            html += '</tr>';
        });

        html += `
                    </tbody>
                </table>
                <p class="footer">Generisano: ${new Date().toLocaleString('sr-RS')} | Ukupno: ${filteredData.length} stavki</p>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
    };

    const handleExportExcel = () => {
        const fields = selectedFields[dataType];
        let csv = '\uFEFF'; // BOM for UTF-8

        // Headers
        const headers = [];
        if (dataType === 'clients') {
            if (fields.name) headers.push('Ime');
            if (fields.phone) headers.push('Telefon');
            if (fields.address) headers.push('Adresa');
            if (fields.equipment) headers.push('Oprema');
        } else if (dataType === 'requests') {
            if (fields.client) headers.push('Klijent');
            if (fields.type) headers.push('Tip');
            if (fields.urgency) headers.push('Preostalo');
            if (fields.date) headers.push('Datum');
            if (fields.fillLevel) headers.push('Popunjenost');
            if (fields.note) headers.push('Napomena');
        } else {
            if (fields.client) headers.push('Klijent');
            if (fields.type) headers.push('Tip');
            if (fields.created) headers.push('Podneto');
            if (fields.processed) headers.push('Obrađeno');
        }
        csv += headers.join(';') + '\n';

        // Rows
        filteredData.forEach(item => {
            const row = [];
            if (dataType === 'clients') {
                if (fields.name) row.push(item.name || '');
                if (fields.phone) row.push(`="${item.phone || ''}"`); // Force text format to prevent scientific notation
                if (fields.address) row.push(`"${(item.address || '').replace(/"/g, '""')}"`);
                if (fields.equipment) row.push(`${item.equipment_types?.length || 0} kom`);
            } else if (dataType === 'requests') {
                if (fields.client) row.push(item.client_name || '');
                if (fields.type) row.push(item.waste_label || '');
                if (fields.urgency) {
                    const remaining = getRemainingTime(item.created_at, item.urgency);
                    row.push(remaining.text);
                }
                if (fields.date) row.push(new Date(item.created_at).toLocaleDateString('sr-RS'));
                if (fields.fillLevel) row.push(`${item.fill_level}%`);
                if (fields.note) row.push(`"${(item.note || '').replace(/"/g, '""')}"`);
            } else {
                if (fields.client) row.push(item.client_name || '');
                if (fields.type) row.push(item.waste_label || '');
                if (fields.created) row.push(new Date(item.created_at).toLocaleDateString('sr-RS'));
                if (fields.processed) row.push(new Date(item.processed_at).toLocaleDateString('sr-RS'));
            }
            csv += row.join(';') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ecoplanina_${dataType}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const fields = selectedFields[dataType];
    const fieldLabels = {
        clients: { name: 'Ime', phone: 'Telefon', address: 'Adresa', equipment: 'Oprema' },
        requests: { client: 'Klijent', type: 'Tip', urgency: 'Preostalo', date: 'Datum', fillLevel: 'Popunjenost', note: 'Napomena' },
        history: { client: 'Klijent', type: 'Tip', created: 'Podneto', processed: 'Obrađeno' }
    };

    return (
        <div className="space-y-6">
            {/* Data Type Selection */}
            <div className="bg-white rounded-2xl border p-6">
                <h3 className="font-bold text-slate-800 mb-4">Izaberi podatke za štampu/export</h3>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => setDataType('clients')}
                        className={`px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 ${dataType === 'clients' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                        <Users size={18} />
                        Klijenti ({clients?.length || 0})
                    </button>
                    <button
                        onClick={() => setDataType('requests')}
                        className={`px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 ${dataType === 'requests' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                        <Truck size={18} />
                        Aktivni zahtevi ({requests?.length || 0})
                    </button>
                    <button
                        onClick={() => setDataType('history')}
                        className={`px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 ${dataType === 'history' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                        <History size={18} />
                        Istorija ({processedRequests?.length || 0})
                    </button>
                </div>
            </div>

            {/* Search & Field Selection */}
            <div className="bg-white rounded-2xl border p-6">
                <div className="flex flex-wrap gap-4 mb-4">
                    <div className="relative flex-1 md:max-w-md">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                        <input
                            type="text"
                            placeholder="Pretraži po imenu, vrsti, datumu..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none text-sm placeholder:text-slate-400"
                        />
                    </div>
                </div>

                <h4 className="font-medium text-slate-700 mb-3">Izaberi kolone za prikaz:</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                    {Object.entries(fields).map(([field, isChecked]) => (
                        <label
                            key={field}
                            className={`px-3 py-2 rounded-lg border cursor-pointer transition-all ${isChecked ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'}`}
                        >
                            <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleField(dataType, field)}
                                className="sr-only"
                            />
                            <span className="text-sm font-medium">{fieldLabels[dataType][field]}</span>
                        </label>
                    ))}
                </div>

                <div className="flex items-center gap-4 mt-4">
                    <span className="text-sm text-slate-500">Filtrirano: {filteredData.length} stavki</span>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">Sortiraj:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        >
                            <option value="name">Po imenu</option>
                            {dataType === 'requests' && <option value="remaining">Po preostalom vremenu</option>}
                            {(dataType === 'requests' || dataType === 'history') && <option value="date">Po datumu kreiranja</option>}
                            {dataType === 'history' && <option value="processed">Po datumu obrade</option>}
                        </select>
                        <button
                            onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
                            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50"
                            title={sortDir === 'asc' ? 'Rastuće' : 'Opadajuće'}
                        >
                            {sortDir === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview */}
            <div className="bg-white rounded-2xl border overflow-hidden">
                <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Pregled ({filteredData.length})</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={handleExportExcel}
                            disabled={filteredData.length === 0}
                            className="px-4 py-2 bg-green-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-green-700 disabled:opacity-50"
                        >
                            <FileSpreadsheet size={18} />
                            <span className="hidden sm:inline">Excel/CSV</span>
                        </button>
                        <button
                            onClick={handlePrint}
                            disabled={filteredData.length === 0}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Printer size={18} />
                            <span className="hidden sm:inline">Štampaj</span>
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 border-b sticky top-0">
                            <tr>
                                {dataType === 'clients' && (
                                    <>
                                        {fields.name && <th className="px-4 py-3 text-left">Ime</th>}
                                        {fields.phone && <th className="px-4 py-3 text-left">Telefon</th>}
                                        {fields.address && <th className="px-4 py-3 text-left">Adresa</th>}
                                        {fields.equipment && <th className="px-4 py-3 text-left">Oprema</th>}
                                    </>
                                )}
                                {dataType === 'requests' && (
                                    <>
                                        {fields.client && <th className="px-4 py-3 text-left">Klijent</th>}
                                        {fields.type && <th className="px-4 py-3 text-left">Tip</th>}
                                        {fields.urgency && <th className="px-4 py-3 text-left">Preostalo</th>}
                                        {fields.date && <th className="px-4 py-3 text-left">Datum</th>}
                                        {fields.fillLevel && <th className="px-4 py-3 text-left">%</th>}
                                        {fields.note && <th className="px-4 py-3 text-left">Napomena</th>}
                                    </>
                                )}
                                {dataType === 'history' && (
                                    <>
                                        {fields.client && <th className="px-4 py-3 text-left">Klijent</th>}
                                        {fields.type && <th className="px-4 py-3 text-left">Tip</th>}
                                        {fields.created && <th className="px-4 py-3 text-left">Podneto</th>}
                                        {fields.processed && <th className="px-4 py-3 text-left">Obrađeno</th>}
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredData.slice(0, 50).map((item, idx) => (
                                <tr key={item.id || idx} className="hover:bg-slate-50">
                                    {dataType === 'clients' && (
                                        <>
                                            {fields.name && <td className="px-4 py-3"><button onClick={() => onClientClick?.(item.id)} className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left">{item.name}</button></td>}
                                            {fields.phone && <td className="px-4 py-3 text-slate-600">{item.phone}</td>}
                                            {fields.address && <td className="px-4 py-3 text-slate-600">{item.address || '-'}</td>}
                                            {fields.equipment && <td className="px-4 py-3 text-slate-600">{item.equipment_types?.length || 0} kom</td>}
                                        </>
                                    )}
                                    {dataType === 'requests' && (
                                        <>
                                            {fields.client && <td className="px-4 py-3"><button onClick={() => onClientClick?.(item.user_id)} className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left">{item.client_name}</button></td>}
                                            {fields.type && <td className="px-4 py-3">{item.waste_label}</td>}
                                            {fields.urgency && (() => {
                                                const remaining = getRemainingTime(item.created_at, item.urgency);
                                                return <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-medium rounded-full ${remaining.bg} ${remaining.color}`}>{remaining.text}</span></td>;
                                            })()}
                                            {fields.date && <td className="px-4 py-3 text-slate-600">{new Date(item.created_at).toLocaleDateString('sr-RS')}</td>}
                                            {fields.fillLevel && <td className="px-4 py-3"><FillLevelBar fillLevel={item.fill_level} /></td>}
                                            {fields.note && <td className="px-4 py-3 text-slate-600 max-w-32 truncate">{item.note || '-'}</td>}
                                        </>
                                    )}
                                    {dataType === 'history' && (
                                        <>
                                            {fields.client && <td className="px-4 py-3 font-medium">{item.client_name}</td>}
                                            {fields.type && <td className="px-4 py-3">{item.waste_label}</td>}
                                            {fields.created && <td className="px-4 py-3 text-slate-600">{new Date(item.created_at).toLocaleDateString('sr-RS')}</td>}
                                            {fields.processed && <td className="px-4 py-3 text-emerald-600">{new Date(item.processed_at).toLocaleDateString('sr-RS')}</td>}
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredData.length === 0 && (
                        <div className="p-8 text-center text-slate-500">
                            <FileText size={32} className="mx-auto mb-2 text-slate-300" />
                            <p>Nema podataka za prikaz</p>
                        </div>
                    )}
                    {filteredData.length > 50 && (
                        <div className="p-3 text-center text-sm text-slate-500 bg-slate-50 border-t">
                            Prikazano prvih 50 od {filteredData.length} stavki. Sve stavke će biti uključene u štampu/export.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// History Table (Processed/Rejected Requests)
export const HistoryTable = ({ requests, wasteTypes = WASTE_TYPES, onEdit, onDelete }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [sortBy, setSortBy] = useState('processed_at');
    const [sortDir, setSortDir] = useState('desc');
    const [viewingProof, setViewingProof] = useState(null);
    const [editingRequest, setEditingRequest] = useState(null);
    const [deletingRequest, setDeletingRequest] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    if (!requests?.length) return <EmptyState icon={History} title="Nema istorije" desc="Obrađeni zahtevi će se prikazati ovde" />;

    // Filter requests
    let filtered = requests.filter(req => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesName = req.client_name?.toLowerCase().includes(query);
            const matchesType = req.waste_label?.toLowerCase().includes(query);
            if (!matchesName && !matchesType) return false;
        }
        if (filterType !== 'all' && req.waste_type !== filterType) return false;
        return true;
    });

    // Sort
    filtered = [...filtered].sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
            case 'processed_at':
                comparison = new Date(a.processed_at) - new Date(b.processed_at);
                break;
            case 'created_at':
                comparison = new Date(a.created_at) - new Date(b.created_at);
                break;
            case 'client':
                comparison = (a.client_name || '').localeCompare(b.client_name || '');
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
            setSortDir('desc');
        }
    };

    const SortIcon = ({ column }) => {
        if (sortBy !== column) return <ArrowUpDown size={14} className="text-slate-300" />;
        return sortDir === 'asc' ? <ArrowUp size={14} className="text-emerald-600" /> : <ArrowDown size={14} className="text-emerald-600" />;
    };

    const formatDateTime = (date) => {
        if (!date) return '-';
        const d = new Date(date);
        return `${d.toLocaleDateString('sr-RS')} ${d.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}`;
    };

    return (
        <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 md:max-w-xs">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                    <input
                        type="text"
                        placeholder="Pretraži..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none text-sm placeholder:text-slate-400"
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
            </div>

            {/* Results count */}
            <div className="text-sm text-slate-500">
                Prikazano {filtered.length} od {requests.length} zahteva
                {(searchQuery || filterType !== 'all') && (
                    <button onClick={() => { setSearchQuery(''); setFilterType('all'); }} className="ml-2 text-emerald-600 hover:text-emerald-700">
                        Obriši filtere
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 border-b">
                        <tr>
                            <th className="px-3 md:px-4 py-3 text-left">
                                <button onClick={() => handleSort('client')} className="flex items-center gap-1.5 hover:text-slate-700">
                                    Klijent <SortIcon column="client" />
                                </button>
                            </th>
                            <th className="px-3 md:px-4 py-3 text-left">Tip</th>
                            <th className="hidden md:table-cell px-4 py-3 text-left">
                                <button onClick={() => handleSort('created_at')} className="flex items-center gap-1.5 hover:text-slate-700">
                                    Podneto <SortIcon column="created_at" />
                                </button>
                            </th>
                            <th className="px-3 md:px-4 py-3 text-left">
                                <button onClick={() => handleSort('processed_at')} className="flex items-center gap-1.5 hover:text-slate-700">
                                    Obrađeno <SortIcon column="processed_at" />
                                </button>
                            </th>
                            <th className="hidden sm:table-cell px-4 py-3 text-center">Težina</th>
                            <th className="px-2 py-3 text-center">Dokaz</th>
                            <th className="px-2 py-3 text-center">Akcije</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Nema rezultata za ovu pretragu</td></tr>
                        ) : filtered.map((req, idx) => (
                            <tr key={req.id || idx} className="hover:bg-slate-50">
                                <td className="px-3 md:px-4 py-3">
                                    <div className="font-medium text-sm">{req.client_name}</div>
                                    <div className="text-xs text-slate-500 md:hidden mt-0.5">{formatDateTime(req.created_at)}</div>
                                </td>
                                <td className="px-3 md:px-4 py-3">
                                    <span className="text-lg">{wasteTypes.find(w => w.id === req.waste_type)?.icon || '📦'}</span>
                                    <span className="hidden sm:inline ml-1">{req.waste_label}</span>
                                </td>
                                <td className="hidden md:table-cell px-4 py-3">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Calendar size={14} />
                                        <span>{formatDateTime(req.created_at)}</span>
                                    </div>
                                </td>
                                <td className="px-3 md:px-4 py-3">
                                    <div className="flex items-center gap-2 text-emerald-600">
                                        <CheckCircle2 size={14} />
                                        <span className="text-xs md:text-sm">{formatDateTime(req.processed_at)}</span>
                                    </div>
                                </td>
                                <td className="hidden sm:table-cell px-4 py-3 text-center">
                                    {req.weight ? (
                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                                            {req.weight} {req.weight_unit || 'kg'}
                                        </span>
                                    ) : (
                                        <span className="text-slate-300 text-xs">-</span>
                                    )}
                                </td>
                                <td className="px-2 py-3 text-center">
                                    {req.proof_image_url ? (
                                        <button
                                            onClick={() => setViewingProof(req)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                                            title="Pogledaj dokaz"
                                        >
                                            <Image size={18} />
                                        </button>
                                    ) : (
                                        <span className="text-slate-300"><Image size={18} /></span>
                                    )}
                                </td>
                                <td className="px-2 py-3 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <button
                                            onClick={() => setEditingRequest(req)}
                                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"
                                            title="Dopuni podatke"
                                        >
                                            <Edit3 size={18} />
                                        </button>
                                        {onDelete && (
                                            <button
                                                onClick={() => setDeletingRequest(req)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                                title="Obriši iz istorije"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Proof Image/PDF Modal */}
            {viewingProof && (
                <Modal open={!!viewingProof} onClose={() => setViewingProof(null)} title="Dokaz o izvršenoj usluzi">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <span className="text-2xl">{wasteTypes.find(w => w.id === viewingProof.waste_type)?.icon}</span>
                            <div>
                                <p className="font-medium">{viewingProof.client_name}</p>
                                <p className="text-xs text-slate-500">{viewingProof.waste_label}</p>
                            </div>
                        </div>

                        {/* Check if PDF or Image */}
                        {viewingProof.proof_image_url?.toLowerCase().endsWith('.pdf') ? (
                            <div className="border rounded-xl overflow-hidden">
                                <iframe
                                    src={viewingProof.proof_image_url}
                                    className="w-full h-96"
                                    title="PDF Dokaz"
                                />
                            </div>
                        ) : (
                            <img
                                src={viewingProof.proof_image_url}
                                alt="Dokaz o izvršenoj usluzi"
                                className="w-full rounded-xl"
                            />
                        )}

                        {viewingProof.processing_note && (
                            <div className="p-3 bg-amber-50 rounded-xl">
                                <p className="text-xs text-amber-600 mb-1">Napomena pri obradi</p>
                                <p className="text-sm">{viewingProof.processing_note}</p>
                            </div>
                        )}

                        <p className="text-xs text-slate-500 text-center">
                            Obrađeno: {formatDateTime(viewingProof.processed_at)}
                        </p>

                        {/* Download button */}
                        <a
                            href={viewingProof.proof_image_url}
                            download={`dokaz_${viewingProof.id || Date.now()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium transition-colors"
                        >
                            <Download size={18} />
                            Preuzmi dokaz
                        </a>
                    </div>
                </Modal>
            )}

            {/* Edit Processed Request Modal */}
            {editingRequest && (
                <EditProcessedRequestModal
                    request={editingRequest}
                    wasteTypes={wasteTypes}
                    onSave={async (updates) => {
                        if (onEdit) {
                            await onEdit(editingRequest.id, updates);
                        }
                        setEditingRequest(null);
                    }}
                    onClose={() => setEditingRequest(null)}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deletingRequest && (
                <Modal open={!!deletingRequest} onClose={() => setDeletingRequest(null)} title="Obriši iz istorije">
                    <div className="space-y-4">
                        <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <p className="font-medium text-red-800">Obriši zahtev?</p>
                                    <p className="text-sm text-red-600">Ova akcija se ne može poništiti.</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl">
                            <p className="text-sm text-slate-500">Klijent</p>
                            <p className="font-medium">{deletingRequest.client_name}</p>
                            <p className="text-xs text-slate-400 mt-1">{deletingRequest.waste_label} • {formatDateTime(deletingRequest.processed_at)}</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeletingRequest(null)}
                                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium"
                            >
                                Odustani
                            </button>
                            <button
                                onClick={async () => {
                                    setIsDeleting(true);
                                    try {
                                        await onDelete(deletingRequest.id);
                                        setDeletingRequest(null);
                                    } catch (err) {
                                        alert('Greška: ' + err.message);
                                    } finally {
                                        setIsDeleting(false);
                                    }
                                }}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                Obriši
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

// Edit Processed Request Modal (for adding proof/weight later)
export const EditProcessedRequestModal = ({ request, wasteTypes = WASTE_TYPES, onSave, onClose }) => {
    const [proofFile, setProofFile] = useState(request?.proof_image_url || null);
    const [proofType, setProofType] = useState(request?.proof_image_url?.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image');
    const [weight, setWeight] = useState(request?.weight?.toString() || '');
    const [weightUnit, setWeightUnit] = useState(request?.weight_unit || 'kg');
    const [note, setNote] = useState(request?.processing_note || '');
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    if (!request) return null;

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isImage = file.type.startsWith('image/');
        const isPDF = file.type === 'application/pdf';

        if (!isImage && !isPDF) {
            alert('Molimo izaberite sliku ili PDF fajl');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert('Fajl mora biti manji od 10MB');
            return;
        }
        setUploading(true);
        try {
            const url = await uploadImage(file, 'proof_of_service', 'assets');
            setProofFile(url);
            setProofType(isPDF ? 'pdf' : 'image');
        } catch (err) {
            alert('Greška pri uploadu: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = {
                proof_image_url: proofFile,
                processing_note: note || null,
                weight: weight ? parseFloat(weight) : null,
                weight_unit: weight ? weightUnit : null
            };
            await onSave(updates);
        } catch (err) {
            alert('Greška: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = proofFile !== request?.proof_image_url ||
        note !== (request?.processing_note || '') ||
        weight !== (request?.weight?.toString() || '') ||
        weightUnit !== (request?.weight_unit || 'kg');

    return (
        <Modal open={!!request} onClose={onClose} title="Dopuni podatke o obradi">
            <div className="space-y-4">
                {/* Request summary */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <span className="text-4xl">{wasteTypes.find(w => w.id === request.waste_type)?.icon}</span>
                    <div className="flex-1">
                        <h3 className="font-bold text-lg">{request.waste_label}</h3>
                        <p className="text-sm text-slate-500">{request.client_name}</p>
                    </div>
                </div>

                {/* Weight input */}
                <div className="p-4 bg-blue-50 rounded-xl">
                    <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                        <Scale size={18} className="text-blue-600" />
                        Količina otpada
                    </p>
                    <div className="flex gap-3">
                        <input
                            type="number"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            placeholder="Unesite količinu"
                            min="0"
                            step="0.01"
                            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm bg-white"
                        />
                        <select
                            value={weightUnit}
                            onChange={(e) => setWeightUnit(e.target.value)}
                            className="px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm bg-white font-medium"
                        >
                            <option value="kg">kg</option>
                            <option value="t">tona</option>
                        </select>
                    </div>
                </div>

                {/* Proof of Service photo/PDF */}
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                        <Image size={18} className="text-emerald-600" />
                        Dokaz o izvršenoj usluzi
                    </p>

                    {proofFile ? (
                        <div className="relative">
                            {proofType === 'pdf' ? (
                                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                                    <FileText size={32} className="text-blue-600" />
                                    <div className="flex-1">
                                        <p className="font-medium text-blue-900">PDF dokument</p>
                                        <p className="text-xs text-blue-600">Uploadovan</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setProofFile(null); setProofType(null); }}
                                        className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative inline-block">
                                    <img src={proofFile} alt="Dokaz" className="w-full max-w-xs h-48 object-cover rounded-xl" />
                                    <button
                                        type="button"
                                        onClick={() => { setProofFile(null); setProofType(null); }}
                                        className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <label className="cursor-pointer block">
                            <div className="w-full h-32 bg-slate-100 rounded-xl flex flex-col items-center justify-center hover:bg-slate-200 transition-colors border border-slate-200">
                                {uploading ? (
                                    <Loader2 size={32} className="text-emerald-500 animate-spin" />
                                ) : (
                                    <>
                                        <Upload size={32} className="text-slate-400 mb-2" />
                                        <span className="text-sm text-slate-500">Kliknite za upload slike ili PDF</span>
                                    </>
                                )}
                            </div>
                            <input type="file" accept="image/*,application/pdf" capture="environment" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                        </label>
                    )}
                </div>

                {/* Optional note */}
                <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Napomena</label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Dodatne informacije o obradi..."
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm resize-none"
                        rows={2}
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium disabled:opacity-50"
                    >
                        Otkaži
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || uploading || !hasChanges}
                        className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <><Loader2 size={18} className="animate-spin" /> Čuvanje...</>
                        ) : (
                            <><CheckCircle2 size={18} /> Sačuvaj</>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// Clients Table
export const ClientsTable = ({ clients, onView, onDelete, onEditLocation, onEditEquipment, equipment = [] }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('name'); // name, phone, pib
    const [sortDir, setSortDir] = useState('asc');

    // Filter equipment to only include items that still exist
    const getClientEquipment = (client) => {
        if (!client.equipment_types || client.equipment_types.length === 0) return [];
        // Filter out equipment IDs that no longer exist
        const existingEquipmentIds = new Set(equipment.map(eq => eq.id));
        return client.equipment_types.filter(eqId => existingEquipmentIds.has(eqId));
    };

    const getClientEquipmentCount = (client) => {
        return getClientEquipment(client).length;
    };

    // Filter and sort clients
    const filteredClients = useMemo(() => {
        let result = clients || [];

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(c =>
                c.name?.toLowerCase().includes(query) ||
                c.phone?.includes(query) ||
                c.pib?.includes(query)
            );
        }

        // Sort
        result = [...result].sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = (a.name || '').localeCompare(b.name || '');
                    break;
                case 'phone':
                    comparison = (a.phone || '').localeCompare(b.phone || '');
                    break;
                case 'pib':
                    comparison = (a.pib || '').localeCompare(b.pib || '');
                    break;
                default:
                    comparison = 0;
            }
            return sortDir === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [clients, searchQuery, sortBy, sortDir]);

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

    if (!clients?.length) return <EmptyState icon={Users} title="Nema klijenata" desc="Klijenti će se prikazati ovde" />;

    return (
        <div className="space-y-4">
            {/* Search and Filter */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[250px]">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                    <input
                        type="text"
                        placeholder="Pretraži po imenu, telefonu ili PIB-u..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none text-sm placeholder:text-slate-400"
                    />
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>Sortiraj:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
                    >
                        <option value="name">Po imenu</option>
                        <option value="phone">Po telefonu</option>
                        <option value="pib">Po PIB-u</option>
                    </select>
                    <button
                        onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
                        className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                        title={sortDir === 'asc' ? 'Rastuće' : 'Opadajuće'}
                    >
                        {sortDir === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                    </button>
                </div>
            </div>

            {/* Results count */}
            <div className="text-sm text-slate-500">
                Prikazano {filteredClients.length} od {clients.length} klijenata
                {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="ml-2 text-emerald-600 hover:text-emerald-700">
                        Obriši pretragu
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 border-b">
                        <tr>
                            <th className="px-3 md:px-4 py-3 text-left">
                                <button onClick={() => handleSort('name')} className="flex items-center gap-1.5 hover:text-slate-700">
                                    Klijent <SortIcon column="name" />
                                </button>
                            </th>
                            <th className="hidden sm:table-cell px-4 py-3 text-left">
                                <button onClick={() => handleSort('phone')} className="flex items-center gap-1.5 hover:text-slate-700">
                                    Telefon <SortIcon column="phone" />
                                </button>
                            </th>
                            <th className="hidden lg:table-cell px-4 py-3 text-left">
                                <button onClick={() => handleSort('pib')} className="flex items-center gap-1.5 hover:text-slate-700">
                                    PIB <SortIcon column="pib" />
                                </button>
                            </th>
                            <th className="hidden md:table-cell px-4 py-3 text-left">Oprema</th>
                            <th className="px-3 md:px-4 py-3 text-left">Lokacija</th>
                            <th className="px-2 md:px-4 py-3 text-right">Akcije</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredClients.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                                    Nema rezultata za "{searchQuery}"
                                </td>
                            </tr>
                        ) : filteredClients.map(c => {
                            const clientEquipment = getClientEquipment(c);
                            return (
                                <tr key={c.id} className="hover:bg-slate-50">
                                    <td className="px-3 md:px-4 py-3">
                                        <button onClick={() => onView(c)} className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left">{c.name}</button>
                                        <div className="sm:hidden text-xs text-slate-500 mt-0.5">{c.phone}</div>
                                        {/* Show PIB on mobile if exists */}
                                        {c.pib && <div className="lg:hidden text-xs text-blue-600 mt-0.5">PIB: {c.pib}</div>}
                                        {/* Show equipment on mobile */}
                                        <div className="md:hidden text-xs text-slate-500 mt-0.5">
                                            {clientEquipment.length > 0 ? (
                                                <span className="text-emerald-600">{clientEquipment.length} oprema</span>
                                            ) : (
                                                <span className="text-slate-400">Bez opreme</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="hidden sm:table-cell px-4 py-3 text-slate-600">{c.phone}</td>
                                    <td className="hidden lg:table-cell px-4 py-3">
                                        {c.pib ? (
                                            <code className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-mono">{c.pib}</code>
                                        ) : (
                                            <span className="text-slate-400 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="hidden md:table-cell px-4 py-3">
                                        <button
                                            onClick={() => onEditEquipment(c)}
                                            className={`text-xs px-2 py-1 rounded-full flex items-center gap-1.5 ${clientEquipment.length > 0
                                                ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                                                : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                                                }`}
                                        >
                                            <Box size={12} />
                                            <span>{clientEquipment.length > 0 ? `${clientEquipment.length} dodeljeno` : 'Dodeli'}</span>
                                        </button>
                                    </td>
                                    <td className="px-3 md:px-4 py-3">
                                        <button
                                            onClick={() => onEditLocation(c)}
                                            className={`text-xs px-2 py-1 rounded-full flex items-center gap-1.5 ${c.latitude && c.longitude
                                                ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                                                : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                                                }`}
                                        >
                                            <MapPin size={12} />
                                            <span className="hidden sm:inline">{c.latitude && c.longitude ? 'Podešena' : 'Podesi'}</span>
                                            <span className="sm:hidden">{c.latitude && c.longitude ? 'OK' : 'Podesi'}</span>
                                        </button>
                                    </td>
                                    <td className="px-2 md:px-4 py-3 text-right whitespace-nowrap">
                                        <button onClick={() => onEditEquipment(c)} className="md:hidden p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg" title="Oprema">
                                            <Box size={18} />
                                        </button>
                                        <button onClick={() => onView(c)} className="p-1.5 md:p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Detalji">
                                            <Eye size={18} />
                                        </button>
                                        <button onClick={() => onDelete(c.id)} className="p-1.5 md:p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Obriši">
                                            <Trash2 size={18} />
                                        </button>
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

// Equipment Management
export const EquipmentManagement = ({ equipment, onAdd, onAssign, onDelete, onEdit, clients }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newEquipment, setNewEquipment] = useState({ name: '', description: '', customImage: null });
    const [editingEquipment, setEditingEquipment] = useState(null);
    const [assigningEquipment, setAssigningEquipment] = useState(null);

    const handleAdd = () => {
        if (newEquipment.name) {
            onAdd(newEquipment);
            setNewEquipment({ name: '', description: '', customImage: null });
            setShowAddForm(false);
        }
    };

    const handleEdit = () => {
        if (editingEquipment && editingEquipment.name) {
            onEdit(editingEquipment);
            setEditingEquipment(null);
        }
    };

    const startEdit = (eq) => {
        setEditingEquipment({ ...eq });
        setShowAddForm(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">Oprema</h2>
                <button onClick={() => { setShowAddForm(true); setEditingEquipment(null); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-sm">
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
                                bucket="assets"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleAdd} disabled={!newEquipment.name} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-medium">Sačuvaj</button>
                        <button onClick={() => { setShowAddForm(false); setNewEquipment({ name: '', description: '', customImage: null }); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-medium">Otkaži</button>
                    </div>
                </div>
            )}

            {/* Edit Form */}
            {editingEquipment && (
                <div className="bg-white rounded-2xl border p-6 space-y-4 border-blue-200">
                    <h3 className="font-semibold text-blue-700">Izmeni opremu</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Naziv opreme</label>
                                <input
                                    type="text"
                                    value={editingEquipment.name}
                                    onChange={(e) => setEditingEquipment({ ...editingEquipment, name: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Opis (opciono)</label>
                                <textarea
                                    value={editingEquipment.description || ''}
                                    onChange={(e) => setEditingEquipment({ ...editingEquipment, description: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                    rows={2}
                                />
                            </div>
                        </div>
                        <div>
                            <ImageUploader
                                currentImage={editingEquipment.customImage}
                                onUpload={(url) => setEditingEquipment({ ...editingEquipment, customImage: url })}
                                onRemove={() => setEditingEquipment({ ...editingEquipment, customImage: null })}
                                label="Slika opreme (opciono)"
                                bucket="assets"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium">Sačuvaj izmene</button>
                        <button onClick={() => setEditingEquipment(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-medium">Otkaži</button>
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
                                <button onClick={() => startEdit(eq)} className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Izmeni">
                                    <Edit3 size={18} />
                                </button>
                                <button onClick={() => onDelete(eq.id)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg" title="Obriši">
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
export const WasteTypesManagement = ({ wasteTypes, onAdd, onDelete, onEdit }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingType, setEditingType] = useState(null);
    const [newType, setNewType] = useState({ label: '', icon: '📦', customImage: null });

    const iconOptions = ['📦', '♻️', '🍾', '🗑️', '🛢️', '📄', '🔋', '💡', '🧴', '🥫', '🪵', '🧱'];

    const handleAdd = () => {
        if (newType.label) {
            onAdd({ ...newType, id: newType.label.toLowerCase().replace(/\s/g, '_') });
            setNewType({ label: '', icon: '📦', customImage: null });
            setShowAddForm(false);
        }
    };

    const handleEdit = () => {
        if (editingType && editingType.label) {
            onEdit(editingType);
            setEditingType(null);
        }
    };

    const startEdit = (wt) => {
        setEditingType({ ...wt });
        setShowAddForm(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold">Vrste robe (otpada)</h2>
                    <p className="text-sm text-slate-500">Upravljajte vrstama otpada koje vaši klijenti mogu da prijavljuju</p>
                </div>
                <button onClick={() => { setShowAddForm(true); setEditingType(null); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-sm">
                    <Plus size={18} /> Dodaj vrstu
                </button>
            </div>

            {/* Add Form */}
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
                                bucket="assets"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-medium">Sačuvaj</button>
                        <button onClick={() => { setShowAddForm(false); setNewType({ label: '', icon: '📦', customImage: null }); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-medium">Otkaži</button>
                    </div>
                </div>
            )}

            {/* Edit Form */}
            {editingType && (
                <div className="bg-white rounded-2xl border p-6 space-y-4 border-blue-200">
                    <h3 className="font-semibold text-blue-700">Izmeni vrstu robe</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Naziv</label>
                                <input
                                    type="text"
                                    value={editingType.label}
                                    onChange={(e) => setEditingType({ ...editingType, label: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Ikonica</label>
                                <div className="flex flex-wrap gap-2">
                                    {iconOptions.map(icon => (
                                        <button
                                            key={icon}
                                            onClick={() => setEditingType({ ...editingType, icon, customImage: null })}
                                            className={`w-12 h-12 text-2xl rounded-xl border-2 transition-all ${!editingType.customImage && editingType.icon === icon ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                                        >
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div>
                            <ImageUploader
                                currentImage={editingType.customImage}
                                onUpload={(url) => setEditingType({ ...editingType, customImage: url })}
                                onRemove={() => setEditingType({ ...editingType, customImage: null })}
                                label="Koristi svoju sliku"
                                bucket="assets"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium">Sačuvaj izmene</button>
                        <button onClick={() => setEditingType(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-medium">Otkaži</button>
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
                                <tr key={wt.id} className={`hover:bg-slate-50 ${editingType?.id === wt.id ? 'bg-blue-50' : ''}`}>
                                    <td className="px-6 py-4">
                                        {wt.customImage ? (
                                            <img src={wt.customImage} alt={wt.label} className="w-12 h-12 object-cover rounded-xl" />
                                        ) : (
                                            <span className="text-3xl">{wt.icon}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-medium">{wt.label}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => startEdit(wt)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Izmeni">
                                            <Edit3 size={18} />
                                        </button>
                                        <button onClick={() => onDelete(wt.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Obriši">
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
export const getStablePosition = (id, baseLatitude = 44.8, baseLongitude = 20.45) => {
    // Create a simple hash from the id string
    let hash = 0;
    const str = String(id);
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // Use hash to generate stable offsets - smaller spread (0.1 degrees ~ 10km) so markers stay visible
    const latOffset = ((Math.abs(hash) % 1000) / 1000 - 0.5) * 0.1;
    const lngOffset = ((Math.abs(hash >> 10) % 1000) / 1000 - 0.5) * 0.1;
    return [baseLatitude + latOffset, baseLongitude + lngOffset];
};

// Draggable Marker component
export const DraggableMarker = ({ position, onPositionChange }) => {
    const [markerPosition, setMarkerPosition] = useState(position);
    const markerRef = useRef(null);

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

    const markerIcon = useMemo(() => createIcon('red'), []);

    return (
        <Marker
            position={markerPosition}
            draggable={true}
            eventHandlers={eventHandlers}
            icon={markerIcon}
            ref={markerRef}
        >
            <Popup>Prevuci marker na željenu lokaciju</Popup>
        </Marker>
    );
};

// Location Picker component for setting client position
export const LocationPicker = ({ initialPosition, onSave, onCancel, clientName }) => {
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
// Component to auto-fit map bounds to markers - only on initial load or when marker count changes
export const FitBounds = ({ positions }) => {
    const map = useMap();
    const initialFitDone = useRef(false);

    useEffect(() => {
        // Only fit bounds once on initial load when we have positions
        if (!initialFitDone.current && positions && positions.length > 0) {
            setTimeout(() => {
                const bounds = L.latLngBounds(positions);
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
                initialFitDone.current = true;
            }, 100);
        }
    }, [map, positions]);

    return null;
};

export const MapView = ({ requests, clients, type, onClientLocationEdit, wasteTypes = WASTE_TYPES }) => {
    const [urgencyFilter, setUrgencyFilter] = useState('all'); // all, 24h, 48h, 72h
    const items = type === 'requests' ? requests : clients;

    // Helper to get waste type icon from wasteTypes array
    const getWasteIcon = (wasteTypeId) => {
        const wt = wasteTypes.find(w => w.id === wasteTypeId);
        return wt?.icon || '📦';
    };

    // Add current urgency to each request based on remaining time
    const itemsWithCurrentUrgency = useMemo(() => {
        if (type !== 'requests') return items || [];
        return (items || []).map(item => ({
            ...item,
            currentUrgency: getCurrentUrgency(item.created_at, item.urgency)
        }));
    }, [items, type]);

    // Filter items by CURRENT urgency (not original)
    const filteredItems = useMemo(() => {
        if (type !== 'requests') return items || [];
        if (urgencyFilter === 'all') return itemsWithCurrentUrgency;
        return itemsWithCurrentUrgency.filter(item => item.currentUrgency === urgencyFilter);
    }, [itemsWithCurrentUrgency, items, type, urgencyFilter]);

    // Calculate positions for all items
    const markers = useMemo(() => {
        // First, separate items with and without coordinates
        const withCoords = [];
        const withoutCoords = [];

        filteredItems.forEach((item, index) => {
            const lat = item.latitude ? parseFloat(item.latitude) : null;
            const lng = item.longitude ? parseFloat(item.longitude) : null;
            const hasValidCoords = lat && lng && !isNaN(lat) && !isNaN(lng);

            if (hasValidCoords) {
                withCoords.push({ item, position: [lat, lng], index, hasCoords: true });
            } else {
                withoutCoords.push({ item, index, hasCoords: false });
            }
        });

        // Calculate center for items without coords (use center of items with coords, or default)
        let centerLat = 44.0;  // Serbia center
        let centerLng = 20.9;
        if (withCoords.length > 0) {
            centerLat = withCoords.reduce((sum, m) => sum + m.position[0], 0) / withCoords.length;
            centerLng = withCoords.reduce((sum, m) => sum + m.position[1], 0) / withCoords.length;
        }

        // Distribute items without coords in a circle around the center
        const radius = 0.05; // ~5km radius
        withoutCoords.forEach((item, i) => {
            const angle = (2 * Math.PI * i) / Math.max(withoutCoords.length, 1);
            const lat = centerLat + radius * Math.cos(angle);
            const lng = centerLng + radius * Math.sin(angle);
            item.position = [lat, lng];
        });

        return [...withCoords, ...withoutCoords];
    }, [filteredItems]);

    // Extract all positions for bounds fitting
    const allPositions = useMemo(() => markers.map(m => m.position), [markers]);

    // Count by CURRENT urgency (not original)
    const urgencyCounts = useMemo(() => {
        if (type !== 'requests') return {};
        return itemsWithCurrentUrgency.reduce((acc, item) => {
            acc[item.currentUrgency] = (acc[item.currentUrgency] || 0) + 1;
            return acc;
        }, {});
    }, [itemsWithCurrentUrgency, type]);

    return (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ height: '500px' }}>
            {/* Urgency Filter - Only show for requests */}
            {type === 'requests' && (
                <div className="flex items-center gap-2 p-3 bg-slate-50 border-b">
                    <span className="text-sm text-slate-500 mr-2">Filter:</span>
                    <button
                        onClick={() => setUrgencyFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${urgencyFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    >
                        Svi ({itemsWithCurrentUrgency?.length || 0})
                    </button>
                    <button
                        onClick={() => setUrgencyFilter('24h')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${urgencyFilter === '24h' ? 'bg-red-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-200'}`}
                    >
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        Hitno ({urgencyCounts['24h'] || 0})
                    </button>
                    <button
                        onClick={() => setUrgencyFilter('48h')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${urgencyFilter === '48h' ? 'bg-amber-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-amber-50 hover:border-amber-200'}`}
                    >
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        Srednje ({urgencyCounts['48h'] || 0})
                    </button>
                    <button
                        onClick={() => setUrgencyFilter('72h')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${urgencyFilter === '72h' ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-200'}`}
                    >
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Normalno ({urgencyCounts['72h'] || 0})
                    </button>
                </div>
            )}
            <MapContainer center={[44.8, 20.45]} zoom={11} style={{ height: type === 'requests' ? 'calc(100% - 52px)' : '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <FitBounds positions={allPositions} />
                <MarkerClusterGroup
                    chunkedLoading
                    maxClusterRadius={50}
                    spiderfyOnMaxZoom={true}
                    showCoverageOnHover={false}
                    iconCreateFunction={(cluster) => {
                        const count = cluster.getChildCount();
                        const childMarkers = cluster.getAllChildMarkers();
                        // Check if any child is urgent (24h)
                        const hasUrgent = childMarkers.some(m => m.options.urgencyLevel === '24h');
                        const hasMedium = childMarkers.some(m => m.options.urgencyLevel === '48h');
                        const color = hasUrgent ? '#EF4444' : hasMedium ? '#F59E0B' : '#10B981';
                        return L.divIcon({
                            html: `<div style="background-color: ${color}; color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${count}</div>`,
                            className: 'custom-cluster-icon',
                            iconSize: L.point(40, 40, true),
                        });
                    }}
                >
                    {markers.map(({ item, position, index, hasCoords }) => (
                        <Marker
                            key={item.id || `marker-${index}`}
                            position={position}
                            icon={createCustomIcon(item.currentUrgency || item.urgency, type === 'requests' ? getWasteIcon(item.waste_type) : '🏢', type === 'clients')}
                            opacity={hasCoords ? 1 : 0.7}
                            urgencyLevel={item.currentUrgency || item.urgency}
                        >
                            <Popup>
                                <p className="font-bold">{type === 'requests' ? item.client_name : item.name}</p>
                                <p className="text-sm">{type === 'requests' ? item.waste_label : item.phone}</p>
                                <p className="text-xs text-gray-500">{type === 'requests' ? item.client_address : item.address}</p>
                                {type === 'requests' && item.currentUrgency && (
                                    <p className={`text-xs font-semibold mt-1 ${item.currentUrgency === '24h' ? 'text-red-600' : item.currentUrgency === '48h' ? 'text-amber-600' : 'text-emerald-600'}`}>
                                        ⏱ {item.currentUrgency === '24h' ? 'Hitno' : item.currentUrgency === '48h' ? 'Srednje' : 'Normalno'}
                                    </p>
                                )}
                                {!hasCoords && <p className="text-xs text-orange-500 mt-1">⚠️ Lokacija nije podešena</p>}
                                {hasCoords && type === 'requests' && (
                                    <div className="flex gap-1 mt-2">
                                        <a
                                            href={`https://www.google.com/maps/dir/?api=1&destination=${position[0]},${position[1]}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                        >
                                            Google Maps
                                        </a>
                                        <a
                                            href={`https://waze.com/ul?ll=${position[0]},${position[1]}&navigate=yes`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-2 py-1 bg-cyan-600 text-white text-xs rounded hover:bg-cyan-700"
                                        >
                                            Waze
                                        </a>
                                    </div>
                                )}
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
                </MarkerClusterGroup>
            </MapContainer>
        </div>
    );
};

// Request Details Modal
export const RequestDetailsModal = ({ request, onClose }) => {
    if (!request) return null;
    const rem = getRemainingTime(request.created_at, request.urgency);
    return (
        <Modal open={!!request} onClose={onClose} title="Detalji zahteva">
            <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <span className="text-4xl">{WASTE_TYPES.find(w => w.id === request.waste_type)?.icon}</span>
                    <div>
                        <h3 className="font-bold text-lg">{request.waste_label}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-slate-500">Popunjenost:</span>
                            <FillLevelBar fillLevel={request.fill_level} />
                        </div>
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

// Process Request Modal with Proof of Service photo/PDF upload
export const ProcessRequestModal = ({ request, onProcess, onClose }) => {
    const [proofFile, setProofFile] = useState(null);
    const [proofType, setProofType] = useState(null); // 'image' or 'pdf'
    const [uploading, setUploading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [note, setNote] = useState('');
    const [weight, setWeight] = useState('');
    const [weightUnit, setWeightUnit] = useState('kg'); // 'kg' or 't'

    if (!request) return null;
    const rem = getRemainingTime(request.created_at, request.urgency);

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isImage = file.type.startsWith('image/');
        const isPDF = file.type === 'application/pdf';

        if (!isImage && !isPDF) {
            alert('Molimo izaberite sliku ili PDF fajl');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert('Fajl mora biti manji od 10MB');
            return;
        }
        setUploading(true);
        try {
            const url = await uploadImage(file, 'proof_of_service', 'assets');
            setProofFile(url);
            setProofType(isPDF ? 'pdf' : 'image');
        } catch (err) {
            alert('Greška pri uploadu: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleProcess = async () => {
        setProcessing(true);
        try {
            const weightData = weight ? { weight: parseFloat(weight), weight_unit: weightUnit } : null;
            console.log('ProcessRequestModal - weight:', weight, 'weightUnit:', weightUnit, 'weightData:', weightData);
            await onProcess(request, proofFile, note, weightData);
            onClose();
        } catch (err) {
            alert('Greška: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Modal open={!!request} onClose={onClose} title="Obrada zahteva">
            <div className="space-y-4">
                {/* Request summary */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <span className="text-4xl">{WASTE_TYPES.find(w => w.id === request.waste_type)?.icon}</span>
                    <div className="flex-1">
                        <h3 className="font-bold text-lg">{request.waste_label}</h3>
                        <p className="text-sm text-slate-500">{request.client_name}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${rem.bg} ${rem.color}`}>{rem.text}</span>
                </div>

                {/* Address */}
                <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={14} /> Adresa</p>
                    <p className="font-medium">{request.client_address || 'Nije uneta'}</p>
                </div>

                {/* Weight input */}
                <div className="p-4 bg-blue-50 rounded-xl">
                    <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                        <Scale size={18} className="text-blue-600" />
                        Količina otpada (opciono)
                    </p>
                    <div className="flex gap-3">
                        <input
                            type="number"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            placeholder="Unesite količinu"
                            min="0"
                            step="0.01"
                            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
                        />
                        <select
                            value={weightUnit}
                            onChange={(e) => setWeightUnit(e.target.value)}
                            className="px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm bg-white font-medium"
                        >
                            <option value="kg">kg</option>
                            <option value="t">tona</option>
                        </select>
                    </div>
                </div>

                {/* Proof of Service photo/PDF */}
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                        <Image size={18} className="text-emerald-600" />
                        Dokaz o izvršenoj usluzi (opciono)
                    </p>
                    <p className="text-xs text-slate-500 mb-3">Uploadujte sliku ili PDF dokument kao dokaz</p>

                    {proofFile ? (
                        <div className="relative">
                            {proofType === 'pdf' ? (
                                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                                    <FileText size={32} className="text-blue-600" />
                                    <div className="flex-1">
                                        <p className="font-medium text-blue-900">PDF dokument</p>
                                        <p className="text-xs text-blue-600">Uploadovan uspešno</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setProofFile(null); setProofType(null); }}
                                        className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative inline-block">
                                    <img src={proofFile} alt="Dokaz" className="w-full max-w-xs h-48 object-cover rounded-xl" />
                                    <button
                                        type="button"
                                        onClick={() => { setProofFile(null); setProofType(null); }}
                                        className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <label className="cursor-pointer block">
                            <div className="w-full h-32 bg-slate-100 rounded-xl flex flex-col items-center justify-center hover:bg-slate-200 transition-colors border border-slate-200">
                                {uploading ? (
                                    <Loader2 size={32} className="text-emerald-500 animate-spin" />
                                ) : (
                                    <>
                                        <Upload size={32} className="text-slate-400 mb-2" />
                                        <span className="text-sm text-slate-500">Kliknite za upload slike ili PDF</span>
                                    </>
                                )}
                            </div>
                            <input type="file" accept="image/*,application/pdf" capture="environment" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                        </label>
                    )}
                </div>

                {/* Optional note */}
                <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Napomena (opciono)</label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Dodatne informacije o obradi..."
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm resize-none"
                        rows={2}
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        disabled={processing}
                        className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium disabled:opacity-50"
                    >
                        Otkaži
                    </button>
                    <button
                        onClick={handleProcess}
                        disabled={processing || uploading}
                        className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {processing ? (
                            <><Loader2 size={18} className="animate-spin" /> Obrada...</>
                        ) : (
                            <><CheckCircle2 size={18} /> Označi kao obrađeno</>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// Client Details Modal
export const ClientDetailsModal = ({ client, equipment, onClose }) => {
    if (!client) return null;

    // Get equipment names from IDs
    const getEquipmentNames = () => {
        if (!client.equipment_types || client.equipment_types.length === 0 || !equipment || equipment.length === 0) {
            return [];
        }
        return client.equipment_types
            .map(eqId => equipment.find(e => e.id === eqId))
            .filter(Boolean)
            .map(e => e.name);
    };

    const equipmentNames = getEquipmentNames();

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
                {client.pib && (
                    <div className="p-4 bg-blue-50 rounded-xl">
                        <p className="text-xs text-blue-600">PIB broj</p>
                        <p className="font-medium text-blue-700">{client.pib}</p>
                    </div>
                )}
                {client.manager_note && (
                    <div className="p-4 bg-amber-50 rounded-xl">
                        <p className="text-xs text-amber-600">Napomena menadžera</p>
                        <p className="font-medium">{client.manager_note}</p>
                    </div>
                )}
                {equipmentNames.length > 0 && (
                    <div className="p-4 bg-emerald-50 rounded-xl">
                        <p className="text-xs text-emerald-600 mb-2">Dodeljena oprema</p>
                        <div className="flex flex-wrap gap-2">
                            {equipmentNames.map((name, idx) => (
                                <span key={idx} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium flex items-center gap-1.5">
                                    <Box size={14} />
                                    {name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

// Client Equipment Assignment Modal
export const ClientEquipmentModal = ({ client, equipment, onSave, onClose }) => {
    const [selectedEquipment, setSelectedEquipment] = useState(client?.equipment_types || []);
    const [note, setNote] = useState(client?.manager_note || '');
    const [pib, setPib] = useState(client?.pib || '');
    const [saving, setSaving] = useState(false);

    if (!client) return null;

    const toggleEquipment = (eqId) => {
        setSelectedEquipment(prev =>
            prev.includes(eqId)
                ? prev.filter(id => id !== eqId)
                : [...prev, eqId]
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(client.id, selectedEquipment, note, pib);
            onClose();
        } catch (err) {
            alert('Greška pri čuvanju: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open={!!client} onClose={onClose} title="Podešavanja klijenta">
            <div className="space-y-4">
                {/* Client Info */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold">{client.name?.charAt(0)}</div>
                    <div>
                        <h4 className="font-medium">{client.name}</h4>
                        <p className="text-xs text-slate-500">{client.phone}</p>
                    </div>
                </div>

                {/* Equipment Selection */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Izaberi opremu</label>
                    {equipment.length === 0 ? (
                        <p className="text-sm text-slate-500 p-4 bg-slate-50 rounded-xl text-center">
                            Nema definisane opreme. Dodajte opremu u sekciji "Oprema".
                        </p>
                    ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {equipment.map(eq => (
                                <label
                                    key={eq.id}
                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedEquipment.includes(eq.id)
                                        ? 'border-emerald-500 bg-emerald-50'
                                        : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedEquipment.includes(eq.id)}
                                        onChange={() => toggleEquipment(eq.id)}
                                        className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                                    />
                                    <div className="flex items-center gap-3 flex-1">
                                        {eq.customImage ? (
                                            <img src={eq.customImage} alt={eq.name} className="w-10 h-10 rounded-lg object-cover" />
                                        ) : (
                                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                                                <Box size={20} className="text-slate-400" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-medium text-sm">{eq.name}</p>
                                            {eq.description && <p className="text-xs text-slate-500">{eq.description}</p>}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* PIB */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">PIB broj (opciono)</label>
                    <input
                        type="text"
                        value={pib}
                        onChange={(e) => setPib(e.target.value.replace(/\D/g, '').slice(0, 9))}
                        placeholder="123456789"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm"
                        maxLength={9}
                    />
                    <p className="mt-1 text-xs text-slate-500">Poreski identifikacioni broj klijenta</p>
                </div>

                {/* Note for client */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Napomena za klijenta (opciono)</label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Unesite napomenu..."
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm resize-none"
                        rows={3}
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium"
                    >
                        Otkaži
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                        Sačuvaj
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// Admin Tables
export const AdminCompaniesTable = ({ companies, onEdit }) => {
    if (!companies?.length) return <EmptyState icon={Building2} title="Nema firmi" desc="Firme će se prikazati ovde" />;
    return (
        <div className="bg-white rounded-2xl border overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-slate-50 text-slate-500 border-b">
                    <tr>
                        <th className="px-3 md:px-6 py-3 md:py-4 text-left whitespace-nowrap">Firma</th>
                        <th className="px-3 md:px-6 py-3 md:py-4 text-left whitespace-nowrap">ECO Kod</th>
                        <th className="px-3 md:px-6 py-3 md:py-4 text-left whitespace-nowrap">Status</th>
                        <th className="px-3 md:px-6 py-3 md:py-4 text-center whitespace-nowrap">Menadžeri</th>
                        <th className="px-3 md:px-6 py-3 md:py-4 text-center whitespace-nowrap">Klijenti</th>
                        <th className="px-3 md:px-6 py-3 md:py-4 text-right sticky right-0 bg-slate-50">Akcije</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {companies.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50">
                            <td className="px-3 md:px-6 py-3 md:py-4 font-medium whitespace-nowrap">{c.name}</td>
                            <td className="px-3 md:px-6 py-3 md:py-4"><code className="px-2 py-1 bg-slate-100 rounded text-xs">{c.code}</code></td>
                            <td className="px-3 md:px-6 py-3 md:py-4">
                                {c.status === 'frozen' ? (
                                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1 w-fit whitespace-nowrap"><Lock size={12} /> Zamrznuta</span>
                                ) : (
                                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium whitespace-nowrap">Aktivna</span>
                                )}
                            </td>
                            <td className="px-3 md:px-6 py-3 md:py-4 text-center">{c.managerCount || 0}</td>
                            <td className="px-3 md:px-6 py-3 md:py-4 text-center">{c.clientCount || 0}</td>
                            <td className="px-3 md:px-6 py-3 md:py-4 text-right sticky right-0 bg-white">
                                <button onClick={() => onEdit(c)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600" title="Izmeni firmu">
                                    <Edit3 size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export const AdminUsersTable = ({ users, onDelete, isDeveloper, onImpersonate, onChangeRole, onRefresh, onEditUser, isAdmin }) => {
    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'role', direction: 'asc' });
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    const [deleteModal, setDeleteModal] = useState(null);
    const [detailsModal, setDetailsModal] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [changingRole, setChangingRole] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const getRoleConfig = (role) => {
        switch (role) {
            case 'developer':
                return { label: 'Developer', className: 'bg-purple-100 text-purple-700', priority: 1 };
            case 'admin':
                return { label: 'Admin', className: 'bg-blue-100 text-blue-700', priority: 2 };
            case 'manager':
                return { label: 'Menadžer', className: 'bg-emerald-100 text-emerald-700', priority: 3 };
            case 'driver':
                return { label: 'Vozač', className: 'bg-amber-100 text-amber-700', priority: 4 };
            default:
                return { label: 'Klijent', className: 'bg-slate-100 text-slate-700', priority: 5 };
        }
    };

    // Filter & Sort
    const filteredUsers = useMemo(() => {
        let result = [...(users || [])];
        if (searchQuery) {
            const low = searchQuery.toLowerCase();
            result = result.filter(u =>
                u.name?.toLowerCase().includes(low) ||
                u.phone?.includes(low) ||
                u.company?.name?.toLowerCase().includes(low) ||
                (getRoleConfig(u.role).label.toLowerCase().includes(low))
            );
        }
        if (sortConfig.key) {
            result.sort((a, b) => {
                let aVal = a[sortConfig.key] || '';
                let bVal = b[sortConfig.key] || '';

                if (sortConfig.key === 'company') { aVal = a.company?.name || ''; bVal = b.company?.name || ''; }
                if (sortConfig.key === 'role') {
                    aVal = getRoleConfig(a.role).priority;
                    bVal = getRoleConfig(b.role).priority;
                }

                if (typeof aVal === 'string') aVal = aVal.toLowerCase();
                if (typeof bVal === 'string') bVal = bVal.toLowerCase();

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [users, searchQuery, sortConfig]);

    // Pagination
    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredUsers, currentPage]);

    // Reset page when search changes
    useEffect(() => { setCurrentPage(1); }, [searchQuery]);

    const handleSort = (key) => {
        setSortConfig(curr => ({ key, direction: curr.key === key && curr.direction === 'asc' ? 'desc' : 'asc' }));
    };

    const toggleSelect = (id, e) => {
        e.stopPropagation();
        const newSet = new Set(selectedUsers);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setSelectedUsers(newSet);
    };

    const toggleSelectAll = () => {
        // Filter out protected roles from selection
        const selectableUsers = filteredUsers.filter(u => u.role !== 'developer');
        if (selectedUsers.size === selectableUsers.length) setSelectedUsers(new Set());
        else setSelectedUsers(new Set(selectableUsers.map(u => u.id)));
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            if (deleteModal.type === 'bulk') {
                for (const id of deleteModal.ids) {
                    await onDelete(id);
                }
            } else {
                await onDelete(deleteModal.ids[0]);
            }
            setSelectedUsers(new Set());
            setDeleteModal(null);
        } catch (error) {
            console.error(error);
            alert('Greška pri brisanju korisnika');
        } finally {
            setIsDeleting(false);
        }
    };

    const isProtected = (role) => role === 'developer';

    if (!users?.length && !searchQuery) return <EmptyState icon={Users} title="Nema korisnika" desc="Korisnici će se prikazati ovde" />;

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Pretraži korisnike, firme, telefone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                </div>
                {selectedUsers.size > 0 && isAdmin && (
                    <button
                        onClick={() => setDeleteModal({ type: 'bulk', ids: [...selectedUsers], expected: 'DELETE' })}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 font-medium transition-colors"
                    >
                        <Trash2 size={18} />
                        <span>Obriši označene ({selectedUsers.size})</span>
                    </button>
                )}
            </div>

            <div className="bg-white rounded-2xl border overflow-x-auto">
                <table className="w-full text-sm min-w-[800px]">
                    <thead className="bg-slate-50 text-slate-500 border-b">
                        <tr>
                            <th className="px-3 md:px-6 py-3 md:py-4 w-10">
                                <input
                                    type="checkbox"
                                    checked={filteredUsers.length > 0 && selectedUsers.size === filteredUsers.filter(u => !isProtected(u.role)).length}
                                    onChange={toggleSelectAll}
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                            </th>
                            {[
                                { key: 'name', label: 'Korisnik' },
                                { key: 'phone', label: 'Telefon' },
                                { key: 'role', label: 'Uloga' },
                                { key: 'company', label: 'Firma' }
                            ].map(col => (
                                <th key={col.key} className="px-3 md:px-6 py-3 md:py-4 text-left cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap" onClick={() => handleSort(col.key)}>
                                    <div className="flex items-center gap-1">
                                        {col.label}
                                        {sortConfig.key === col.key && (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                    </div>
                                </th>
                            ))}
                            <th className="px-3 md:px-6 py-3 md:py-4 text-right sticky right-0 bg-slate-50">Akcije</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredUsers.length === 0 ? (
                            <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">Nema rezultata za "{searchQuery}"</td></tr>
                        ) : (
                            paginatedUsers.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setDetailsModal(u)}>
                                    <td className="px-3 md:px-6 py-3 md:py-4" onClick={(e) => e.stopPropagation()}>
                                        {!isProtected(u.role) && (
                                            <input
                                                type="checkbox"
                                                checked={selectedUsers.has(u.id)}
                                                onChange={(e) => toggleSelect(u.id, e)}
                                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                        )}
                                    </td>
                                    <td className="px-3 md:px-6 py-3 md:py-4 font-medium whitespace-nowrap">{u.name}</td>
                                    <td className="px-3 md:px-6 py-3 md:py-4 text-slate-600 whitespace-nowrap">{u.phone}</td>
                                    <td className="px-3 md:px-6 py-3 md:py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getRoleConfig(u.role).className}`}>
                                            {getRoleConfig(u.role).label}
                                        </span>
                                    </td>
                                    <td className="px-3 md:px-6 py-3 md:py-4">
                                        <div className="flex items-center gap-2 whitespace-nowrap">
                                            <span className="text-slate-600">{u.company?.name || '-'}</span>
                                            {u.company?.status === 'frozen' && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1 rounded">FROZEN</span>}
                                        </div>
                                    </td>
                                    <td className="px-3 md:px-6 py-3 md:py-4 text-right sticky right-0 bg-white" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-1">
                                            {/* Edit button */}
                                            {!isProtected(u.role) && (
                                                <button
                                                    onClick={() => onEditUser(u)}
                                                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                                    title="Izmeni korisnika"
                                                >
                                                    <Edit3 size={18} />
                                                </button>
                                            )}
                                            {/* Impersonate button - for non-admin/dev users */}
                                            {!isProtected(u.role) && u.role !== 'admin' && (
                                                <button
                                                    onClick={() => onImpersonate(u.id)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Pristupi nalogu"
                                                >
                                                    <LogIn size={18} />
                                                </button>
                                            )}
                                            {/* Role change button - only for client/manager */}
                                            {(u.role === 'client' || u.role === 'manager') && (
                                                <button
                                                    onClick={async () => {
                                                        setChangingRole(u.id);
                                                        const newRole = u.role === 'client' ? 'manager' : 'client';
                                                        try {
                                                            await onChangeRole(u.id, newRole);
                                                            onRefresh();
                                                        } catch (err) { alert(err.message); }
                                                        finally { setChangingRole(null); }
                                                    }}
                                                    disabled={changingRole === u.id}
                                                    className={`p-2 rounded-lg transition-colors ${u.role === 'client' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-orange-600 hover:bg-orange-50'}`}
                                                    title={u.role === 'client' ? 'Promovi u Menadžera' : 'Degradiraj u Klijenta'}
                                                >
                                                    {changingRole === u.id ? <Loader2 size={18} className="animate-spin" /> : (u.role === 'client' ? <ArrowUp size={18} /> : <ArrowDown size={18} />)}
                                                </button>
                                            )}
                                            {/* Delete button - for admin/developer */}
                                            {isAdmin && !isProtected(u.role) && (
                                                <button
                                                    onClick={() => setDeleteModal({ type: 'single', ids: [u.id], expected: 'DELETE' })}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Obriši"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
                    <p className="text-sm text-slate-500">
                        Prikazano {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} od {filteredUsers.length}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Prethodna
                        </button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-8 h-8 text-sm font-medium rounded-lg ${currentPage === page ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Sledeća
                        </button>
                    </div>
                </div>
            )}

            {/* Modals */}
            {detailsModal && <UserDetailsModal user={detailsModal} onClose={() => setDetailsModal(null)} />}
            {deleteModal && (
                <DeleteConfirmationModal
                    title={deleteModal.type === 'bulk' ? 'Obriši označene korisnike' : 'Obriši korisnika'}
                    warning="Ova akcija je trajna i ne može se poništiti."
                    expectedInput={deleteModal.expected}
                    onClose={() => setDeleteModal(null)}
                    onConfirm={confirmDelete}
                    loading={isDeleting}
                />
            )}
        </div>
    );
};

export const MasterCodesTable = ({ codes, onGenerate, onCopy, onDelete, isDeveloper, isAdmin }) => {
    const { toggleCompanyStatus } = useAuth();
    const [deleteModal, setDeleteModal] = useState(null);
    const [freezing, setFreezing] = useState(null);

    const handleFreeze = async (masterCodeId, currentStatus) => {
        setFreezing(masterCodeId);
        try {
            await toggleCompanyStatus(masterCodeId, currentStatus);
            // We assume parent refreshes data or context updates propagates.
            window.location.reload();
        } catch (e) { alert(e.message); }
        setFreezing(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">Master Kodovi</h2>
                <button onClick={onGenerate} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-sm"><Plus size={18} /> Generiši</button>
            </div>

            {deleteModal && (
                <DeleteConfirmationModal
                    title="Obriši Master Kod"
                    warning="Ova akcija će obrisati firmu i SVE njene korisnike vezane za ovaj kod!"
                    expectedInput={`DELETE ${deleteModal.code}`}
                    onClose={() => setDeleteModal(null)}
                    onConfirm={async () => { await onDelete(deleteModal.id); setDeleteModal(null); }}
                />
            )}

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
                                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${c.status === 'used' ? 'bg-slate-100' : c.status === 'frozen' ? 'bg-red-100 text-red-700 font-bold' : 'bg-emerald-100 text-emerald-700'}`}>{c.status === 'used' ? 'Iskorišćen' : c.status === 'frozen' ? 'ZAMRZNUTO' : 'Dostupan'}</span></td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-600">{c.company?.name || '-'}</span>
                                            {c.status === 'frozen' && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1 rounded">FROZEN</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-500">{new Date(c.created_at).toLocaleDateString('sr-RS')}</td>
                                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                        <button onClick={() => onCopy(c.code)} className="p-2 hover:bg-slate-100 rounded-lg" title="Kopiraj"><Copy size={16} /></button>

                                        {(c.status === 'used' || c.status === 'frozen') && (
                                            <button
                                                onClick={() => handleFreeze(c.id, c.status)}
                                                className={`p-2 rounded-lg ${c.status === 'frozen' ? 'bg-red-50 text-red-600' : 'hover:bg-slate-100 text-slate-400'}`}
                                                title={c.status === 'frozen' ? 'Odmrzni firmu' : 'Zamrzni firmu'}
                                            >
                                                {freezing === c.id ? <Loader2 size={16} className="animate-spin" /> : c.status === 'frozen' ? <Lock size={16} /> : <Unlock size={16} />}
                                            </button>
                                        )}

                                        {isAdmin && (
                                            <button onClick={() => setDeleteModal({ id: c.id, code: c.code })} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Obriši">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
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

// Chat Interface Component
export const ChatInterface = ({ user, fetchMessages, sendMessage, markMessagesAsRead, getConversations, fetchCompanyClients, fetchCompanyMembers, sendMessageToAdmins, userRole, subscribeToMessages, deleteConversation }) => {
    const [conversations, setConversations] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [contacts, setContacts] = useState([]);
    const [showNewChat, setShowNewChat] = useState(false);
    const [showAdminContact, setShowAdminContact] = useState(false);
    const [adminMessage, setAdminMessage] = useState('');
    const [sendingToAdmin, setSendingToAdmin] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        loadConversations();
        loadContacts();
    }, []);

    useEffect(() => {
        if (selectedChat) {
            loadMessages(selectedChat.partnerId);
            markMessagesAsRead(selectedChat.partnerId);
        }
    }, [selectedChat]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // Real-time subscription for new messages (replaces polling)
    useEffect(() => {
        if (!subscribeToMessages) return;
        const unsubscribe = subscribeToMessages((newMsg, type) => {
            // Check if this message belongs to current chat
            if (selectedChat) {
                const isFromPartner = newMsg.sender_id === selectedChat.partnerId;
                const isToPartner = newMsg.receiver_id === selectedChat.partnerId;
                if (isFromPartner || isToPartner) {
                    // Add message to chat if not already there
                    setChatMessages(prev => {
                        if (prev.some(m => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                    // Mark as read if received
                    if (type === 'received' && isFromPartner) {
                        markMessagesAsRead(selectedChat.partnerId);
                    }
                }
            }
            // Refresh conversations list for any new message
            loadConversations();
        });
        return unsubscribe;
    }, [subscribeToMessages, selectedChat]);

    const loadConversations = async () => {
        setLoading(true);
        const convs = await getConversations();
        setConversations(convs);
        setLoading(false);
    };

    const loadContacts = async () => {
        // Fetch all company members
        const members = await fetchCompanyMembers();
        // For clients: only show managers they can contact
        // For managers: show all company members (clients)
        // For admins: fetchCompanyMembers might return empty, they use conversations instead
        if (userRole === 'client') {
            // Clients can only message managers
            setContacts((members || []).filter(m => m.role === 'manager'));
        } else {
            // Managers see all clients
            setContacts((members || []).filter(m => m.role === 'client'));
        }
    };

    const loadMessages = async (partnerId) => {
        const msgs = await fetchMessages(partnerId);
        setChatMessages(msgs);
    };

    const handleSend = async () => {
        if (!newMessage.trim() || !selectedChat) return;
        const messageContent = newMessage.trim();
        setSending(true);
        setNewMessage('');
        try {
            // Send message and get the returned data
            const sentMsg = await sendMessage(selectedChat.partnerId, messageContent);
            // Add the real message to chat (not optimistic)
            if (sentMsg) {
                setChatMessages(prev => [...prev, sentMsg]);
            }
            await loadConversations();
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Greška pri slanju poruke');
        }
        setSending(false);
    };

    const startNewChat = (contact) => {
        setSelectedChat({
            partnerId: contact.id,
            partner: { name: contact.name, role: contact.role, phone: contact.phone }
        });
        setShowNewChat(false);
    };

    const handleSendToAdmin = async () => {
        if (!adminMessage.trim()) return;
        setSendingToAdmin(true);
        try {
            await sendMessageToAdmins(adminMessage);
            alert('Poruka je uspešno poslata administratorima!');
            setAdminMessage('');
            setShowAdminContact(false);
        } catch (error) {
            alert('Greška pri slanju: ' + error.message);
        }
        setSendingToAdmin(false);
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return date.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });
        if (diffDays === 1) return 'Juče';
        if (diffDays < 7) return date.toLocaleDateString('sr-RS', { weekday: 'short' });
        return date.toLocaleDateString('sr-RS', { day: 'numeric', month: 'short' });
    };

    return (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
            <div className="flex h-full">
                {/* Conversations List */}
                <div className={`w-full md:w-96 border-r flex flex-col bg-slate-50 ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 bg-white border-b flex justify-between items-center">
                        <div>
                            <h2 className="font-bold text-lg text-slate-800">Poruke</h2>
                            <p className="text-xs text-slate-500">{conversations.length} razgovora</p>
                        </div>
                        <div className="flex gap-2">
                            {userRole === 'manager' && (
                                <button onClick={() => setShowAdminContact(true)} className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm" title="Kontaktiraj Admina">
                                    <AlertCircle size={20} />
                                </button>
                            )}
                            <button onClick={() => setShowNewChat(true)} className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-sm">
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-32"><Loader2 className="animate-spin text-emerald-600" size={24} /></div>
                        ) : conversations.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <MessageCircle size={32} className="text-slate-400" />
                                </div>
                                <h3 className="font-semibold text-slate-700 mb-1">Nema razgovora</h3>
                                <p className="text-sm text-slate-500 mb-4">Započnite novi razgovor sa vašim kontaktima</p>
                                <button onClick={() => setShowNewChat(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700">
                                    <Plus size={16} className="inline mr-1" /> Nova poruka
                                </button>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-200">
                                {conversations.map(conv => (
                                    <div
                                        key={conv.partnerId}
                                        className={`w-full p-4 flex items-center gap-3 hover:bg-white text-left transition-colors ${selectedChat?.partnerId === conv.partnerId ? 'bg-white border-l-4 border-l-emerald-500' : ''}`}
                                    >
                                        <button onClick={() => setSelectedChat(conv)} className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="relative flex-shrink-0">
                                                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                                    {conv.partner.name?.charAt(0) || '?'}
                                                </div>
                                                {conv.unread > 0 && (
                                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{conv.unread}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    {['admin', 'developer'].includes(conv.partner.role) ? (
                                                        <span className="font-semibold text-blue-600">Admin Chat</span>
                                                    ) : (
                                                        <span className={`font-semibold truncate ${conv.unread > 0 ? 'text-slate-900' : 'text-slate-700'}`}>{conv.partner.name}</span>
                                                    )}
                                                    <span className="text-xs text-slate-400 ml-2 flex-shrink-0">{formatTime(conv.lastMessageAt)}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs px-1.5 py-0.5 rounded ${conv.partner.role === 'client' ? 'bg-blue-100 text-blue-600' : conv.partner.role === 'admin' || conv.partner.role === 'developer' ? 'bg-blue-500 text-white font-medium' : conv.partner.role === 'driver' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                        {conv.partner.role === 'client' ? 'Klijent' : conv.partner.role === 'admin' || conv.partner.role === 'developer' ? 'Admin' : conv.partner.role === 'driver' ? 'Vozač' : 'Menadžer'}
                                                    </span>
                                                </div>
                                                <p className={`text-sm truncate mt-1 ${conv.unread > 0 ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>{conv.lastMessage}</p>
                                            </div>
                                        </button>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (window.confirm('Obrisati celu konverzaciju?')) {
                                                    try {
                                                        await deleteConversation(conv.partnerId);
                                                        if (selectedChat?.partnerId === conv.partnerId) setSelectedChat(null);
                                                        loadConversations();
                                                    } catch (err) {
                                                        const isServerError = err?.message?.includes('503') || err?.message?.includes('timeout') || err?.message?.includes('connection');
                                                        alert(isServerError ? 'Server je trenutno nedostupan. Molimo pokušajte ponovo za nekoliko trenutaka.' : 'Greška pri brisanju: ' + (err?.message || 'Nepoznata greška'));
                                                    }
                                                }
                                            }}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                            title="Obriši konverzaciju"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className={`flex-1 flex flex-col bg-white ${selectedChat ? 'flex' : 'hidden md:flex'}`}>
                    {selectedChat ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b bg-white flex items-center gap-3 shadow-sm">
                                <button onClick={() => setSelectedChat(null)} className="md:hidden p-2 hover:bg-slate-100 rounded-lg">
                                    <ArrowLeft size={20} />
                                </button>
                                <div className={`w-11 h-11 ${['admin', 'developer'].includes(selectedChat.partner.role) ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 'bg-gradient-to-br from-emerald-400 to-emerald-600'} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
                                    {['admin', 'developer'].includes(selectedChat.partner.role) ? 'A' : selectedChat.partner.name?.charAt(0) || '?'}
                                </div>
                                <div className="flex-1">
                                    <h3 className={`font-bold ${['admin', 'developer'].includes(selectedChat.partner.role) ? 'text-blue-600' : 'text-slate-800'}`}>
                                        {['admin', 'developer'].includes(selectedChat.partner.role) ? 'Admin Chat' : selectedChat.partner.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                        <span className={`w-2 h-2 rounded-full ${selectedChat.partner.role === 'client' ? 'bg-blue-500' : ['admin', 'developer'].includes(selectedChat.partner.role) ? 'bg-blue-500' : selectedChat.partner.role === 'driver' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                                        {selectedChat.partner.role === 'client' ? 'Klijent' : ['admin', 'developer'].includes(selectedChat.partner.role) ? 'Administrator' : selectedChat.partner.role === 'manager' ? 'Menadžer' : selectedChat.partner.role === 'driver' ? 'Vozač' : selectedChat.partner.phone}
                                    </p>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ background: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)' }}>
                                {chatMessages.length === 0 && (
                                    <div className="text-center py-8">
                                        <p className="text-sm text-slate-400">Nema poruka. Pošaljite prvu poruku!</p>
                                    </div>
                                )}
                                {chatMessages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl shadow-sm ${msg.sender_id === user.id
                                            ? 'bg-emerald-600 text-white rounded-br-md'
                                            : 'bg-white text-slate-700 rounded-bl-md border'
                                            }`}>
                                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                            <p className={`text-xs mt-1.5 ${msg.sender_id === user.id ? 'text-emerald-200' : 'text-slate-400'}`}>
                                                {formatTime(msg.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input */}
                            <div className="p-4 border-t bg-white">
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                        placeholder="Napišite poruku..."
                                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white outline-none transition-all"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={sending || !newMessage.trim()}
                                        className="px-5 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                                    >
                                        {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center bg-slate-50">
                            <div className="text-center p-8">
                                <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <MessageCircle size={40} className="text-slate-400" />
                                </div>
                                <h3 className="font-semibold text-slate-700 mb-2">Izaberite razgovor</h3>
                                <p className="text-sm text-slate-500">Izaberite razgovor sa leve strane ili započnite novi</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* New Chat Modal */}
            {showNewChat && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-bold text-slate-800">Nova poruka</h3>
                                <p className="text-xs text-slate-500">{contacts.length} kontakata</p>
                            </div>
                            <button onClick={() => setShowNewChat(false)} className="p-2 hover:bg-slate-200 rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="overflow-y-auto max-h-96">
                            {contacts.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    <Users size={40} className="mx-auto mb-3 text-slate-300" />
                                    <p>Nema dostupnih kontakata</p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {contacts.map(contact => (
                                        <button
                                            key={contact.id}
                                            onClick={() => startNewChat(contact)}
                                            className="w-full p-4 flex items-center gap-3 hover:bg-emerald-50 text-left transition-colors"
                                        >
                                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                                {contact.name?.charAt(0) || '?'}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-slate-800">{contact.name}</p>
                                                <p className="text-sm text-slate-500">
                                                    {contact.role === 'client' ? 'Klijent' : contact.role === 'manager' ? 'Menadžer' : contact.role === 'driver' ? 'Vozač' : contact.role === 'admin' || contact.role === 'developer' ? 'Administrator' : contact.role}
                                                </p>
                                            </div>
                                            <ChevronRight size={20} className="text-slate-300" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Contact Modal */}
            {showAdminContact && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-lg">Kontaktiraj Admina</h3>
                                    <p className="text-xs text-blue-100">Poruka će biti poslata svim administratorima</p>
                                </div>
                                <button onClick={() => setShowAdminContact(false)} className="p-2 hover:bg-white/20 rounded-lg"><X size={20} /></button>
                            </div>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                <div className="flex items-center gap-2 text-blue-700 text-sm">
                                    <AlertCircle size={16} />
                                    <span>Koristite ovu opciju za tehničku podršku ili pitanja o sistemu.</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Vaša poruka</label>
                                <textarea
                                    value={adminMessage}
                                    onChange={(e) => setAdminMessage(e.target.value)}
                                    placeholder="Opišite vaš problem ili pitanje..."
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm resize-none"
                                    rows={5}
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowAdminContact(false)}
                                    className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium"
                                >
                                    Otkaži
                                </button>
                                <button
                                    onClick={handleSendToAdmin}
                                    disabled={sendingToAdmin || !adminMessage.trim()}
                                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {sendingToAdmin ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                    Pošalji
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Main Dashboard
export const UserDetailsModal = ({ user, onClose }) => {
    if (!user) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Detalji korisnika</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-2xl">
                            {user.name.charAt(0)}
                        </div>
                        <div>
                            <h4 className="font-bold text-lg">{user.name}</h4>
                            <span className="text-sm px-2 py-1 bg-slate-100 rounded-lg capitalize">{user.role}</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-slate-600"><Phone size={18} /> <span>{user.phone}</span></div>
                        <div className="flex items-center gap-3 text-slate-600"><MapPin size={18} /> <span>{user.address || 'Nema adrese'}</span></div>
                        <div className="flex items-center gap-3 text-slate-600"><Building2 size={18} /> <span>{user.company?.name || 'Nema firme'}</span></div>
                        {user.company?.status === 'frozen' && <div className="text-red-600 font-bold text-sm bg-red-50 p-2 rounded">Firma je zamrznuta</div>}
                    </div>
                </div>
                <div className="p-4 bg-slate-50 border-t flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl font-medium text-slate-700">Zatvori</button>
                </div>
            </div>
        </div>
    );
};

export const CompanyEditModal = ({ company, onClose, onSave, onDelete }) => {
    const [formData, setFormData] = useState({
        name: company?.name || ''
    });
    const [saving, setSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteInput, setDeleteInput] = useState('');
    const [deleting, setDeleting] = useState(false);

    if (!company) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave(company.code, formData);
            onClose();
        } catch (err) {
            alert(err.message || 'Greška pri čuvanju');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await onDelete(company.code);
            onClose();
        } catch (err) {
            alert(err.message || 'Greška pri brisanju');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Izmeni firmu</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg"><X size={20} /></button>
                </div>
                {showDeleteConfirm ? (
                    <div className="p-6">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600 mx-auto">
                            <AlertTriangle size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-center mb-2">Obriši firmu?</h3>
                        <p className="text-slate-500 text-center mb-4">Ovo će trajno obrisati firmu "{company.name}" i sve povezane korisnike!</p>
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Ukucajte "DELETE" za potvrdu</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 border-2 border-red-200 rounded-xl focus:border-red-500 focus:ring-0 outline-none font-bold"
                                placeholder="DELETE"
                                value={deleteInput}
                                onChange={e => setDeleteInput(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium">Odustani</button>
                            <button onClick={handleDelete} disabled={deleteInput !== 'DELETE' || deleting} className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-bold">
                                {deleting ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Obriši'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                    <Building2 size={28} />
                                </div>
                                <div>
                                    <code className="text-sm px-2 py-1 bg-slate-100 rounded-lg">{company.code}</code>
                                    <p className="text-xs text-slate-400 mt-1">{company.managerCount || 0} menadžera • {company.clientCount || 0} klijenata</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Naziv firme</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                    required
                                />
                            </div>

                            {company.status === 'frozen' && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                                    <p className="text-sm text-red-700 font-medium flex items-center gap-2">
                                        <Lock size={16} /> Ova firma je zamrznuta
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-slate-50 border-t flex justify-between">
                            <button type="button" onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium flex items-center gap-2">
                                <Trash2 size={18} /> Obriši
                            </button>
                            <div className="flex gap-3">
                                <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl font-medium text-slate-700">
                                    Otkaži
                                </button>
                                <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium flex items-center gap-2 disabled:opacity-50">
                                    {saving ? <Loader2 size={18} className="animate-spin" /> : null}
                                    Sačuvaj
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export const UserEditModal = ({ user, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: user?.name || '',
        phone: user?.phone || '',
        address: user?.address || ''
    });
    const [saving, setSaving] = useState(false);

    if (!user) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave(user.id, formData);
            onClose();
        } catch (err) {
            alert(err.message || 'Greška pri čuvanju');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Izmeni korisnika</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-xl">
                                {formData.name.charAt(0) || '?'}
                            </div>
                            <div>
                                <span className={`text-sm px-2 py-1 rounded-lg ${user.role === 'developer' ? 'bg-purple-100 text-purple-700' : user.role === 'admin' ? 'bg-blue-100 text-blue-700' : user.role === 'manager' ? 'bg-emerald-100 text-emerald-700' : user.role === 'driver' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                                    {user.role === 'developer' ? 'Developer' : user.role === 'admin' ? 'Admin' : user.role === 'manager' ? 'Menadžer' : user.role === 'driver' ? 'Vozač' : 'Klijent'}
                                </span>
                                <p className="text-xs text-slate-400 mt-1">ID: {user.id?.slice(0, 8)}...</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Ime</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Telefon</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Adresa</label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                placeholder="Ulica i broj, Grad"
                            />
                        </div>

                        {user.company?.name && (
                            <div className="p-3 bg-slate-50 rounded-xl">
                                <p className="text-xs text-slate-500 mb-1">Firma</p>
                                <p className="font-medium text-slate-700">{user.company.name}</p>
                                <p className="text-xs text-slate-400">Kod: {user.company_code}</p>
                            </div>
                        )}
                    </div>
                    <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl font-medium text-slate-700">
                            Otkaži
                        </button>
                        <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium flex items-center gap-2 disabled:opacity-50">
                            {saving ? <Loader2 size={18} className="animate-spin" /> : null}
                            Sačuvaj
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const DeleteConfirmationModal = ({ title, warning, expectedInput, onClose, onConfirm, loading }) => {
    const [input, setInput] = useState('');
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-6">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600 mx-auto">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-center mb-2">{title}</h3>
                    <p className="text-slate-500 text-center mb-6">{warning}</p>

                    <div className="mb-6">
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Ukucajte "{expectedInput}" za potvrdu</label>
                        <input
                            type="text"
                            className="w-full px-4 py-3 border-2 border-red-200 rounded-xl focus:border-red-500 focus:ring-0 outline-none font-bold"
                            placeholder={expectedInput}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-slate-700">Odustani</button>
                        <button
                            onClick={onConfirm}
                            disabled={input !== expectedInput || loading}
                            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-red-200"
                        >
                            {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Trajno obriši'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Analytics Page with Charts
export const AnalyticsPage = ({ processedRequests, clients, wasteTypes }) => {
    const [dateRange, setDateRange] = useState('month'); // 'week', 'month', 'year', 'all'
    const [selectedWasteType, setSelectedWasteType] = useState('all');

    // Filter requests by date range
    const getFilteredRequests = () => {
        if (!processedRequests) return [];
        const now = new Date();
        let startDate = null;

        switch (dateRange) {
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'month':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
            case 'year':
                startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                break;
            default:
                startDate = null;
        }

        let filtered = processedRequests;
        if (startDate) {
            filtered = filtered.filter(r => new Date(r.processed_at) >= startDate);
        }
        if (selectedWasteType !== 'all') {
            filtered = filtered.filter(r => r.waste_type === selectedWasteType);
        }
        return filtered;
    };

    const filteredRequests = getFilteredRequests();

    // Calculate total weight (convert tonnes to kg for consistency)
    const calculateTotalWeight = (requests) => {
        return requests.reduce((total, r) => {
            if (!r.weight) return total;
            const weightInKg = r.weight_unit === 't' ? r.weight * 1000 : r.weight;
            return total + weightInKg;
        }, 0);
    };

    // Get weight by waste type
    const getWeightByWasteType = () => {
        const byType = {};
        filteredRequests.forEach(r => {
            if (!r.weight) return;
            const typeLabel = r.waste_label || r.waste_type || 'Nepoznato';
            const weightInKg = r.weight_unit === 't' ? r.weight * 1000 : r.weight;
            byType[typeLabel] = (byType[typeLabel] || 0) + weightInKg;
        });
        return Object.entries(byType)
            .map(([type, weight]) => ({ type, weight }))
            .sort((a, b) => b.weight - a.weight);
    };

    // Get weight by client
    const getWeightByClient = () => {
        const byClient = {};
        filteredRequests.forEach(r => {
            if (!r.weight) return;
            const clientName = r.client_name || 'Nepoznat';
            const weightInKg = r.weight_unit === 't' ? r.weight * 1000 : r.weight;
            byClient[clientName] = (byClient[clientName] || 0) + weightInKg;
        });
        return Object.entries(byClient)
            .map(([client, weight]) => ({ client, weight }))
            .sort((a, b) => b.weight - a.weight);
    };

    // Get requests by date (for chart) - sorted chronologically (oldest to newest)
    const getRequestsByDate = () => {
        const byDate = {};
        filteredRequests.forEach(r => {
            const dateObj = new Date(r.processed_at);
            const dateKey = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD for sorting
            const dateLabel = dateObj.toLocaleDateString('sr-RS', { day: 'numeric', month: 'numeric' });
            if (!byDate[dateKey]) byDate[dateKey] = { date: dateLabel, count: 0 };
            byDate[dateKey].count++;
        });
        return Object.entries(byDate)
            .sort((a, b) => a[0].localeCompare(b[0])) // Sort by YYYY-MM-DD
            .map(([, data]) => data)
            .slice(-14); // Last 14 data points
    };

    // Get weight by date - sorted chronologically (oldest to newest)
    const getWeightByDate = () => {
        const byDate = {};
        filteredRequests.forEach(r => {
            if (!r.weight) return;
            const dateObj = new Date(r.processed_at);
            const dateKey = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD for sorting
            const dateLabel = dateObj.toLocaleDateString('sr-RS', { day: 'numeric', month: 'numeric' });
            const weightInKg = r.weight_unit === 't' ? r.weight * 1000 : r.weight;
            if (!byDate[dateKey]) byDate[dateKey] = { date: dateLabel, weight: 0 };
            byDate[dateKey].weight += weightInKg;
        });
        return Object.entries(byDate)
            .sort((a, b) => a[0].localeCompare(b[0])) // Sort by YYYY-MM-DD
            .map(([, data]) => data)
            .slice(-14);
    };

    const totalWeight = calculateTotalWeight(filteredRequests);
    const weightByType = getWeightByWasteType();
    const weightByClient = getWeightByClient();
    const requestsByDate = getRequestsByDate();
    const weightByDate = getWeightByDate();
    const requestsWithWeight = filteredRequests.filter(r => r.weight).length;

    // Calculate average fulfillment time (in hours)
    const calculateAverageTime = () => {
        const requestsWithBothDates = filteredRequests.filter(r => r.created_at && r.processed_at);
        if (requestsWithBothDates.length === 0) return null;

        const totalMinutes = requestsWithBothDates.reduce((total, r) => {
            const created = new Date(r.created_at).getTime();
            const processed = new Date(r.processed_at).getTime();
            return total + (processed - created) / (1000 * 60); // in minutes
        }, 0);

        return totalMinutes / requestsWithBothDates.length;
    };

    const averageTimeMinutes = calculateAverageTime();

    // Format average time for display
    const formatAverageTime = (minutes) => {
        if (minutes === null) return 'N/A';
        if (minutes < 60) return `${Math.round(minutes)} min`;
        if (minutes < 1440) return `${(minutes / 60).toFixed(1)} h`;
        return `${(minutes / 1440).toFixed(1)} dana`;
    };

    // Format weight for display
    const formatWeight = (kg) => {
        if (kg >= 1000) {
            return `${(kg / 1000).toFixed(2)} t`;
        }
        return `${kg.toFixed(1)} kg`;
    };

    // Get max value for bar charts
    const maxWeightByType = Math.max(...weightByType.map(w => w.weight), 1);
    const maxWeightByClient = Math.max(...weightByClient.map(w => w.weight), 1);
    const maxRequestsByDate = Math.max(...requestsByDate.map(r => r.count), 1);
    const maxWeightByDate = Math.max(...weightByDate.map(w => w.weight), 1);

    return (
        <div className="space-y-6">
            {/* Header with filters */}
            <div className="bg-white rounded-2xl border p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <BarChart3 className="text-emerald-600" />
                            Analitika
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Pregled statistika po težini otpada</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none bg-white"
                        >
                            <option value="week">Poslednjih 7 dana</option>
                            <option value="month">Poslednji mesec</option>
                            <option value="year">Poslednja godina</option>
                            <option value="all">Sve vreme</option>
                        </select>
                        <select
                            value={selectedWasteType}
                            onChange={(e) => setSelectedWasteType(e.target.value)}
                            className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none bg-white"
                        >
                            <option value="all">Sve vrste otpada</option>
                            {wasteTypes?.map(wt => (
                                <option key={wt.id} value={wt.id}>{wt.icon} {wt.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-2xl border p-5">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
                        <Scale className="w-6 h-6 text-emerald-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{formatWeight(totalWeight)}</p>
                    <p className="text-sm text-slate-500">Ukupna težina</p>
                </div>
                <div className="bg-white rounded-2xl border p-5">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                        <Truck className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{filteredRequests.length}</p>
                    <p className="text-sm text-slate-500">Obrađenih zahteva</p>
                </div>
                <div className="bg-white rounded-2xl border p-5">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-3">
                        <CheckCircle2 className="w-6 h-6 text-amber-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{requestsWithWeight}</p>
                    <p className="text-sm text-slate-500">Sa unetom težinom</p>
                </div>
                <div className="bg-white rounded-2xl border p-5">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-3">
                        <Recycle className="w-6 h-6 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{weightByType.length}</p>
                    <p className="text-sm text-slate-500">Vrsta otpada</p>
                </div>
                <div className="bg-white rounded-2xl border p-5">
                    <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center mb-3">
                        <Clock className="w-6 h-6 text-cyan-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{formatAverageTime(averageTimeMinutes)}</p>
                    <p className="text-sm text-slate-500">Prosečno vreme</p>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Weight by Waste Type */}
                <div className="bg-white rounded-2xl border p-5">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Recycle className="text-emerald-600" size={20} />
                        Težina po vrsti otpada
                    </h3>
                    {weightByType.length === 0 ? (
                        <p className="text-slate-500 text-sm py-8 text-center">Nema podataka o težini</p>
                    ) : (
                        <div className="space-y-3">
                            {weightByType.slice(0, 8).map((item, idx) => (
                                <div key={idx}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-700 truncate mr-2">{item.type}</span>
                                        <span className="font-medium text-slate-800">{formatWeight(item.weight)}</span>
                                    </div>
                                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                                            style={{ width: `${(item.weight / maxWeightByType) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Weight by Client */}
                <div className="bg-white rounded-2xl border p-5">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Users className="text-blue-600" size={20} />
                        Težina po klijentu
                    </h3>
                    {weightByClient.length === 0 ? (
                        <p className="text-slate-500 text-sm py-8 text-center">Nema podataka o težini</p>
                    ) : (
                        <div className="space-y-3">
                            {weightByClient.slice(0, 8).map((item, idx) => (
                                <div key={idx}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-700 truncate mr-2">{item.client}</span>
                                        <span className="font-medium text-slate-800">{formatWeight(item.weight)}</span>
                                    </div>
                                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                                            style={{ width: `${(item.weight / maxWeightByClient) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Requests by Date */}
                <div className="bg-white rounded-2xl border p-5">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Calendar className="text-amber-600" size={20} />
                        Zahtevi po datumu
                    </h3>
                    {requestsByDate.length === 0 ? (
                        <p className="text-slate-500 text-sm py-8 text-center">Nema podataka</p>
                    ) : (
                        <div className="flex items-end justify-between gap-1 h-40">
                            {requestsByDate.map((item, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center">
                                    <div
                                        className="w-full bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-lg transition-all duration-500 min-h-[4px]"
                                        style={{ height: `${(item.count / maxRequestsByDate) * 100}%` }}
                                        title={`${item.date}: ${item.count} zahteva`}
                                    />
                                    <span className="text-[10px] text-slate-400 mt-1 transform -rotate-45 origin-top-left whitespace-nowrap">
                                        {item.date.slice(0, 5)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Weight by Date */}
                <div className="bg-white rounded-2xl border p-5">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Scale className="text-purple-600" size={20} />
                        Težina po datumu
                    </h3>
                    {weightByDate.length === 0 ? (
                        <p className="text-slate-500 text-sm py-8 text-center">Nema podataka o težini</p>
                    ) : (
                        <div className="flex items-end justify-between gap-1 h-40">
                            {weightByDate.map((item, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center">
                                    <div
                                        className="w-full bg-gradient-to-t from-purple-500 to-purple-400 rounded-t-lg transition-all duration-500 min-h-[4px]"
                                        style={{ height: `${(item.weight / maxWeightByDate) * 100}%` }}
                                        title={`${item.date}: ${formatWeight(item.weight)}`}
                                    />
                                    <span className="text-[10px] text-slate-400 mt-1 transform -rotate-45 origin-top-left whitespace-nowrap">
                                        {item.date.slice(0, 5)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Large Weight vs Date Chart */}
            <div className="bg-white rounded-2xl border p-5">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <BarChart3 className="text-emerald-600" size={20} />
                    Dijagram: Težina (kg) po datumu
                </h3>
                {weightByDate.length === 0 ? (
                    <p className="text-slate-500 text-sm py-8 text-center">Nema podataka o težini za prikaz dijagrama</p>
                ) : (
                    <div className="relative">
                        {/* Y-axis labels */}
                        <div className="flex">
                            <div className="w-16 flex flex-col justify-between h-64 pr-2 text-right">
                                <span className="text-xs text-slate-500">{formatWeight(maxWeightByDate)}</span>
                                <span className="text-xs text-slate-500">{formatWeight(maxWeightByDate * 0.75)}</span>
                                <span className="text-xs text-slate-500">{formatWeight(maxWeightByDate * 0.5)}</span>
                                <span className="text-xs text-slate-500">{formatWeight(maxWeightByDate * 0.25)}</span>
                                <span className="text-xs text-slate-500">0</span>
                            </div>
                            {/* Chart area */}
                            <div className="flex-1 relative h-64 border-l border-b border-slate-200">
                                {/* Grid lines */}
                                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                    {[0, 1, 2, 3].map(i => (
                                        <div key={i} className="border-t border-slate-100 w-full" />
                                    ))}
                                </div>
                                {/* Bars */}
                                <div className="absolute inset-0 flex items-end justify-around px-2 gap-2">
                                    {weightByDate.map((item, idx) => (
                                        <div key={idx} className="flex-1 flex flex-col items-center max-w-16 group">
                                            <div className="relative w-full flex justify-center">
                                                {/* Tooltip */}
                                                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                                    {item.date}: {formatWeight(item.weight)}
                                                </div>
                                                <div
                                                    className="w-full max-w-10 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-md transition-all duration-500 hover:from-emerald-500 hover:to-emerald-300 cursor-pointer"
                                                    style={{ height: `${Math.max((item.weight / maxWeightByDate) * 100, 2)}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {/* X-axis labels */}
                        <div className="flex ml-16">
                            <div className="flex-1 flex justify-around px-2 mt-2">
                                {weightByDate.map((item, idx) => (
                                    <span key={idx} className="text-xs text-slate-500 max-w-16 text-center truncate flex-1">
                                        {item.date.slice(0, 5)}
                                    </span>
                                ))}
                            </div>
                        </div>
                        {/* Axis labels */}
                        <div className="flex justify-between mt-4 text-sm text-slate-600">
                            <span className="font-medium">Y: Težina (kg/t)</span>
                            <span className="font-medium">X: Datum obrade</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Top clients table */}
            {weightByClient.length > 0 && (
                <div className="bg-white rounded-2xl border overflow-hidden">
                    <div className="p-5 border-b">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Users className="text-emerald-600" size={20} />
                            Top klijenti po količini otpada
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left py-3 px-5 text-sm font-medium text-slate-600">#</th>
                                    <th className="text-left py-3 px-5 text-sm font-medium text-slate-600">Klijent</th>
                                    <th className="text-right py-3 px-5 text-sm font-medium text-slate-600">Ukupna težina</th>
                                    <th className="text-right py-3 px-5 text-sm font-medium text-slate-600">Broj zahteva</th>
                                </tr>
                            </thead>
                            <tbody>
                                {weightByClient.slice(0, 10).map((item, idx) => {
                                    const clientRequestCount = filteredRequests.filter(r => r.client_name === item.client).length;
                                    return (
                                        <tr key={idx} className="border-t hover:bg-slate-50">
                                            <td className="py-3 px-5">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-amber-100 text-amber-700' :
                                                    idx === 1 ? 'bg-slate-200 text-slate-700' :
                                                        idx === 2 ? 'bg-orange-100 text-orange-700' :
                                                            'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {idx + 1}
                                                </span>
                                            </td>
                                            <td className="py-3 px-5 font-medium text-slate-800">{item.client}</td>
                                            <td className="py-3 px-5 text-right font-bold text-emerald-600">{formatWeight(item.weight)}</td>
                                            <td className="py-3 px-5 text-right text-slate-600">{clientRequestCount}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

// Re-export icons for Dashboard.jsx to use
export {
    LayoutDashboard, Truck, Users, Settings, LogOut, Mountain, MapPin, Bell, Search, Menu, X, Plus, Recycle, BarChart3,
    FileText, Building2, AlertCircle, CheckCircle2, Clock, Package, Send, Trash2, Eye, Copy, ChevronRight, Phone,
    RefreshCw, Info, Box, ArrowUpDown, ArrowUp, ArrowDown, Filter, Upload, Image, Globe, ChevronDown, MessageCircle, Edit3, ArrowLeft, Loader2, History, Calendar, XCircle, Printer, Download, FileSpreadsheet,
    Lock, Unlock, AlertTriangle, LogIn, Scale
};

// Re-export hooks and utilities
export { useState, useEffect, useCallback, useMemo, useRef };
export { useNavigate };
export { useAuth };
export { supabase };
export { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap };
export { L };
