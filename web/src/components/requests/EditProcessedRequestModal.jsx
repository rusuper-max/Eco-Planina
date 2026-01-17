import { useState } from 'react';
import toast from 'react-hot-toast';
import { Scale, Image, FileText, X, Upload, Loader2, CheckCircle2, Truck } from 'lucide-react';
import { ModalWithFooter } from '../common';
import { uploadImage } from '../../utils/storage';

const DEFAULT_WASTE_TYPES = [
    { id: 'cardboard', label: 'Karton', icon: '📦' },
    { id: 'plastic', label: 'Plastika', icon: '♻️' },
    { id: 'glass', label: 'Staklo', icon: '🍾' },
];

/**
 * Edit Processed Request Modal (for adding proof/weight later)
 */
export const EditProcessedRequestModal = ({ request, wasteTypes = DEFAULT_WASTE_TYPES, onSave, onClose, drivers = [], currentDriverId = null, onAssignDriver, driverAssignment = null }) => {
    const [proofFile, setProofFile] = useState(request?.proof_image_url || null);
    const [proofType, setProofType] = useState(request?.proof_image_url?.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image');
    const [weight, setWeight] = useState(request?.weight?.toString() || '');
    const [weightUnit, setWeightUnit] = useState(request?.weight_unit || 'kg');
    const [note, setNote] = useState(request?.processing_note || '');
    const [selectedDriverId, setSelectedDriverId] = useState(currentDriverId || '');
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Check if driver actually worked on this request (has picked_up_at or delivered_at)
    // If so, we should NOT allow changing the driver
    const driverActuallyWorked = driverAssignment && (driverAssignment.picked_up_at || driverAssignment.delivered_at);

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

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = {
                proof_image_url: proofFile,
                processing_note: note || null,
                weight: weight ? parseFloat(weight) : null,
                weight_unit: weight ? weightUnit : null
            };
            await onSave(updates);

            // If driver was changed and we have the handler
            // But ONLY if driver didn't actually work on this request
            if (onAssignDriver && !driverActuallyWorked && selectedDriverId !== (currentDriverId || '')) {
                if (selectedDriverId) {
                    await onAssignDriver(request.request_id || request.id, selectedDriverId);
                }
            }
        } catch (err) {
            toast.error('Greška: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // Only count driver change if driver didn't actually work
    const driverChanged = !driverActuallyWorked && selectedDriverId !== (currentDriverId || '');

    const hasChanges = proofFile !== request?.proof_image_url ||
        note !== (request?.processing_note || '') ||
        weight !== (request?.weight?.toString() || '') ||
        weightUnit !== (request?.weight_unit || 'kg') ||
        driverChanged;

    return (

        <ModalWithFooter
            open={!!request}
            onClose={onClose}
            title="Dopuni podatke o obradi"
            size="xl"
            footer={
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium border border-transparent hover:border-slate-200 disabled:opacity-50"
                    >
                        Otkaži
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || uploading || !hasChanges}
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors shadow-sm shadow-emerald-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <><Loader2 size={18} className="animate-spin" /> Čuvanje...</>
                        ) : (
                            <><CheckCircle2 size={18} /> Sačuvaj</>
                        )}
                    </button>
                </div>
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* LEFT COLUMN: request info, weight, driver */}
                <div className="space-y-6">
                    {/* Request summary */}
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-4xl">{wasteTypes.find(w => w.id === request.waste_type)?.icon || '📦'}</span>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-slate-800">{request.waste_label}</h3>
                            <p className="text-sm text-slate-500 font-medium">{request.client_name}</p>
                        </div>
                    </div>

                    {/* Weight input */}
                    <div className="p-5 bg-blue-50/50 rounded-xl border border-blue-100">
                        <p className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                            <Scale size={18} className="text-blue-600" />
                            Količina otpada
                        </p>
                        <div className="flex gap-3">
                            <input
                                type="number"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-lg font-medium bg-white"
                            />
                            <select
                                value={weightUnit}
                                onChange={(e) => setWeightUnit(e.target.value)}
                                className="w-24 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-lg font-medium bg-white"
                            >
                                <option value="kg">kg</option>
                                <option value="t">t</option>
                            </select>
                        </div>
                    </div>

                    {/* Driver selection (retroactive assignment) */}
                    {drivers.length > 0 && (
                        <div className={`p-5 rounded-xl border ${driverActuallyWorked ? 'bg-amber-50/50 border-amber-200' : 'bg-purple-50/50 border-purple-100'}`}>
                            <p className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <Truck size={18} className={driverActuallyWorked ? 'text-amber-600' : 'text-purple-600'} />
                                Vozač koji je obradio zahtev
                            </p>

                            {driverActuallyWorked ? (
                                /* Driver actually worked - show locked info */
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-amber-100 shadow-sm">
                                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                                            <Truck size={20} className="text-amber-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-800">
                                                {driverAssignment?.driver?.name || drivers.find(d => d.id === currentDriverId)?.name || 'Vozač'}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Preuzeto: {driverAssignment?.picked_up_at ? new Date(driverAssignment.picked_up_at).toLocaleString('sr-RS', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                                                {driverAssignment?.delivered_at && ` • Dovezeno: ${new Date(driverAssignment.delivered_at).toLocaleString('sr-RS', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-amber-700 flex items-start gap-1.5 px-1 font-medium">
                                        <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0"></span>
                                        Vozač je zaista vozio ovaj zahtev. Promena vozača nije moguća jer bi se izgubili podaci o preuzimanju i dostavi.
                                    </p>
                                </div>
                            ) : (
                                /* No actual work done - allow driver change */
                                <>
                                    <select
                                        value={selectedDriverId}
                                        onChange={(e) => setSelectedDriverId(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-sm bg-white font-medium"
                                    >
                                        <option value="">Bez vozača / Nepoznato</option>
                                        {drivers.map(driver => (
                                            <option key={driver.id} value={driver.id}>
                                                {driver.name} {driver.phone ? `(${driver.phone})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {!currentDriverId && selectedDriverId && (
                                        <p className="text-xs text-purple-600 mt-2 font-medium">
                                            ℹ️ Vozač će biti naknadno evidentiran za ovaj zahtev
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Proof & Note */}
                <div className="space-y-6 flex flex-col h-full">
                    {/* Proof of Service photo/PDF */}
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 flex flex-col flex-1 min-h-[250px]">
                        <p className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <Image size={18} className="text-emerald-600" />
                            Dokaz o izvršenoj usluzi
                        </p>

                        <div className="flex-1 flex flex-col justify-center">
                            {proofFile ? (
                                <div className="relative w-full h-full min-h-[200px] flex items-center justify-center bg-slate-50 rounded-lg p-2">
                                    {proofType === 'pdf' ? (
                                        <div className="flex flex-col items-center gap-3 p-6 bg-blue-50 rounded-xl border border-blue-100">
                                            <FileText size={48} className="text-blue-500" />
                                            <div className="text-center">
                                                <p className="font-bold text-blue-900">PDF Dokument</p>
                                                <a href={proofFile} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Otvorite dokument</a>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => { setProofFile(null); setProofType(null); }}
                                                className="mt-2 px-3 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm font-medium transition-colors"
                                            >
                                                Ukloni
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="relative group w-full h-full flex items-center justify-center">
                                            <img src={proofFile} alt="Dokaz" className="max-w-full max-h-[300px] object-contain rounded-lg shadow-sm" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                                <button
                                                    type="button"
                                                    onClick={() => { setProofFile(null); setProofType(null); }}
                                                    className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transform scale-90 hover:scale-100 transition-all shadow-xl"
                                                >
                                                    <X size={24} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <label className="cursor-pointer block h-full">
                                    <div className="w-full h-full min-h-[200px] bg-slate-50 rounded-xl flex flex-col items-center justify-center hover:bg-slate-100 transition-all border border-slate-200 hover:border-emerald-300 hover:shadow-inner group">
                                        {uploading ? (
                                            <Loader2 size={40} className="text-emerald-500 animate-spin" />
                                        ) : (
                                            <>
                                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                                    <Upload size={32} className="text-emerald-500" />
                                                </div>
                                                <span className="font-medium text-slate-700">Kliknite za upload slike ili PDF</span>
                                                <span className="text-xs text-slate-400 mt-2">Maksimalna veličina 10MB</span>
                                            </>
                                        )}
                                    </div>
                                    <input type="file" accept="image/*,application/pdf" capture="environment" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Optional note */}
                    <div>
                        <label className="text-sm font-bold text-slate-700 mb-2 block">Napomena</label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Dodatne informacije o obradi..."
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm resize-none bg-slate-50 focus:bg-white transition-colors"
                            rows={3}
                        />
                    </div>
                </div>
            </div>
        </ModalWithFooter>
    );
};

export default EditProcessedRequestModal;
