import { useState, useMemo } from 'react';
import { Search, CheckCircle2, Circle, Package, Plus, Minus, X, AlertTriangle, Users } from 'lucide-react';
import { RecycleLoader } from '../common';

/**
 * BulkWasteTypeModal - Bulk assign/remove waste types to multiple clients
 * Wide split-panel layout for desktop
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
            setSelectedClients(prev => prev.filter(id => !filteredIds.includes(id)));
        } else {
            setSelectedClients(prev => [...new Set([...prev, ...filteredIds])]);
        }
    };

    // Select/deselect all waste types
    const toggleAllWasteTypes = () => {
        const allIds = wasteTypes.map(wt => wt.id);
        const allSelected = allIds.every(id => selectedWasteTypes.includes(id));
        setSelectedWasteTypes(allSelected ? [] : allIds);
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

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={handleClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b">
                    <h2 className="text-xl font-bold text-slate-800">Grupno dodeljivanje robe</h2>
                    <div className="flex items-center gap-3">
                        {/* Mode Toggle */}
                        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                            <button
                                onClick={() => setMode('add')}
                                className={`px-3 py-1.5 rounded-md font-medium text-sm flex items-center gap-1.5 transition-colors ${mode === 'add'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                <Plus size={14} />
                                Dodaj
                            </button>
                            <button
                                onClick={() => setMode('remove')}
                                className={`px-3 py-1.5 rounded-md font-medium text-sm flex items-center gap-1.5 transition-colors ${mode === 'remove'
                                    ? 'bg-red-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                <Minus size={14} />
                                Ukloni
                            </button>
                        </div>
                        <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg">
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>
                </div>

                {/* Split Panel Content */}
                <div className="flex-1 flex min-h-0">
                    {/* Left Panel - Waste Types */}
                    <div className="w-2/5 border-r p-5 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Package size={18} className="text-emerald-600" />
                                <h3 className="font-semibold text-slate-800">Vrste robe</h3>
                            </div>
                            <button
                                onClick={toggleAllWasteTypes}
                                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                            >
                                {selectedWasteTypes.length === wasteTypes.length ? 'Poništi' : 'Odaberi sve'}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-2">
                                {wasteTypes.map(wt => {
                                    const isSelected = selectedWasteTypes.includes(wt.id);
                                    return (
                                        <button
                                            key={wt.id}
                                            onClick={() => toggleWasteType(wt.id)}
                                            className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${isSelected
                                                ? mode === 'add'
                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                    : 'border-red-500 bg-red-50 text-red-700'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            {wt.customImage ? (
                                                <img src={wt.customImage} alt="" className="w-6 h-6 object-cover rounded" />
                                            ) : (
                                                <span className="text-lg">{wt.icon}</span>
                                            )}
                                            <span className="flex-1 truncate">{wt.label}</span>
                                            {isSelected && <CheckCircle2 size={16} className="shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {selectedWasteTypes.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                                <p className="text-sm text-slate-600">
                                    Odabrano: <strong className={mode === 'add' ? 'text-emerald-600' : 'text-red-600'}>
                                        {selectedWasteTypes.length}
                                    </strong> od {wasteTypes.length} vrsta
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Right Panel - Clients */}
                    <div className="flex-1 p-5 flex flex-col min-w-0">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Users size={18} className="text-blue-600" />
                                <h3 className="font-semibold text-slate-800">Klijenti</h3>
                            </div>
                            <span className="text-sm text-slate-500">
                                {selectedClients.length > 0 && (
                                    <span className="font-medium text-emerald-600">{selectedClients.length} odabrano</span>
                                )}
                            </span>
                        </div>

                        {/* Search & Select All */}
                        <div className="flex gap-2 mb-3">
                            <div className="relative flex-1">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Pretraži klijente..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={toggleAllClients}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${allFilteredSelected
                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                {allFilteredSelected ? 'Poništi' : 'Sve'} ({filteredClients.length})
                            </button>
                        </div>

                        {/* Client List */}
                        <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
                            {filteredClients.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-slate-400">
                                    <p>Nema klijenata</p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {filteredClients.map(client => {
                                        const isSelected = selectedClients.includes(client.id);
                                        return (
                                            <button
                                                key={client.id}
                                                onClick={() => toggleClient(client.id)}
                                                className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${isSelected
                                                    ? 'bg-emerald-50'
                                                    : 'hover:bg-slate-50'
                                                }`}
                                            >
                                                {isSelected ? (
                                                    <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                                                ) : (
                                                    <Circle size={20} className="text-slate-300 shrink-0" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-slate-800 truncate">{client.name}</p>
                                                    <p className="text-sm text-slate-500 truncate">
                                                        {client.address || client.phone || 'Nema adrese'}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Warning for large operations */}
                        {selectedClients.length > 100 && (
                            <div className="flex items-center gap-2 mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                                <p className="text-xs text-amber-800">
                                    <strong>{selectedClients.length}</strong> klijenata - operacija može potrajati
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t bg-slate-50 rounded-b-2xl">
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
                                <RecycleLoader size={18} />
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
            </div>
        </div>
    );
};

export default BulkWasteTypeModal;
