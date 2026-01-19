import { useState, useEffect } from 'react';
import { Warehouse, Eye, EyeOff, MapPin, Check, X } from 'lucide-react';
import { Modal } from '../common';

/**
 * InventoryModal - Create/Edit inventory (warehouse)
 * @param {Object} inventory - Existing inventory for edit mode
 * @param {Array} regions - All company regions
 * @param {Array} assignedRegionIds - Region IDs already assigned to this inventory
 * @param {Function} onClose - Close modal handler
 * @param {Function} onSave - Save handler (receives {data, selectedRegionIds})
 */
export const InventoryModal = ({ inventory, regions = [], assignedRegionIds = [], onClose, onSave }) => {
    const [name, setName] = useState(inventory?.name || '');
    const [description, setDescription] = useState(inventory?.description || '');
    const [managerVisibility, setManagerVisibility] = useState(inventory?.manager_visibility || 'full');
    const [selectedRegions, setSelectedRegions] = useState(new Set(assignedRegionIds));
    const [saving, setSaving] = useState(false);

    const isEdit = !!inventory;

    // Update selected regions when assignedRegionIds changes
    useEffect(() => {
        setSelectedRegions(new Set(assignedRegionIds));
    }, [assignedRegionIds]);

    const toggleRegion = (regionId) => {
        setSelectedRegions(prev => {
            const next = new Set(prev);
            if (next.has(regionId)) {
                next.delete(regionId);
            } else {
                next.add(regionId);
            }
            return next;
        });
    };

    const toggleAllRegions = () => {
        if (selectedRegions.size === regions.length) {
            setSelectedRegions(new Set());
        } else {
            setSelectedRegions(new Set(regions.map(r => r.id)));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setSaving(true);
        try {
            await onSave({
                data: {
                    name: name.trim(),
                    description: description.trim(),
                    manager_visibility: managerVisibility
                },
                selectedRegionIds: Array.from(selectedRegions)
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

                {/* Regions Selection */}
                {regions.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-slate-700">
                                Filijale koje pripadaju skladištu
                            </label>
                            <button
                                type="button"
                                onClick={toggleAllRegions}
                                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                            >
                                {selectedRegions.size === regions.length ? 'Odznači sve' : 'Označi sve'}
                            </button>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3">
                            {regions.map(region => (
                                <label
                                    key={region.id}
                                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                        selectedRegions.has(region.id)
                                            ? 'bg-emerald-50 border border-emerald-200'
                                            : 'hover:bg-slate-50 border border-transparent'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedRegions.has(region.id)}
                                        onChange={() => toggleRegion(region.id)}
                                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <MapPin size={16} className={selectedRegions.has(region.id) ? 'text-emerald-600' : 'text-slate-400'} />
                                    <span className={selectedRegions.has(region.id) ? 'text-emerald-700 font-medium' : 'text-slate-700'}>
                                        {region.name}
                                    </span>
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Izabrano: {selectedRegions.size} od {regions.length} filijala
                        </p>
                    </div>
                )}

                {/* Info box - only show if no regions */}
                {regions.length === 0 && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                        <p className="text-xs text-amber-700">
                            <strong>Napomena:</strong> Nema kreiranih filijala. Prvo kreirajte filijale kroz
                            Podešavanja → Filijale, zatim ih možete dodeliti ovom skladištu.
                        </p>
                    </div>
                )}

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
