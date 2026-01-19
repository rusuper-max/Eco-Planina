import { useState, useMemo } from 'react';
import {
    ArrowUpFromLine, Plus, Send, CheckCircle, XCircle, Clock,
    Package, Building2, Phone, MapPin, Scale, Banknote,
    ChevronDown, ChevronUp, AlertTriangle, Filter
} from 'lucide-react';
import { Modal, EmptyState } from '../common';
import { CreateOutboundModal } from './CreateOutboundModal';
import toast from 'react-hot-toast';

/**
 * OutboundTab - Lista izlaza iz skladišta
 */
export const OutboundTab = ({
    outbounds = [],
    inventories = [],
    wasteTypes = [],
    inventoryItems = [],
    canManage = false,
    onCreateOutbound,
    onSendOutbound,
    onConfirmOutbound,
    onCancelOutbound,
    onRefresh
}) => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedOutbound, setSelectedOutbound] = useState(null);
    const [confirmingOutbound, setConfirmingOutbound] = useState(null);
    const [cancellingOutbound, setCancellingOutbound] = useState(null);
    const [receivedQuantity, setReceivedQuantity] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [expandedId, setExpandedId] = useState(null);

    // Status config with full Tailwind classes (can't use dynamic class generation)
    const statusConfig = {
        pending: {
            label: 'Na čekanju',
            icon: Clock,
            bgActive: 'bg-amber-100 border-amber-300',
            iconColor: 'text-amber-600',
            textColor: 'text-amber-600',
            badgeBg: 'bg-amber-100 text-amber-700',
            cardBg: 'bg-amber-100'
        },
        sent: {
            label: 'Poslat',
            icon: Send,
            bgActive: 'bg-blue-100 border-blue-300',
            iconColor: 'text-blue-600',
            textColor: 'text-blue-600',
            badgeBg: 'bg-blue-100 text-blue-700',
            cardBg: 'bg-blue-100'
        },
        confirmed: {
            label: 'Potvrđen',
            icon: CheckCircle,
            bgActive: 'bg-emerald-100 border-emerald-300',
            iconColor: 'text-emerald-600',
            textColor: 'text-emerald-600',
            badgeBg: 'bg-emerald-100 text-emerald-700',
            cardBg: 'bg-emerald-100'
        },
        cancelled: {
            label: 'Otkazan',
            icon: XCircle,
            bgActive: 'bg-slate-100 border-slate-300',
            iconColor: 'text-slate-600',
            textColor: 'text-slate-600',
            badgeBg: 'bg-slate-100 text-slate-700',
            cardBg: 'bg-slate-100'
        }
    };

    // Filter outbounds by status
    const filteredOutbounds = useMemo(() => {
        if (statusFilter === 'all') return outbounds;
        return outbounds.filter(o => o.status === statusFilter);
    }, [outbounds, statusFilter]);

    // Group by status for summary
    const statusCounts = useMemo(() => {
        const counts = { pending: 0, sent: 0, confirmed: 0, cancelled: 0 };
        outbounds.forEach(o => {
            if (counts[o.status] !== undefined) counts[o.status]++;
        });
        return counts;
    }, [outbounds]);

    // Format weight
    const formatWeight = (kg) => {
        if (!kg) return '0 kg';
        if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
        return `${parseFloat(kg).toFixed(1)} kg`;
    };

    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('sr-RS', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Handle send
    const handleSend = async (outbound) => {
        try {
            await onSendOutbound(outbound.id);
            toast.success('Izlaz poslat');
            onRefresh?.();
        } catch (err) {
            toast.error(err.message || 'Greška pri slanju');
        }
    };

    // Handle confirm
    const handleConfirm = async () => {
        if (!confirmingOutbound) return;

        const qty = parseFloat(receivedQuantity);
        if (isNaN(qty) || qty < 0) {
            toast.error('Unesite validnu količinu');
            return;
        }

        try {
            await onConfirmOutbound(confirmingOutbound.id, qty);
            toast.success('Izlaz potvrđen');
            setConfirmingOutbound(null);
            setReceivedQuantity('');
            onRefresh?.();
        } catch (err) {
            toast.error(err.message || 'Greška pri potvrdi');
        }
    };

    // Handle cancel
    const handleCancel = async () => {
        if (!cancellingOutbound) return;

        try {
            await onCancelOutbound(cancellingOutbound.id);
            toast.success('Izlaz otkazan');
            setCancellingOutbound(null);
            onRefresh?.();
        } catch (err) {
            toast.error(err.message || 'Greška pri otkazivanju');
        }
    };

    // Get waste type info
    const getWasteType = (id) => wasteTypes.find(wt => wt.id === id);

    // Get inventory info
    const getInventory = (id) => inventories.find(inv => inv.id === id);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                    >
                        <option value="all">Svi statusi ({outbounds.length})</option>
                        <option value="pending">Na čekanju ({statusCounts.pending})</option>
                        <option value="sent">Poslati ({statusCounts.sent})</option>
                        <option value="confirmed">Potvrđeni ({statusCounts.confirmed})</option>
                        <option value="cancelled">Otkazani ({statusCounts.cancelled})</option>
                    </select>
                </div>

                {canManage && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 flex items-center gap-1.5"
                    >
                        <Plus size={16} />
                        Novi izlaz
                    </button>
                )}
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(statusConfig).map(([status, config]) => {
                    const Icon = config.icon;
                    const count = statusCounts[status];
                    const isActive = statusFilter === status;

                    return (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(isActive ? 'all' : status)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                                isActive
                                    ? config.bgActive
                                    : 'bg-white border-slate-100 hover:border-slate-200'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Icon size={16} className={config.iconColor} />
                                <span className="text-sm font-medium text-slate-700">{config.label}</span>
                            </div>
                            <p className={`text-xl font-bold mt-1 ${config.textColor}`}>{count}</p>
                        </button>
                    );
                })}
            </div>

            {/* Outbounds List */}
            {filteredOutbounds.length === 0 ? (
                <EmptyState
                    icon={ArrowUpFromLine}
                    title="Nema izlaza"
                    desc={statusFilter !== 'all'
                        ? `Nema izlaza sa statusom "${statusConfig[statusFilter]?.label}"`
                        : "Kreirajte prvi izlaz da biste evidentirali slanje robe"
                    }
                />
            ) : (
                <div className="space-y-3">
                    {filteredOutbounds.map(outbound => {
                        const status = statusConfig[outbound.status];
                        const StatusIcon = status?.icon || Clock;
                        const wasteType = getWasteType(outbound.waste_type_id);
                        const inventory = getInventory(outbound.inventory_id);
                        const isExpanded = expandedId === outbound.id;
                        const kalo = outbound.quantity_received_kg != null
                            ? outbound.quantity_planned_kg - outbound.quantity_received_kg
                            : null;

                        return (
                            <div
                                key={outbound.id}
                                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
                            >
                                {/* Main row */}
                                <div
                                    className="p-4 cursor-pointer hover:bg-slate-50"
                                    onClick={() => setExpandedId(isExpanded ? null : outbound.id)}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status?.cardBg || 'bg-slate-100'}`}>
                                                <StatusIcon size={20} className={status?.iconColor || 'text-slate-600'} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-semibold text-slate-800">
                                                        {outbound.recipient_name}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status?.badgeBg || 'bg-slate-100 text-slate-700'}`}>
                                                        {status?.label || outbound.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <Package size={14} />
                                                        {wasteType?.label || wasteType?.name || 'Nepoznato'}
                                                    </span>
                                                    <span className="flex items-center gap-1 font-medium text-emerald-600">
                                                        <Scale size={14} />
                                                        {formatWeight(outbound.quantity_planned_kg)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Action buttons based on status */}
                                            {canManage && outbound.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleSend(outbound); }}
                                                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
                                                    >
                                                        <Send size={14} />
                                                        Pošalji
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setCancellingOutbound(outbound); }}
                                                        className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50"
                                                    >
                                                        Otkaži
                                                    </button>
                                                </>
                                            )}
                                            {canManage && outbound.status === 'sent' && (
                                                <>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setConfirmingOutbound(outbound);
                                                            setReceivedQuantity(outbound.quantity_planned_kg.toString());
                                                        }}
                                                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                                                    >
                                                        <CheckCircle size={14} />
                                                        Potvrdi
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setCancellingOutbound(outbound); }}
                                                        className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50"
                                                    >
                                                        Otkaži
                                                    </button>
                                                </>
                                            )}

                                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded details */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-0 border-t border-slate-100 bg-slate-50">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                                            {/* Left column */}
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase tracking-wide">Skladište</p>
                                                    <p className="font-medium">{inventory?.name || '-'}</p>
                                                </div>
                                                {outbound.recipient_address && (
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase tracking-wide">Adresa primaoca</p>
                                                        <p className="font-medium flex items-center gap-1">
                                                            <MapPin size={14} className="text-slate-400" />
                                                            {outbound.recipient_address}
                                                        </p>
                                                    </div>
                                                )}
                                                {outbound.recipient_contact && (
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase tracking-wide">Kontakt</p>
                                                        <p className="font-medium flex items-center gap-1">
                                                            <Phone size={14} className="text-slate-400" />
                                                            {outbound.recipient_contact}
                                                        </p>
                                                    </div>
                                                )}
                                                {outbound.notes && (
                                                    <div>
                                                        <p className="text-xs text-slate-500 uppercase tracking-wide">Napomena</p>
                                                        <p className="text-sm">{outbound.notes}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right column */}
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-white p-3 rounded-xl">
                                                        <p className="text-xs text-slate-500">Planirano</p>
                                                        <p className="text-lg font-bold text-slate-800">
                                                            {formatWeight(outbound.quantity_planned_kg)}
                                                        </p>
                                                    </div>
                                                    {outbound.quantity_received_kg != null && (
                                                        <div className="bg-white p-3 rounded-xl">
                                                            <p className="text-xs text-slate-500">Primljeno</p>
                                                            <p className="text-lg font-bold text-emerald-600">
                                                                {formatWeight(outbound.quantity_received_kg)}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                {kalo != null && kalo > 0 && (
                                                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                                                        <div className="flex items-center gap-2">
                                                            <AlertTriangle size={16} className="text-amber-600" />
                                                            <span className="text-sm font-medium text-amber-800">
                                                                Kalo: {formatWeight(kalo)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {outbound.price_per_kg && (
                                                    <div className="bg-white p-3 rounded-xl">
                                                        <p className="text-xs text-slate-500">Cena</p>
                                                        <p className="font-medium">
                                                            {outbound.price_per_kg} RSD/kg
                                                            {outbound.total_amount && (
                                                                <span className="ml-2 text-emerald-600">
                                                                    = {outbound.total_amount.toLocaleString('sr-RS')} RSD
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Timeline */}
                                                <div className="bg-white p-3 rounded-xl space-y-2">
                                                    <p className="text-xs text-slate-500 uppercase tracking-wide">Istorija</p>
                                                    <div className="space-y-1 text-sm">
                                                        <p className="flex justify-between">
                                                            <span className="text-slate-500">Kreirano:</span>
                                                            <span>{formatDate(outbound.created_at)}</span>
                                                        </p>
                                                        {outbound.sent_at && (
                                                            <p className="flex justify-between">
                                                                <span className="text-slate-500">Poslato:</span>
                                                                <span>{formatDate(outbound.sent_at)}</span>
                                                            </p>
                                                        )}
                                                        {outbound.confirmed_at && (
                                                            <p className="flex justify-between">
                                                                <span className="text-slate-500">Potvrđeno:</span>
                                                                <span>{formatDate(outbound.confirmed_at)}</span>
                                                            </p>
                                                        )}
                                                        {outbound.cancelled_at && (
                                                            <p className="flex justify-between">
                                                                <span className="text-slate-500">Otkazano:</span>
                                                                <span>{formatDate(outbound.cancelled_at)}</span>
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <CreateOutboundModal
                    inventories={inventories}
                    wasteTypes={wasteTypes}
                    inventoryItems={inventoryItems}
                    onClose={() => setShowCreateModal(false)}
                    onSave={async (data) => {
                        await onCreateOutbound(data);
                        setShowCreateModal(false);
                        if (onRefresh) {
                            await onRefresh();
                        }
                    }}
                />
            )}

            {/* Confirm Modal */}
            {confirmingOutbound && (
                <Modal
                    open={!!confirmingOutbound}
                    onClose={() => { setConfirmingOutbound(null); setReceivedQuantity(''); }}
                    title="Potvrdi prijem"
                >
                    <div className="space-y-4">
                        <div className="p-4 bg-blue-50 rounded-xl">
                            <p className="text-sm text-blue-800">
                                Primalac: <strong>{confirmingOutbound.recipient_name}</strong>
                            </p>
                            <p className="text-sm text-blue-800 mt-1">
                                Poslato: <strong>{formatWeight(confirmingOutbound.quantity_planned_kg)}</strong>
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Primljena količina (kg)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={receivedQuantity}
                                onChange={(e) => setReceivedQuantity(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-lg font-mono"
                                placeholder="0.00"
                                autoFocus
                            />
                            {receivedQuantity && parseFloat(receivedQuantity) < confirmingOutbound.quantity_planned_kg && (
                                <p className="mt-2 text-sm text-amber-600 flex items-center gap-1">
                                    <AlertTriangle size={14} />
                                    Kalo: {formatWeight(confirmingOutbound.quantity_planned_kg - parseFloat(receivedQuantity))}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setConfirmingOutbound(null); setReceivedQuantity(''); }}
                                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium"
                            >
                                Odustani
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                <CheckCircle size={18} />
                                Potvrdi
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Cancel Modal */}
            {cancellingOutbound && (
                <Modal
                    open={!!cancellingOutbound}
                    onClose={() => setCancellingOutbound(null)}
                    title="Otkaži izlaz"
                >
                    <div className="space-y-4">
                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                            <p className="text-sm text-amber-800">
                                Da li ste sigurni da želite da otkažete izlaz za <strong>{cancellingOutbound.recipient_name}</strong>?
                            </p>
                            {cancellingOutbound.status === 'sent' && (
                                <p className="text-sm text-amber-700 mt-2">
                                    <strong>{formatWeight(cancellingOutbound.quantity_planned_kg)}</strong> će biti vraćeno u skladište.
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setCancellingOutbound(null)}
                                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium"
                            >
                                Ne, zadrži
                            </button>
                            <button
                                onClick={handleCancel}
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
                            >
                                Da, otkaži
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default OutboundTab;
