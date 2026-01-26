import { useState, useEffect } from 'react';
import { Fuel, Truck, Calendar, DollarSign, Gauge, Upload, MapPin } from 'lucide-react';
import { Modal, RecycleLoader } from '../common';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

/**
 * AddFuelLogModal - Modal za dodavanje/izmenu zapisa o gorivu
 */
export const AddFuelLogModal = ({ log = null, vehicles = [], onClose, onSave }) => {
    const { user, companyCode } = useAuth();
    const { createFuelLog, updateFuelLog, uploadFuelReceipt, fetchCompanyMembers } = useData();

    const [loading, setLoading] = useState(false);
    const [drivers, setDrivers] = useState([]);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        vehicle_id: log?.vehicle_id || '',
        driver_id: log?.driver_id || user?.id || '',
        date: log?.date || new Date().toISOString().split('T')[0],
        liters: log?.liters || '',
        price_per_liter: log?.price_per_liter || '',
        odometer_km: log?.odometer_km || '',
        gas_station: log?.gas_station || '',
        fuel_type: log?.fuel_type || 'diesel',
        notes: log?.notes || '',
        receipt_image_url: log?.receipt_image_url || ''
    });

    const isEditing = !!log;

    useEffect(() => {
        loadDrivers();
    }, []);

    const loadDrivers = async () => {
        try {
            const members = await fetchCompanyMembers();
            const driversList = members.filter(m => m.role === 'driver');
            setDrivers(driversList);
        } catch (err) {
            console.error('Error loading drivers:', err);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            toast.error('Samo slike su dozvoljene');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Maksimalna veličina je 5MB');
            return;
        }

        setUploadingImage(true);
        try {
            // If editing, upload to existing log
            if (isEditing && log.id) {
                const url = await uploadFuelReceipt(file, log.id);
                handleChange('receipt_image_url', url);
            } else {
                // For new logs, store file temporarily and upload after save
                // Convert to base64 for preview
                const reader = new FileReader();
                reader.onload = () => {
                    handleChange('receipt_image_url', reader.result);
                    handleChange('_pendingFile', file);
                };
                reader.readAsDataURL(file);
            }
            toast.success('Slika učitana');
        } catch (err) {
            toast.error('Greška pri upload-u: ' + err.message);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.vehicle_id) {
            toast.error('Izaberite vozilo');
            return;
        }
        if (!formData.liters || parseFloat(formData.liters) <= 0) {
            toast.error('Unesite količinu goriva');
            return;
        }

        setLoading(true);
        try {
            const dataToSave = {
                vehicle_id: formData.vehicle_id,
                driver_id: formData.driver_id || null,
                company_code: companyCode,
                date: formData.date,
                liters: parseFloat(formData.liters),
                price_per_liter: formData.price_per_liter ? parseFloat(formData.price_per_liter) : null,
                total_price: formData.liters && formData.price_per_liter
                    ? parseFloat(formData.liters) * parseFloat(formData.price_per_liter)
                    : null,
                odometer_km: formData.odometer_km ? parseInt(formData.odometer_km) : null,
                gas_station: formData.gas_station || null,
                fuel_type: formData.fuel_type,
                notes: formData.notes || null,
                created_by: user?.id
            };

            if (isEditing) {
                await updateFuelLog(log.id, dataToSave);
                toast.success('Zapis ažuriran');
            } else {
                const newLog = await createFuelLog(dataToSave);

                // Upload pending image if exists
                if (formData._pendingFile && newLog?.id) {
                    await uploadFuelReceipt(formData._pendingFile, newLog.id);
                }

                toast.success('Zapis dodat');
            }

            onSave();
        } catch (err) {
            toast.error('Greška: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const fuelTypes = [
        { id: 'diesel', label: 'Dizel' },
        { id: 'petrol', label: 'Benzin' },
        { id: 'lpg', label: 'TNG' },
        { id: 'electric', label: 'Struja' }
    ];

    return (
        <Modal
            open={true}
            onClose={onClose}
            title={isEditing ? 'Izmeni zapis' : 'Novo točenje goriva'}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Row 1: Vehicle, Driver, Date */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Vozilo *
                        </label>
                        <select
                            value={formData.vehicle_id}
                            onChange={(e) => handleChange('vehicle_id', e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            required
                        >
                            <option value="">Izaberite vozilo</option>
                            {vehicles.map(v => (
                                <option key={v.id} value={v.id}>
                                    {v.registration} - {v.brand} {v.model}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Vozač
                        </label>
                        <select
                            value={formData.driver_id}
                            onChange={(e) => handleChange('driver_id', e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        >
                            <option value="">Nije specificirano</option>
                            {drivers.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Datum
                        </label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => handleChange('date', e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                    </div>
                </div>

                {/* Row 2: Fuel type */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Tip goriva
                    </label>
                    <div className="flex gap-2">
                        {fuelTypes.map(ft => (
                            <button
                                key={ft.id}
                                type="button"
                                onClick={() => handleChange('fuel_type', ft.id)}
                                className={`flex-1 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                                    formData.fuel_type === ft.id
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'bg-white border-slate-200 hover:border-emerald-300'
                                }`}
                            >
                                {ft.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Row 3: Liters, Price, Odometer */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Količina (L) *
                        </label>
                        <div className="relative">
                            <Fuel size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.liters}
                                onChange={(e) => handleChange('liters', e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                placeholder="0.00"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Cena po litru (RSD)
                        </label>
                        <div className="relative">
                            <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.price_per_liter}
                                onChange={(e) => handleChange('price_per_liter', e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Kilometraža
                        </label>
                        <div className="relative">
                            <Gauge size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
                            <input
                                type="number"
                                min="0"
                                value={formData.odometer_km}
                                onChange={(e) => handleChange('odometer_km', e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                placeholder="km"
                            />
                        </div>
                    </div>
                </div>

                {/* Total price preview */}
                {formData.liters && formData.price_per_liter && (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <p className="text-sm text-emerald-700">
                            Ukupno: <strong>{(parseFloat(formData.liters) * parseFloat(formData.price_per_liter)).toLocaleString('sr-RS', { minimumFractionDigits: 2 })} RSD</strong>
                        </p>
                    </div>
                )}

                {/* Row 4: Gas station and Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Benzinska pumpa
                        </label>
                        <div className="relative">
                            <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={formData.gas_station}
                                onChange={(e) => handleChange('gas_station', e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                placeholder="npr. NIS Petrol, Gazprom..."
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Napomena
                        </label>
                        <input
                            type="text"
                            value={formData.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            placeholder="Opciona napomena..."
                        />
                    </div>
                </div>

                {/* Receipt Image - narrower */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Slika računa (opciono)
                    </label>
                    {formData.receipt_image_url ? (
                        <div className="relative inline-block">
                            <img
                                src={formData.receipt_image_url}
                                alt="Račun"
                                className="h-24 object-cover rounded-xl"
                            />
                            <button
                                type="button"
                                onClick={() => handleChange('receipt_image_url', '')}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white text-xs rounded-full flex items-center justify-center"
                            >
                                ×
                            </button>
                        </div>
                    ) : (
                        <label className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-400 transition-colors">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                                disabled={uploadingImage}
                            />
                            {uploadingImage ? (
                                <RecycleLoader size={18} className="text-emerald-500" />
                            ) : (
                                <>
                                    <Upload size={18} className="text-slate-400" />
                                    <span className="text-sm text-slate-500">Upload računa</span>
                                </>
                            )}
                        </label>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-3 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium"
                    >
                        Odustani
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <RecycleLoader size={18} className="animate-spin" />
                        ) : (
                            <Fuel size={18} />
                        )}
                        {isEditing ? 'Sačuvaj' : 'Dodaj'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AddFuelLogModal;
