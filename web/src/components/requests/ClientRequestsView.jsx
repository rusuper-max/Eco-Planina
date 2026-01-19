import { useState } from 'react';
import { CheckCircle2, ArrowUp, ArrowDown, Calendar, Clock, Truck, Phone, User, Trash2, MessageCircle, X } from 'lucide-react';
import { CountdownTimer, FillLevelBar, RecycleLoader } from '../common';

// Helper to get status label and color
const getAssignmentStatus = (status) => {
    switch (status) {
        case 'assigned':
            return { label: 'Dodeljen vozač', color: 'bg-blue-100 text-blue-700', icon: Truck };
        case 'in_progress':
            return { label: 'Vozač na putu', color: 'bg-amber-100 text-amber-700', icon: Truck };
        case 'picked_up':
            return { label: 'Preuzeto', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 };
        default:
            return { label: 'Na čekanju', color: 'bg-slate-100 text-slate-600', icon: Clock };
    }
};

/**
 * Client Requests View - Shows active pending requests
 */
export const ClientRequestsView = ({ requests, wasteTypes, onDeleteRequest, onContactManager }) => {
    const [deletingId, setDeletingId] = useState(null);
    const [showContactModal, setShowContactModal] = useState(null); // request with assignment info
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
        else if (sortBy === 'fill') {
            // Sortiraj po popunjenosti - najveća popunjenost prva
            cmp = (b.fill_level || 0) - (a.fill_level || 0);
        } else if (sortBy === 'type') cmp = (a.waste_label || '').localeCompare(b.waste_label || '');
        return sortDir === 'desc' ? -cmp : cmp;
    });

    const toggleSort = (key) => {
        if (sortBy === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        else { setSortBy(key); setSortDir('asc'); }
    };

    const handleDeleteClick = async (request) => {
        // Check if assigned to driver
        if (request.driver_assignment) {
            setShowContactModal(request);
            return;
        }

        // Confirm deletion
        if (!window.confirm(`Da li ste sigurni da želite da obrišete zahtev za "${request.waste_label}"?`)) {
            return;
        }

        setDeletingId(request.id);
        try {
            await onDeleteRequest?.(request.id);
        } catch (error) {
            alert('Greška pri brisanju zahteva. Pokušajte ponovo.');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <>
            {/* Contact Manager Modal */}
            {showContactModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-800">Zahtev dodeljen vozaču</h3>
                            <button onClick={() => setShowContactModal(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-4 mb-4">
                            <div className="flex items-center gap-3 mb-2">
                                <Truck size={24} className="text-blue-600" />
                                <div>
                                    <p className="font-medium text-slate-800">
                                        {showContactModal.driver_assignment?.driver_name || 'Vozač'}
                                    </p>
                                    <p className="text-sm text-slate-500">je preuzeo vaš zahtev</p>
                                </div>
                            </div>
                        </div>
                        <p className="text-slate-600 mb-4">
                            Vaš zahtev za <strong>{showContactModal.waste_label}</strong> je već dodeljen vozaču.
                            Kontaktirajte menadžera ako želite da otkažete.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowContactModal(null)}
                                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50"
                            >
                                Zatvori
                            </button>
                            {showContactModal.driver_assignment?.assigned_by_id && onContactManager && (
                                <button
                                    onClick={() => {
                                        onContactManager(showContactModal.driver_assignment.assigned_by_id);
                                        setShowContactModal(null);
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 flex items-center justify-center gap-2"
                                >
                                    <MessageCircle size={18} />
                                    Kontaktiraj menadžera
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <div className="bg-white rounded-2xl border overflow-hidden">
                <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
                    <h2 className="font-bold text-lg">Aktivni zahtevi ({requests.length})</h2>
                    <div className="flex gap-2">
                        {[{ key: 'date', label: 'Datum' }, { key: 'fill', label: 'Popunjenost' }, { key: 'type', label: 'Tip' }].map(s => (
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
                    {sorted.map(r => {
                        const assignment = r.driver_assignment;
                        const statusInfo = getAssignmentStatus(assignment?.status);
                        const StatusIcon = statusInfo.icon;

                        return (
                            <div key={r.id} className="p-5 hover:bg-slate-50 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center text-3xl">
                                            {wasteTypes.find(w => w.id === r.waste_type)?.icon || '📦'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {r.request_code && (
                                                    <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 text-xs font-mono rounded font-medium">
                                                        {r.request_code}
                                                    </span>
                                                )}
                                                <h4 className="font-semibold text-slate-800 text-lg">{r.waste_label}</h4>
                                                {r.region_id && (
                                                    <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 text-xs font-mono rounded">
                                                        R: {r.region_id.slice(0, 8)}...
                                                    </span>
                                                )}
                                            </div>
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
                                        {/* Popunjenost kontejnera */}
                                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
                                            <span className="text-xs text-slate-500">Popunjenost:</span>
                                            <FillLevelBar fillLevel={r.fill_level} />
                                        </div>
                                        <CountdownTimer createdAt={r.created_at} urgency={r.urgency} />
                                        <span className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${statusInfo.color}`}>
                                            <StatusIcon size={12} />
                                            {statusInfo.label}
                                        </span>
                                    </div>
                                </div>
                                {/* Driver info card - shown when driver is assigned */}
                                {assignment && (
                                    <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white">
                                                    <User size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800">{assignment.driver_name}</p>
                                                    <p className="text-sm text-slate-500">Vozač</p>
                                                </div>
                                            </div>
                                            {assignment.driver_phone && (
                                                <a
                                                    href={`tel:${assignment.driver_phone}`}
                                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
                                                >
                                                    <Phone size={16} />
                                                    Pozovi
                                                </a>
                                            )}
                                        </div>
                                        {assignment.status === 'in_progress' && (
                                            <div className="mt-3 pt-3 border-t border-emerald-200">
                                                <div className="flex items-center gap-2 text-sm text-emerald-700">
                                                    <Truck size={16} className="animate-pulse" />
                                                    <span>Vozač je na putu ka vašoj lokaciji</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {/* Delete/Cancel button */}
                                {onDeleteRequest && (
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <button
                                            onClick={() => handleDeleteClick(r)}
                                            disabled={deletingId === r.id}
                                            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors ${assignment
                                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                                }`}
                                        >
                                            {deletingId === r.id ? (
                                                <RecycleLoader size={18} />
                                            ) : assignment ? (
                                                <>
                                                    <MessageCircle size={18} />
                                                    Kontaktiraj menadžera za otkazivanje
                                                </>
                                            ) : (
                                                <>
                                                    <Trash2 size={18} />
                                                    Obriši zahtev
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
};

export default ClientRequestsView;
