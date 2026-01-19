import { useState } from 'react';
import { Warehouse, Eye, EyeOff } from 'lucide-react';
import { Modal } from '../common';

/**
 * InventoryModal - Create/Edit inventory (warehouse)
 */
export const InventoryModal = ({ inventory, onClose, onSave }) => {
    const [name, setName] = useState(inventory?.name || '');
    const [description, setDescription] = useState(inventory?.description || '');
    const [managerVisibility, setManagerVisibility] = useState(inventory?.manager_visibility || 'full');
    const [saving, setSaving] = useState(false);

    const isEdit = !!inventory;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setSaving(true);
        try {
            await onSave({
                name: name.trim(),
                description: description.trim(),
                manager_visibility: managerVisibility
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={true}
            onClose={onClose}
            title={isEdit ? 'Izmeni skladište' : 'Novo skladište'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Naziv skladišta *
                    </label>
                    <div className="relative">
                        <Warehouse size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="npr. Centralno skladište"
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                            required
                            autoFocus
                        />
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Opis (opciono)
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Kratak opis lokacije ili namene skladišta..."
                        rows={2}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
                    />
                </div>

                {/* Manager Visibility */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Vidljivost za menadžere
                    </label>
                    <div className="space-y-2">
                        <label
                            className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                                managerVisibility === 'full'
                                    ? 'border-emerald-500 bg-emerald-50'
                                    : 'border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <input
                                type="radio"
                                name="visibility"
                                value="full"
                                checked={managerVisibility === 'full'}
                                onChange={(e) => setManagerVisibility(e.target.value)}
                                className="mt-1"
                            />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <Eye size={16} className="text-emerald-600" />
                                    <span className="font-medium">Puna vidljivost</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Menadžeri vide ukupno stanje skladišta + doprinos svoje filijale
                                </p>
                            </div>
                        </label>

                        <label
                            className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                                managerVisibility === 'own_only'
                                    ? 'border-emerald-500 bg-emerald-50'
                                    : 'border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <input
                                type="radio"
                                name="visibility"
                                value="own_only"
                                checked={managerVisibility === 'own_only'}
                                onChange={(e) => setManagerVisibility(e.target.value)}
                                className="mt-1"
                            />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <EyeOff size={16} className="text-amber-600" />
                                    <span className="font-medium">Samo svoj doprinos</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Menadžeri vide samo doprinos svoje filijale, ne celo skladište
                                </p>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Info box */}
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs text-blue-700">
                        <strong>Napomena:</strong> Nakon kreiranja skladišta, potrebno je dodeliti regione
                        tom skladištu kroz stranicu Regioni. Samo zahtevi iz dodeljenih regiona će se računati
                        u ovo skladište.
                    </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium"
                        disabled={saving}
                    >
                        Odustani
                    </button>
                    <button
                        type="submit"
                        className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold disabled:opacity-50"
                        disabled={saving || !name.trim()}
                    >
                        {saving ? 'Čuvanje...' : isEdit ? 'Sačuvaj' : 'Kreiraj'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default InventoryModal;
