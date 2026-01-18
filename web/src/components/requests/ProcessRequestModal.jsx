import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MapPin, Scale, Image, FileText, X, Upload, CheckCircle2, AlertTriangle, Truck } from 'lucide-react';
import { ModalWithFooter, CountdownTimer, RecycleLoader } from '../common';
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
    const [showNoDriverConfirm, setShowNoDriverConfirm] = useState(false);
    const [selectedDriverId, setSelectedDriverId] = useState('');

    const hasDriverWeight = driverAssignment?.driver_weight != null;

    // Refresh defaults when modal opens or assignment data changes
    useEffect(() => {
        if (!request) return; // Early exit within hook is OK
        setWeight(driverAssignment?.driver_weight != null ? driverAssignment.driver_weight.toString() : '');
        setWeightUnit(driverAssignment?.driver_weight_unit || 'kg');
        // Menadžer dodaje svoj dokaz; vozačevi prilozi se vide u "Dokazi" istoriji,
        // pa ovde ne prepunjavamo proofFile driver upload-om.
        setProofFile(null);
        setProofType(null);
    }, [
        driverAssignment?.id,
        driverAssignment?.driver_weight,
        driverAssignment?.driver_weight_unit,
        request?.id
    ]);

    // Early return AFTER all hooks (React Rules of Hooks compliance)
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

    const handleProcess = async (skipDriverCheck = false) => {
        // If no driver assigned and user hasn't selected one, show confirmation
        if (!hasDriverAssignment && !selectedDriverId && !skipDriverCheck) {
            setShowNoDriverConfirm(true);
            return;
        }

        setProcessing(true);
        try {
            const weightData = weight ? { weight: parseFloat(weight), weight_unit: weightUnit } : null;

            // Get selected driver info if user picked one from dropdown
            // This is a "retroactive" assignment - driver is set on processed_request without creating assignment record
            const selectedDriver = selectedDriverId ? drivers.find(d => d.id === selectedDriverId) : null;
            const retroactiveDriverInfo = selectedDriver ? { id: selectedDriver.id, name: selectedDriver.name } : null;

            await onProcess(request, proofFile, note, weightData, retroactiveDriverInfo);
            onClose();
        } catch (err) {
            toast.error('Greška: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleConfirmWithoutDriver = async () => {
        setShowNoDriverConfirm(false);
        await handleProcess(true);
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
                            <><RecycleLoader size={18} className="animate-spin" /> Obrada...</>
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

                    {/* Driver Section */}
                    {hasDriverAssignment ? (
                        /* Driver is assigned - show their info */
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                                    <Truck size={20} className="text-emerald-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-emerald-800">
                                        {driverAssignment?.driver_name || 'Vozač dodeljen'}
                                    </p>
                                    <p className="text-xs text-emerald-600">
                                        {driverAssignment?.picked_up_at ? 'Preuzeto' : 'Čeka preuzimanje'}
                                        {driverAssignment?.delivered_at && ' • Dostavljeno'}
                                    </p>
                                </div>
                                <CheckCircle2 size={20} className="text-emerald-500" />
                            </div>

                            {/* Driver Proofs (if available) */}
                            {(driverAssignment?.pickup_proof_url || driverAssignment?.delivery_proof_url) && (
                                <div className="mt-3 pt-3 border-t border-emerald-200/50">
                                    <p className="text-xs font-medium text-emerald-700 mb-2">Dokazi vozača:</p>
                                    <div className="flex gap-2">
                                        {driverAssignment.pickup_proof_url && (
                                            <a href={driverAssignment.pickup_proof_url} target="_blank" rel="noopener noreferrer" className="block relative group w-16 h-16 rounded-lg overflow-hidden border border-emerald-200">
                                                <img src={driverAssignment.pickup_proof_url} alt="Preuzimanje" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                    <div className="bg-white/90 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Image size={10} className="text-emerald-600" />
                                                    </div>
                                                </div>
                                            </a>
                                        )}
                                        {driverAssignment.delivery_proof_url && (
                                            <a href={driverAssignment.delivery_proof_url} target="_blank" rel="noopener noreferrer" className="block relative group w-16 h-16 rounded-lg overflow-hidden border border-emerald-200">
                                                <img src={driverAssignment.delivery_proof_url} alt="Dostava" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                    <div className="bg-white/90 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Image size={10} className="text-emerald-600" />
                                                    </div>
                                                </div>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* No driver assigned - show dropdown to select one */
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <label className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                                    <Truck size={16} />
                                </div>
                                Vozač (opciono)
                            </label>
                            {drivers.length > 0 && onQuickAssign ? (
                                <select
                                    value={selectedDriverId}
                                    onChange={(e) => setSelectedDriverId(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-sm bg-white font-medium"
                                >
                                    <option value="">Bez vozača / Nepoznato</option>
                                    {drivers.map(driver => (
                                        <option key={driver.id} value={driver.id}>
                                            {driver.name}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-sm text-slate-500 italic">Nema dostupnih vozača</p>
                            )}
                            <p className="text-xs text-slate-400 mt-2">
                                Možete obraditi zahtev i bez vozača - bićete upitani za potvrdu
                            </p>
                        </div>
                    )}

                    {/* No Driver Confirmation Modal */}
                    {showNoDriverConfirm && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                                <div>
                                    <p className="font-medium text-amber-800">Vozač nije odabran</p>
                                    <p className="text-sm text-amber-600 mt-1">
                                        Da li želite da obradite zahtev bez evidentiranja vozača?
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleConfirmWithoutDriver}
                                    disabled={processing}
                                    className="flex-1 px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
                                >
                                    Da, nastavi
                                </button>
                                <button
                                    onClick={() => setShowNoDriverConfirm(false)}
                                    className="flex-1 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50"
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
                                    onKeyDown={(e) => {
                                        // Block letters and special chars - only allow digits, decimal, backspace, arrows, tab
                                        if (['e', 'E', '+', '-'].includes(e.key)) {
                                            e.preventDefault();
                                        }
                                    }}
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
                            <div className="space-y-2">
                                <label className="block mt-2 cursor-pointer group">
                                    <div className="w-full h-24 bg-white rounded-xl flex flex-col items-center justify-center border border-slate-200 group-hover:border-emerald-400 group-hover:shadow-md transition-all">
                                        {uploading ? (
                                            <RecycleLoader size={24} className="text-emerald-500 animate-spin" />
                                        ) : (
                                            <>
                                                <Upload size={24} className="text-slate-400 group-hover:text-emerald-500 mb-2 transition-colors" />
                                                <span className="text-xs text-slate-500 group-hover:text-slate-700">Kliknite za upload (Slika/PDF)</span>
                                            </>
                                        )}
                                    </div>
                                    <input type="file" accept="image/*,application/pdf" capture="environment" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                                </label>
                                {hasDriverWeight && (
                                    <p className="text-xs text-slate-500">
                                        Vozačeve dokaze možete videti u istoriji (&ldquo;Dokazi&rdquo;). Ovde prilažete dokaz za obradu.
                                    </p>
                                )}
                            </div>
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
