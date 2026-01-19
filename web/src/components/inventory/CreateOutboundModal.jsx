import { useState, useMemo } from 'react';
import {
    ArrowUpFromLine, Building2, Package, Scale, MapPin,
    Phone, Banknote, FileText, AlertTriangle, X, PackagePlus
} from 'lucide-react';
import { Modal } from '../common';
import toast from 'react-hot-toast';

/**
 * CreateOutboundModal - Modal za kreiranje novog izlaza
 * Wide horizontal layout for desktop
 */
export const CreateOutboundModal = ({
    inventories = [],
    wasteTypes = [],
    inventoryItems = [],
    onClose,
    onSave
}) => {
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        inventory_id: inventories[0]?.id || '',
        waste_type_id: '',
        quantity_kg: '',
        recipient_name: '',
        recipient_address: '',
        recipient_contact: '',
        price_per_kg: '',
        notes: ''
    });

    // Get available waste types for selected inventory (those with stock)
    const availableWasteTypes = useMemo(() => {
        if (!formData.inventory_id) return [];

        const itemsInInventory = inventoryItems.filter(
            item => item.inventory_id === formData.inventory_id && parseFloat(item.quantity_kg) > 0
        );

        return itemsInInventory.map(item => ({
            ...item.waste_type,
            available_kg: parseFloat(item.quantity_kg)
        }));
    }, [formData.inventory_id, inventoryItems]);

    // Get current stock for selected waste type
    const currentStock = useMemo(() => {
        if (!formData.waste_type_id || !formData.inventory_id) return 0;

        const item = inventoryItems.find(
            i => i.inventory_id === formData.inventory_id && i.waste_type_id === formData.waste_type_id
        );
        return item ? parseFloat(item.quantity_kg) : 0;
    }, [formData.inventory_id, formData.waste_type_id, inventoryItems]);

    // Validate quantity
    const quantityError = useMemo(() => {
        const qty = parseFloat(formData.quantity_kg);
        if (!qty) return null;
        if (qty <= 0) return 'Količina mora biti veća od 0';
        if (qty > currentStock) return `Nedovoljno na stanju (dostupno: ${currentStock.toFixed(2)} kg)`;
        return null;
    }, [formData.quantity_kg, currentStock]);

    // Format weight
    const formatWeight = (kg) => {
        if (!kg) return '0 kg';
        if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
        return `${parseFloat(kg).toFixed(1)} kg`;
    };

    // Handle input change
    const handleChange = (field, value) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };

            // Reset waste_type when inventory changes
            if (field === 'inventory_id') {
                updated.waste_type_id = '';
                updated.quantity_kg = '';
            }

            return updated;
        });
    };

    // Fill all available quantity
    const handleFillAll = () => {
        if (currentStock > 0) {
            handleChange('quantity_kg', currentStock.toString());
        }
    };

    // Handle submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.inventory_id) {
            toast.error('Izaberite skladište');
            return;
        }
        if (!formData.waste_type_id) {
            toast.error('Izaberite vrstu otpada');
            return;
        }
        if (!formData.quantity_kg || parseFloat(formData.quantity_kg) <= 0) {
            toast.error('Unesite validnu količinu');
            return;
        }
        if (quantityError) {
            toast.error(quantityError);
            return;
        }
        if (!formData.recipient_name?.trim()) {
            toast.error('Unesite naziv primaoca');
            return;
        }

        setSaving(true);
        try {
            await onSave({
                inventory_id: formData.inventory_id,
                waste_type_id: formData.waste_type_id,
                quantity_kg: parseFloat(formData.quantity_kg),
                recipient_name: formData.recipient_name.trim(),
                recipient_address: formData.recipient_address?.trim() || null,
                recipient_contact: formData.recipient_contact?.trim() || null,
                price_per_kg: formData.price_per_kg ? parseFloat(formData.price_per_kg) : null,
                notes: formData.notes?.trim() || null
            });
            toast.success('Izlaz kreiran');
        } catch (err) {
            toast.error(err.message || 'Greška pri kreiranju');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={true}
            onClose={onClose}
            title="Novi izlaz"
            size="xl"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Top row - Inventory, Waste Type, Quantity */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Skladište *
                        </label>
                        <select
                            value={formData.inventory_id}
                            onChange={(e) => handleChange('inventory_id', e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white"
                            required
                        >
                            <option value="">Izaberite skladište</option>
                            {inventories.map(inv => (
                                <option key={inv.id} value={inv.id}>{inv.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Vrsta otpada *
                        </label>
                        <select
                            value={formData.waste_type_id}
                            onChange={(e) => handleChange('waste_type_id', e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white"
                            required
                            disabled={!formData.inventory_id}
                        >
                            <option value="">Izaberite vrstu</option>
                            {availableWasteTypes.map(wt => (
                                <option key={wt.id} value={wt.id}>
                                    {wt.icon} {wt.label || wt.name} ({formatWeight(wt.available_kg)})
                                </option>
                            ))}
                        </select>
                        {formData.inventory_id && availableWasteTypes.length === 0 && (
                            <p className="mt-1 text-sm text-amber-600">
                                Nema zaliha u ovom skladištu
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Količina (kg) *
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.quantity_kg}
                                    onChange={(e) => handleChange('quantity_kg', e.target.value)}
                                    className={`w-full px-4 py-2.5 border rounded-xl pr-12 ${
                                        quantityError ? 'border-red-300 bg-red-50' : 'border-slate-200'
                                    }`}
                                    placeholder="0.00"
                                    required
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                                    kg
                                </div>
                            </div>
                            {currentStock > 0 && (
                                <button
                                    type="button"
                                    onClick={handleFillAll}
                                    className="px-3 py-2.5 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-200 whitespace-nowrap flex items-center gap-1"
                                    title={`Dodaj sve: ${formatWeight(currentStock)}`}
                                >
                                    <PackagePlus size={16} />
                                    Sve
                                </button>
                            )}
                        </div>
                        {currentStock > 0 && (
                            <p className="mt-1 text-sm text-slate-500">
                                Na stanju: <span className="font-medium text-emerald-600">{formatWeight(currentStock)}</span>
                            </p>
                        )}
                        {quantityError && (
                            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                <AlertTriangle size={14} />
                                {quantityError}
                            </p>
                        )}
                    </div>
                </div>

                {/* Middle row - Recipient info in horizontal layout */}
                <div className="p-4 bg-slate-50 rounded-xl">
                    <h4 className="font-medium text-slate-700 flex items-center gap-2 mb-3">
                        <Building2 size={16} />
                        Primalac
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Naziv firme *
                            </label>
                            <input
                                type="text"
                                value={formData.recipient_name}
                                onChange={(e) => handleChange('recipient_name', e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl"
                                placeholder="npr. EkoReciklaža d.o.o."
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                <MapPin size={14} className="inline mr-1" />
                                Adresa (opciono)
                            </label>
                            <input
                                type="text"
                                value={formData.recipient_address}
                                onChange={(e) => handleChange('recipient_address', e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl"
                                placeholder="Adresa primaoca"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                <Phone size={14} className="inline mr-1" />
                                Kontakt (opciono)
                            </label>
                            <input
                                type="text"
                                value={formData.recipient_contact}
                                onChange={(e) => handleChange('recipient_contact', e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl"
                                placeholder="Telefon ili email"
                            />
                        </div>
                    </div>
                </div>

                {/* Bottom row - Price and Notes side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            <Banknote size={14} className="inline mr-1" />
                            Cena po kg (opciono)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.price_per_kg}
                                onChange={(e) => handleChange('price_per_kg', e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl pr-20"
                                placeholder="0.00"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                                RSD/kg
                            </div>
                        </div>
                        {formData.price_per_kg && formData.quantity_kg && (
                            <p className="mt-1 text-sm text-slate-500">
                                Ukupno: <span className="font-medium text-emerald-600">
                                    {(parseFloat(formData.price_per_kg) * parseFloat(formData.quantity_kg)).toLocaleString('sr-RS')} RSD
                                </span>
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            <FileText size={14} className="inline mr-1" />
                            Napomena (opciono)
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl resize-none"
                            rows={2}
                            placeholder="Dodatne informacije..."
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium"
                    >
                        Odustani
                    </button>
                    <button
                        type="submit"
                        disabled={saving || !!quantityError}
                        className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                        <ArrowUpFromLine size={18} />
                        {saving ? 'Kreiranje...' : 'Kreiraj izlaz'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateOutboundModal;
