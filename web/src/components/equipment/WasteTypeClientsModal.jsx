import { useState, useMemo } from 'react';
import { X, Search, Check, ChevronLeft, ChevronRight, Users, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { RecycleLoader } from '../common';

const ITEMS_PER_PAGE = 20;

/**
 * Modal za bulk upravljanje klijentima kojima je dodeljena vrsta robe
 */
export const WasteTypeClientsModal = ({ wasteType, clients, onClose, onSave }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [saving, setSaving] = useState(false);

    // Inicijalizuj selekciju - ko trenutno ima pristup ovoj vrsti robe
    const [selectedClients, setSelectedClients] = useState(() => {
        return clients
            .filter(client => {
                // null/prazno = sve vrste dozvoljene
                if (!client.allowed_waste_types || client.allowed_waste_types.length === 0) {
                    return true;
                }
                return client.allowed_waste_types.includes(wasteType.id);
            })
            .map(c => c.id);
    });

    // Filtriraj klijente po pretrazi
    const filteredClients = useMemo(() => {
        if (!searchQuery.trim()) return clients;
        const query = searchQuery.toLowerCase();
        return clients.filter(c =>
            c.name?.toLowerCase().includes(query) ||
            c.phone?.includes(query) ||
            c.address?.toLowerCase().includes(query)
        );
    }, [clients, searchQuery]);

    // Paginacija
    const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
    const paginatedClients = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredClients.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredClients, currentPage]);

    // Toggle pojedinačnog klijenta
    const toggleClient = (clientId) => {
        setSelectedClients(prev =>
            prev.includes(clientId)
                ? prev.filter(id => id !== clientId)
                : [...prev, clientId]
        );
    };

    // Selektuj sve na trenutnoj stranici
    const selectAllOnPage = () => {
        const pageClientIds = paginatedClients.map(c => c.id);
        setSelectedClients(prev => {
            const newSet = new Set(prev);
            pageClientIds.forEach(id => newSet.add(id));
            return Array.from(newSet);
        });
    };

    // Deselektuj sve na trenutnoj stranici
    const deselectAllOnPage = () => {
        const pageClientIds = new Set(paginatedClients.map(c => c.id));
        setSelectedClients(prev => prev.filter(id => !pageClientIds.has(id)));
    };

    // Selektuj sve
    const selectAll = () => {
        setSelectedClients(clients.map(c => c.id));
    };

    // Deselektuj sve
    const deselectAll = () => {
        setSelectedClients([]);
    };

    // Sačuvaj promene
    const handleSave = async () => {
        setSaving(true);
        try {
            // Za svakog klijenta treba ažurirati allowed_waste_types
            const updates = clients.map(client => {
                const isSelected = selectedClients.includes(client.id);
                const currentAllowed = client.allowed_waste_types || [];
                const hasAll = currentAllowed.length === 0; // null/prazno = sve

                let newAllowed;

                if (isSelected) {
                    // Klijent treba da ima ovu vrstu
                    if (hasAll) {
                        // Vec ima sve, nista ne menjaj
                        newAllowed = null;
                    } else if (currentAllowed.includes(wasteType.id)) {
                        // Vec ima ovu vrstu
                        newAllowed = currentAllowed;
                    } else {
                        // Dodaj ovu vrstu
                        newAllowed = [...currentAllowed, wasteType.id];
                    }
                } else {
                    // Klijent NE treba da ima ovu vrstu
                    if (hasAll) {
                        // Ima sve, treba da uklonimo samo ovu - postavi sve ostale
                        // Napomena: ovo zahteva da znamo koje sve vrste postoje
                        // Za sada preskacemo ove klijente - oni ce zadrzati sve
                        // Alternativa: proslediti sve waste type IDs
                        newAllowed = null; // TODO: potrebna lista svih waste types
                    } else {
                        // Ukloni ovu vrstu iz liste
                        newAllowed = currentAllowed.filter(id => id !== wasteType.id);
                    }
                }

                return {
                    clientId: client.id,
                    currentAllowed,
                    newAllowed,
                    changed: JSON.stringify(currentAllowed) !== JSON.stringify(newAllowed)
                };
            }).filter(u => u.changed);

            // Pozovi onSave za svaku promenu
            for (const update of updates) {
                await onSave(update.clientId, update.newAllowed);
            }

            toast.success(`Ažurirano ${updates.length} klijenata`);
            onClose();
        } catch (err) {
            toast.error('Greška pri čuvanju: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const allOnPageSelected = paginatedClients.every(c => selectedClients.includes(c.id));
    const someOnPageSelected = paginatedClients.some(c => selectedClients.includes(c.id));

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-slate-50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        {wasteType.customImage ? (
                            <img src={`${wasteType.customImage}${wasteType.customImage.includes('?') ? '&' : '?'}v=${wasteType.updated_at || Date.now()}`} alt={wasteType.label} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                            <span className="text-3xl">{wasteType.icon}</span>
                        )}
                        <div>
                            <h3 className="font-bold text-slate-800">{wasteType.label}</h3>
                            <p className="text-xs text-slate-500">
                                {selectedClients.length} od {clients.length} klijenata ima pristup
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Search & Bulk Actions */}
                <div className="p-4 border-b space-y-3">
                    <div className="relative">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Pretraži klijente..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={selectAll}
                            className="px-3 py-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
                        >
                            Izaberi sve ({clients.length})
                        </button>
                        <button
                            onClick={deselectAll}
                            className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                        >
                            Poništi sve
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                            onClick={allOnPageSelected ? deselectAllOnPage : selectAllOnPage}
                            className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                        >
                            {allOnPageSelected ? 'Poništi stranicu' : 'Izaberi stranicu'}
                        </button>
                    </div>
                </div>

                {/* Client List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {filteredClients.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            <Users size={40} className="mx-auto mb-3 text-slate-300" />
                            <p>Nema klijenata koji odgovaraju pretrazi</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {paginatedClients.map(client => {
                                const isSelected = selectedClients.includes(client.id);
                                return (
                                    <label
                                        key={client.id}
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${isSelected
                                            ? 'bg-emerald-50 border-2 border-emerald-500'
                                            : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleClient(client.id)}
                                            className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                                        />
                                        <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                                            {client.name?.charAt(0) || '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{client.name}</p>
                                            <p className="text-xs text-slate-500 truncate">{client.phone} {client.address && `• ${client.address}`}</p>
                                        </div>
                                        {isSelected && (
                                            <Check size={18} className="text-emerald-600 flex-shrink-0" />
                                        )}
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-4 py-2 border-t flex items-center justify-between text-sm">
                        <span className="text-slate-500">
                            Stranica {currentPage} od {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer Actions */}
                <div className="p-4 border-t flex gap-3 bg-slate-50 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-white font-medium disabled:opacity-50"
                    >
                        Otkaži
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <RecycleLoader size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                        Sačuvaj ({selectedClients.length} klijenata)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WasteTypeClientsModal;
