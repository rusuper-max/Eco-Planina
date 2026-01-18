import { useState, useMemo } from 'react';
import { Search, CheckCircle2, Circle, Users, Package, Plus, Minus, X, AlertTriangle } from 'lucide-react';
import { Modal, RecycleLoader } from '../common';

/**
 * BulkWasteTypeModal - Bulk assign/remove waste types to multiple clients
 * Enterprise feature for managing 1000s of clients efficiently
 */
export const BulkWasteTypeModal = ({ open, onClose, wasteTypes = [], clients = [], onBulkUpdate }) => {
    const [selectedWasteTypes, setSelectedWasteTypes] = useState([]);
    const [selectedClients, setSelectedClients] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState('add'); // 'add' or 'remove'

    // Filter clients by search
    const filteredClients = useMemo(() => {
        if (!searchQuery) return clients;
        const q = searchQuery.toLowerCase();
        return clients.filter(c =>
            c.name?.toLowerCase().includes(q) ||
            c.phone?.includes(q) ||
            c.address?.toLowerCase().includes(q)
        );
    }, [clients, searchQuery]);

    // Toggle waste type selection
    const toggleWasteType = (wtId) => {
        setSelectedWasteTypes(prev =>
            prev.includes(wtId) ? prev.filter(id => id !== wtId) : [...prev, wtId]
        );
    };

    // Toggle client selection
    const toggleClient = (clientId) => {
        setSelectedClients(prev =>
            prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]
        );
    };

    // Select/deselect all filtered clients
    const toggleAllClients = () => {
        const filteredIds = filteredClients.map(c => c.id);
        const allSelected = filteredIds.every(id => selectedClients.includes(id));

        if (allSelected) {
            // Deselect all filtered
            setSelectedClients(prev => prev.filter(id => !filteredIds.includes(id)));
        } else {
            // Select all filtered (merge with existing selection)
            setSelectedClients(prev => [...new Set([...prev, ...filteredIds])]);
        }
    };

    // Select/deselect all waste types
    const toggleAllWasteTypes = () => {
        const allIds = wasteTypes.map(wt => wt.id);
        const allSelected = allIds.every(id => selectedWasteTypes.includes(id));
        setSelectedWasteTypes(allSelected ? [] : allIds);
    };

    // Check if client has all selected waste types
    const clientHasWasteTypes = (client, wtIds) => {
        if (!client.allowed_waste_types || client.allowed_waste_types.length === 0) {
            return true; // Has all (no restrictions)
        }
        return wtIds.every(id => client.allowed_waste_types.includes(id));
    };

    // Handle bulk update
    const handleApply = async () => {
        if (selectedWasteTypes.length === 0 || selectedClients.length === 0) return;

        setLoading(true);
        try {
            await onBulkUpdate({
                mode,
                wasteTypeIds: selectedWasteTypes,
                clientIds: selectedClients
            });

            // Reset and close
            setSelectedWasteTypes([]);
            setSelectedClients([]);
            setSearchQuery('');
            onClose();
        } catch (err) {
            console.error('Bulk update error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Reset on close
    const handleClose = () => {
        setSelectedWasteTypes([]);
        setSelectedClients([]);
        setSearchQuery('');
        setMode('add');
        onClose();
    };

    const allFilteredSelected = filteredClients.length > 0 &&
        filteredClients.every(c => selectedClients.includes(c.id));

    return (
        <Modal open={open} onClose={handleClose} title="Grupno dodeljivanje robe">
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Mode Toggle */}
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                        onClick={() => setMode('add')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors ${mode === 'add'
                            ? 'bg-emerald-600 text-white shadow'
                            : 'text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        <Plus size={16} />
                        Dodaj robu
                    </button>
                    <button
                        onClick={() => setMode('remove')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors ${mode === 'remove'
                            ? 'bg-red-600 text-white shadow'
                            : 'text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        <Minus size={16} />
                        Ukloni robu
                    </button>
                </div>

                {/* Waste Types Selection */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700">
                            1. Odaberi vrste robe
                        </label>
                        <button
                            onClick={toggleAllWasteTypes}
                            className="text-xs text-emerald-600 hover:text-emerald-700"
                        >
                            {selectedWasteTypes.length === wasteTypes.length ? 'Poništi sve' : 'Odaberi sve'}
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl">
                        {wasteTypes.map(wt => {
                            const isSelected = selectedWasteTypes.includes(wt.id);
                            return (
                                <button
                                    key={wt.id}
                                    onClick={() => toggleWasteType(wt.id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${isSelected
                                        ? mode === 'add'
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                            : 'border-red-500 bg-red-50 text-red-700'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    {wt.customImage ? (
                                        <img src={wt.customImage} alt="" className="w-5 h-5 object-cover rounded" />
                                    ) : (
                                        <span>{wt.icon}</span>
                                    )}
                                    <span>{wt.label}</span>
                                    {isSelected && <CheckCircle2 size={14} />}
                                </button>
                            );
                        })}
                    </div>
                    {selectedWasteTypes.length > 0 && (
                        <p className="text-xs text-slate-500">
                            Odabrano: {selectedWasteTypes.length} od {wasteTypes.length} vrsta
                        </p>
                    )}
                </div>

                {/* Clients Selection */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700">
                            2. Odaberi klijente
                        </label>
                        <span className="text-xs text-slate-500">
                            {selectedClients.length} odabrano
                        </span>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Pretraži klijente..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm"
                        />
                    </div>

                    {/* Select All Button */}
                    <button
                        onClick={toggleAllClients}
                        className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 flex items-center justify-center gap-2"
                    >
                        {allFilteredSelected ? (
                            <>
                                <X size={14} />
                                Poništi sve prikazane ({filteredClients.length})
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={14} />
                                Odaberi sve prikazane ({filteredClients.length})
                            </>
                        )}
                    </button>

                    {/* Client List */}
                    <div className="max-h-48 overflow-y-auto space-y-1 p-2 border border-slate-200 rounded-xl">
                        {filteredClients.length === 0 ? (
                            <p className="text-center text-sm text-slate-500 py-4">
                                Nema klijenata koji odgovaraju pretrazi
                            </p>
                        ) : (
                            filteredClients.map(client => {
                                const isSelected = selectedClients.includes(client.id);
                                const hasTypes = clientHasWasteTypes(client, selectedWasteTypes);

                                return (
                                    <button
                                        key={client.id}
                                        onClick={() => toggleClient(client.id)}
                                        className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${isSelected
                                            ? 'bg-emerald-50 border border-emerald-200'
                                            : 'hover:bg-slate-50 border border-transparent'
                                            }`}
                                    >
                                        {isSelected ? (
                                            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                                        ) : (
                                            <Circle size={18} className="text-slate-300 shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-slate-800 truncate">
                                                {client.name}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate">
                                                {client.address || client.phone || 'Nema adrese'}
                                            </p>
                                        </div>
                                        {mode === 'add' && hasTypes && selectedWasteTypes.length > 0 && (
                                            <span className="text-xs text-emerald-600 shrink-0">✓ ima</span>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Warning for large operations */}
                {selectedClients.length > 100 && (
                    <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800">
                            Selektovali ste <strong>{selectedClients.length} klijenata</strong>.
                            Ova operacija može potrajati nekoliko sekundi.
                        </p>
                    </div>
                )}

                {/* Apply Button */}
                <button
                    onClick={handleApply}
                    disabled={loading || selectedWasteTypes.length === 0 || selectedClients.length === 0}
                    className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${mode === 'add'
                        ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white'
                        : 'bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white'
                        }`}
                >
                    {loading ? (
                        <>
                            <RecycleLoader size={18} className="text-white" />
                            Ažuriram...
                        </>
                    ) : (
                        <>
                            {mode === 'add' ? <Plus size={18} /> : <Minus size={18} />}
                            {mode === 'add' ? 'Dodaj' : 'Ukloni'} {selectedWasteTypes.length} {selectedWasteTypes.length === 1 ? 'vrstu' : 'vrste'} za {selectedClients.length} {selectedClients.length === 1 ? 'klijenta' : 'klijenata'}
                        </>
                    )}
                </button>
            </div>
        </Modal>
    );
};

export default BulkWasteTypeModal;
