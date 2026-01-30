import { useState } from 'react';
import { Scale, Plus, Minus, AlertTriangle } from 'lucide-react';
import { Modal, RecycleLoader } from '../common';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

/**
 * AdjustmentModal - Modal za ručnu korekciju stanja inventara
 */
export const AdjustmentModal = ({
    inventories = [],
    wasteTypes = [],
    inventoryItems = [],
    onClose,
    onSave
}) => {
    const { user } = useAuth();
    const { createInventoryAdjustment } = useData();

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        inventory_id: '',
        waste_type_id: '',
        adjustment_type: 'add', // add, remove, set
        quantity_kg: '',
        reason: ''
    });

    // Get current quantity for selected item
    const currentItem = inventoryItems.find(
        item => item.inventory_id === formData.inventory_id &&
                item.waste_type_id === formData.waste_type_id
    );
    const currentQty = currentItem ? parseFloat(currentItem.quantity_kg) || 0 : 0;

    // Calculate new quantity
    const getNewQuantity = () => {
        const qty = parseFloat(formData.quantity_kg) || 0;
        switch (formData.adjustment_type) {
            case 'add':
                return currentQty + qty;
            case 'remove':
                return Math.max(0, currentQty - qty);
            case 'set':
                return qty;
            default:
                return currentQty;
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.inventory_id) {
            toast.error('Izaberite skladište');
            return;
        }
        if (!formData.waste_type_id) {
            toast.error('Izaberite vrstu robe');
            return;
        }
        if (!formData.quantity_kg || parseFloat(formData.quantity_kg) <= 0) {
            toast.error('Unesite količinu');
            return;
        }
        if (!formData.reason.trim()) {
            toast.error('Unesite razlog korekcije');
            return;
        }

        const newQty = getNewQuantity();
        if (newQty < 0) {
            toast.error('Količina ne može biti negativna');
            return;
        }

        setLoading(true);
        try {
            await createInventoryAdjustment({
                inventory_id: formData.inventory_id,
                waste_type_id: formData.waste_type_id,
                adjustment_type: formData.adjustment_type,
                quantity_kg: parseFloat(formData.quantity_kg),
                new_quantity_kg: newQty,
                reason: formData.reason,
                created_by: user?.id,
                region_id: user?.region_id // Track which region made the adjustment
            });

            toast.success('Korekcija uspešno izvršena');
            onSave?.();
            onClose();
        } catch (err) {
            toast.error('Greška: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const adjustmentTypes = [
        { id: 'add', label: 'Dodaj', icon: Plus, color: 'emerald' },
        { id: 'remove', label: 'Oduzmi', icon: Minus, color: 'red' },
        { id: 'set', label: 'Postavi na', icon: Scale, color: 'blue' }
    ];

    return (
        <Modal open={true} onClose={onClose} title="Korekcija stanja">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Warehouse */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Skladište *
                    </label>
                    <select
                        value={formData.inventory_id}
                        onChange={(e) => handleChange('inventory_id', e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        required
                    >
                        <option value="">Izaberite skladište</option>
                        {inventories.map(inv => (
                            <option key={inv.id} value={inv.id}>{inv.name}</option>
                        ))}
                    </select>
                </div>

                {/* Waste Type */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Vrsta robe *
                    </label>
                    <select
                        value={formData.waste_type_id}
                        onChange={(e) => handleChange('waste_type_id', e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        required
                    >
                        <option value="">Izaberite vrstu</option>
                        {wasteTypes.map(wt => (
                            <option key={wt.id} value={wt.id}>
                                {wt.icon} {wt.label || wt.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Current quantity info */}
                {formData.inventory_id && formData.waste_type_id && (
                    <div className="p-3 bg-slate-50 rounded-xl">
                        <p className="text-sm text-slate-600">
                            Trenutno stanje: <strong className="text-slate-800">
                                {currentQty.toFixed(2)} kg
                            </strong>
                        </p>
                    </div>
                )}

                {/* Adjustment Type */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Tip korekcije *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {adjustmentTypes.map(type => {
                            const Icon = type.icon;
                            const isSelected = formData.adjustment_type === type.id;
                            const colorClasses = {
                                emerald: isSelected ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 hover:border-emerald-300',
                                red: isSelected ? 'bg-red-600 text-white border-red-600' : 'border-slate-200 hover:border-red-300',
                                blue: isSelected ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 hover:border-blue-300'
                            };
                            return (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => handleChange('adjustment_type', type.id)}
                                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${colorClasses[type.color]}`}
                                >
                                    <Icon size={16} />
                                    {type.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Quantity */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Količina (kg) *
                    </label>
                    <div className="relative">
                        <Scale size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.quantity_kg}
                            onChange={(e) => handleChange('quantity_kg', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            placeholder="0.00"
                            required
                        />
                    </div>
                </div>

                {/* Preview new quantity */}
                {formData.quantity_kg && formData.inventory_id && formData.waste_type_id && (
                    <div className={`p-3 rounded-xl border ${
                        formData.adjustment_type === 'add' ? 'bg-emerald-50 border-emerald-200' :
                        formData.adjustment_type === 'remove' ? 'bg-red-50 border-red-200' :
                        'bg-blue-50 border-blue-200'
                    }`}>
                        <p className="text-sm">
                            Novo stanje: <strong className={
                                formData.adjustment_type === 'add' ? 'text-emerald-700' :
                                formData.adjustment_type === 'remove' ? 'text-red-700' :
                                'text-blue-700'
                            }>
                                {getNewQuantity().toFixed(2)} kg
                            </strong>
                        </p>
                    </div>
                )}

                {/* Reason */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Razlog korekcije *
                    </label>
                    <textarea
                        value={formData.reason}
                        onChange={(e) => handleChange('reason', e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                        rows={3}
                        placeholder="npr. Korekcija nakon fizičkog brojanja, greška pri merenju..."
                        required
                    />
                </div>

                {/* Warning */}
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2">
                    <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                        Ova akcija će biti zabeležena u istoriji transakcija i ne može se poništiti.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium"
                    >
                        Odustani
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <RecycleLoader size={18} className="animate-spin" />
                        ) : (
                            <Scale size={18} />
                        )}
                        Izvrši korekciju
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AdjustmentModal;
