import { useState } from 'react';
import toast from 'react-hot-toast';
import { MapPin, Scale, Image, FileText, X, Upload, Loader2, CheckCircle2, AlertTriangle, Truck, UserPlus } from 'lucide-react';
import { ModalWithFooter, CountdownTimer } from '../common';
import { uploadImage } from '../../utils/storage';

const DEFAULT_WASTE_TYPES = [
    { id: 'cardboard', label: 'Karton', icon: '📦' },
    { id: 'plastic', label: 'Plastika', icon: '♻️' },
    { id: 'glass', label: 'Staklo', icon: '🍾' },
];

/**
 * Process Request Modal with Proof of Service photo/PDF upload
 */
export const ProcessRequestModal = ({ request, wasteTypes = DEFAULT_WASTE_TYPES, onProcess, onClose, hasDriverAssignment = false, drivers = [], onQuickAssign, driverAssignment = null }) => {
    const [proofFile, setProofFile] = useState(null);
    const [proofType, setProofType] = useState(null); // 'image' or 'pdf'
    const [uploading, setUploading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [note, setNote] = useState('');
    // Pre-fill weight from driver if available
    const [weight, setWeight] = useState(driverAssignment?.driver_weight?.toString() || '');
    const [weightUnit, setWeightUnit] = useState(driverAssignment?.driver_weight_unit || 'kg'); // 'kg' or 't'
    const [showNoDriverWarning, setShowNoDriverWarning] = useState(false);
    const [showDriverPicker, setShowDriverPicker] = useState(false);

    const hasDriverWeight = driverAssignment?.driver_weight != null;

    if (!request) return null;

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isImage = file.type.startsWith('image/');
        const isPDF = file.type === 'application/pdf';

        if (!isImage && !isPDF) {
            toast.error('Molimo izaberite sliku ili PDF fajl');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast.error('Fajl mora biti manji od 10MB');
            return;
        }
        setUploading(true);
        try {
            const url = await uploadImage(file, 'proof_of_service', 'assets');
            setProofFile(url);
            setProofType(isPDF ? 'pdf' : 'image');
        } catch (err) {
            toast.error('Greška pri uploadu: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleProcess = async () => {
        // Show warning if no driver assigned
        if (!hasDriverAssignment && !showNoDriverWarning) {
            setShowNoDriverWarning(true);
            return;
        }

        setProcessing(true);
        try {
            const weightData = weight ? { weight: parseFloat(weight), weight_unit: weightUnit } : null;
            await onProcess(request, proofFile, note, weightData);
            onClose();
        } catch (err) {
            toast.error('Greška: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleAssignDriver = async (driverId) => {
        try {
            await onQuickAssign(request.id, driverId);
            setShowDriverPicker(false);
            setShowNoDriverWarning(false);
            toast.success('Vozač dodeljen! Sada možete obraditi zahtev.');
        } catch (err) {
            toast.error('Greška pri dodeli vozača');
        }
    };

    return (
        <ModalWithFooter
            open={!!request}
            onClose={onClose}
            title="Obrada zahteva"
            size="xl"
            footer={
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={processing}
                        className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium disabled:opacity-50"
                    >
                        Otkaži
                    </button>
                    <button
                        onClick={handleProcess}
                        disabled={processing || uploading}
                        className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {processing ? (
                            <><Loader2 size={18} className="animate-spin" /> Obrada...</>
                        ) : (
                            <><CheckCircle2 size={18} /> Označi kao obrađeno</>
                        )}
                    </button>
                </div>
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT COLUMN: Info & Address */}
                <div className="space-y-4">
                    {/* Request summary */}
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-4xl">{wasteTypes.find(w => w.id === request.waste_type)?.icon || '📦'}</span>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-slate-800">{request.waste_label}</h3>
                            <p className="text-sm text-slate-500 font-medium">{request.client_name}</p>
                        </div>
                        <div className="px-3 py-1 bg-white rounded-lg shadow-sm border border-slate-100">
                            <CountdownTimer createdAt={request.created_at} urgency={request.urgency} />
                        </div>
                    </div>

                    {/* Address */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 h-full max-h-[200px] overflow-y-auto">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <MapPin size={14} className="text-slate-400" /> Adresa klijenta
                        </p>
                        <p className="font-medium text-slate-700 leading-relaxed">{request.client_address || 'Nije uneta'}</p>
                    </div>

                    {/* No Driver Warning (Mobile/Desktop) */}
                    {showNoDriverWarning && !hasDriverAssignment && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                                <div>
                                    <p className="font-medium text-amber-800">Zahtev nije dodeljen vozaču</p>
                                    <p className="text-sm text-amber-600 mt-1">
                                        Da li želite da ga obradite bez evidentiranja vozača?
                                    </p>
                                </div>
                            </div>

                            {/* Driver picker */}
                            {showDriverPicker && drivers.length > 0 && (
                                <div className="bg-white rounded-xl border border-amber-200 p-3 space-y-2 shadow-sm">
                                    <p className="text-xs font-medium text-slate-500">Izaberite vozača:</p>
                                    <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                                        {drivers.map(driver => (
                                            <button
                                                key={driver.id}
                                                onClick={() => handleAssignDriver(driver.id)}
                                                className="w-full px-3 py-2 text-left hover:bg-emerald-50 rounded-lg flex items-center gap-2 text-sm transition-colors"
                                            >
                                                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                                                    <Truck size={14} className="text-emerald-600" />
                                                </div>
                                                <span className="font-medium text-slate-700 truncate">{driver.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                                {drivers.length > 0 && onQuickAssign && !showDriverPicker && (
                                    <button
                                        onClick={() => setShowDriverPicker(true)}
                                        className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <UserPlus size={16} /> Dodeli vozača
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setShowNoDriverWarning(false);
                                        setShowDriverPicker(false);
                                        setProcessing(true);
                                        const weightData = weight ? { weight: parseFloat(weight), weight_unit: weightUnit } : null;
                                        onProcess(request, proofFile, note, weightData)
                                            .then(() => onClose())
                                            .catch(err => toast.error('Greška: ' + err.message))
                                            .finally(() => setProcessing(false));
                                    }}
                                    className="flex-1 px-3 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium hover:bg-amber-200"
                                >
                                    Nastavi bez vozača
                                </button>
                                <button
                                    onClick={() => {
                                        setShowNoDriverWarning(false);
                                        setShowDriverPicker(false);
                                    }}
                                    className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50"
                                >
                                    Otkaži
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Inputs */}
                <div className="space-y-4">
                    {/* Weight input */}
                    <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                        <label className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                                <Scale size={16} />
                            </div>
                            Količina otpada (opciono)
                        </label>
                        {hasDriverWeight && (
                            <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-700">
                                <Truck size={14} />
                                <span>Vozač je uneo: <strong>{driverAssignment.driver_weight} {driverAssignment.driver_weight_unit || 'kg'}</strong></span>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <input
                                    type="number"
                                    value={weight}
                                    onChange={(e) => setWeight(e.target.value)}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    className="w-full pl-4 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-medium"
                                />
                            </div>
                            <select
                                value={weightUnit}
                                onChange={(e) => setWeightUnit(e.target.value)}
                                className="w-24 px-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm bg-white font-medium text-slate-700"
                            >
                                <option value="kg">kg</option>
                                <option value="t">tona</option>
                            </select>
                        </div>
                    </div>

                    {/* Proof of Service photo/PDF */}
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 hover:border-emerald-500/30 transition-colors bg-slate-50/30">
                        <label className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                                <Image size={16} />
                            </div>
                            Dokaz o izvršenoj usluzi
                        </label>

                        {proofFile ? (
                            <div className="relative mt-2">
                                {proofType === 'pdf' ? (
                                    <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                        <FileText size={32} className="text-blue-600" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-blue-900 truncate">PDF dokument</p>
                                            <p className="text-xs text-blue-600">Spremno za slanje</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => { setProofFile(null); setProofType(null); }}
                                            className="p-2 bg-white text-red-500 rounded-lg hover:bg-red-50 border border-red-100 transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative group rounded-xl overflow-hidden border border-slate-200">
                                        <img src={proofFile} alt="Dokaz" className="w-full h-40 object-cover bg-slate-100" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                type="button"
                                                onClick={() => { setProofFile(null); setProofType(null); }}
                                                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg transform scale-90 group-hover:scale-100 transition-transform"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <label className="block mt-2 cursor-pointer group">
                                <div className="w-full h-24 bg-white rounded-xl flex flex-col items-center justify-center border border-slate-200 group-hover:border-emerald-400 group-hover:shadow-md transition-all">
                                    {uploading ? (
                                        <Loader2 size={24} className="text-emerald-500 animate-spin" />
                                    ) : (
                                        <>
                                            <Upload size={24} className="text-slate-400 group-hover:text-emerald-500 mb-2 transition-colors" />
                                            <span className="text-xs text-slate-500 group-hover:text-slate-700">Kliknite za upload (Slika/PDF)</span>
                                        </>
                                    )}
                                </div>
                                <input type="file" accept="image/*,application/pdf" capture="environment" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                            </label>
                        )}
                    </div>

                    {/* Optional note */}
                    <div>
                        <label className="text-sm font-semibold text-slate-700 mb-2 block">Napomena (opciono)</label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Unesite dodatne informacije..."
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm resize-none h-24"
                        />
                    </div>
                </div>
            </div>
        </ModalWithFooter>
    );
};

export default ProcessRequestModal;
