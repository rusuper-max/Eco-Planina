import { useState } from 'react';
import toast from 'react-hot-toast';
import { Scale, Image, FileText, X, Upload, Loader2, CheckCircle2, Truck } from 'lucide-react';
import { Modal } from '../common';
import { uploadImage } from '../../utils/storage';

const DEFAULT_WASTE_TYPES = [
    { id: 'cardboard', label: 'Karton', icon: '📦' },
    { id: 'plastic', label: 'Plastika', icon: '♻️' },
    { id: 'glass', label: 'Staklo', icon: '🍾' },
];

/**
 * Edit Processed Request Modal (for adding proof/weight later)
 */
export const EditProcessedRequestModal = ({ request, wasteTypes = DEFAULT_WASTE_TYPES, onSave, onClose, drivers = [], currentDriverId = null, onAssignDriver }) => {
    const [proofFile, setProofFile] = useState(request?.proof_image_url || null);
    const [proofType, setProofType] = useState(request?.proof_image_url?.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image');
    const [weight, setWeight] = useState(request?.weight?.toString() || '');
    const [weightUnit, setWeightUnit] = useState(request?.weight_unit || 'kg');
    const [note, setNote] = useState(request?.processing_note || '');
    const [selectedDriverId, setSelectedDriverId] = useState(currentDriverId || '');
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

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
            if (onAssignDriver && selectedDriverId !== (currentDriverId || '')) {
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

    const hasChanges = proofFile !== request?.proof_image_url ||
        note !== (request?.processing_note || '') ||
        weight !== (request?.weight?.toString() || '') ||
        weightUnit !== (request?.weight_unit || 'kg') ||
        selectedDriverId !== (currentDriverId || '');

    return (
        <Modal open={!!request} onClose={onClose} title="Dopuni podatke o obradi">
            <div className="space-y-4">
                {/* Request summary */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <span className="text-4xl">{wasteTypes.find(w => w.id === request.waste_type)?.icon || '📦'}</span>
                    <div className="flex-1">
                        <h3 className="font-bold text-lg">{request.waste_label}</h3>
                        <p className="text-sm text-slate-500">{request.client_name}</p>
                    </div>
                </div>

                {/* Weight input */}
                <div className="p-4 bg-blue-50 rounded-xl">
                    <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                        <Scale size={18} className="text-blue-600" />
                        Količina otpada
                    </p>
                    <div className="flex gap-3">
                        <input
                            type="number"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            placeholder="Unesite količinu"
                            min="0"
                            step="0.01"
                            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm bg-white"
                        />
                        <select
                            value={weightUnit}
                            onChange={(e) => setWeightUnit(e.target.value)}
                            className="px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm bg-white font-medium"
                        >
                            <option value="kg">kg</option>
                            <option value="t">tona</option>
                        </select>
                    </div>
                </div>

                {/* Driver selection (retroactive assignment) */}
                {drivers.length > 0 && (
                    <div className="p-4 bg-purple-50 rounded-xl">
                        <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                            <Truck size={18} className="text-purple-600" />
                            Vozač koji je obradio zahtev
                        </p>
                        <select
                            value={selectedDriverId}
                            onChange={(e) => setSelectedDriverId(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-sm bg-white"
                        >
                            <option value="">Bez vozača / Nepoznato</option>
                            {drivers.map(driver => (
                                <option key={driver.id} value={driver.id}>
                                    {driver.name} {driver.phone ? `(${driver.phone})` : ''}
                                </option>
                            ))}
                        </select>
                        {!currentDriverId && selectedDriverId && (
                            <p className="text-xs text-purple-600 mt-2">
                                Vozač će biti naknadno evidentiran za ovaj zahtev
                            </p>
                        )}
                    </div>
                )}

                {/* Proof of Service photo/PDF */}
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                        <Image size={18} className="text-emerald-600" />
                        Dokaz o izvršenoj usluzi
                    </p>

                    {proofFile ? (
                        <div className="relative">
                            {proofType === 'pdf' ? (
                                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                                    <FileText size={32} className="text-blue-600" />
                                    <div className="flex-1">
                                        <p className="font-medium text-blue-900">PDF dokument</p>
                                        <p className="text-xs text-blue-600">Uploadovan</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setProofFile(null); setProofType(null); }}
                                        className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative inline-block">
                                    <img src={proofFile} alt="Dokaz" className="w-full max-w-xs h-48 object-cover rounded-xl" />
                                    <button
                                        type="button"
                                        onClick={() => { setProofFile(null); setProofType(null); }}
                                        className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <label className="cursor-pointer block">
                            <div className="w-full h-32 bg-slate-100 rounded-xl flex flex-col items-center justify-center hover:bg-slate-200 transition-colors border border-slate-200">
                                {uploading ? (
                                    <Loader2 size={32} className="text-emerald-500 animate-spin" />
                                ) : (
                                    <>
                                        <Upload size={32} className="text-slate-400 mb-2" />
                                        <span className="text-sm text-slate-500">Kliknite za upload slike ili PDF</span>
                                    </>
                                )}
                            </div>
                            <input type="file" accept="image/*,application/pdf" capture="environment" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                        </label>
                    )}
                </div>

                {/* Optional note */}
                <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Napomena</label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Dodatne informacije o obradi..."
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm resize-none"
                        rows={2}
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium disabled:opacity-50"
                    >
                        Otkaži
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || uploading || !hasChanges}
                        className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <><Loader2 size={18} className="animate-spin" /> Čuvanje...</>
                        ) : (
                            <><CheckCircle2 size={18} /> Sačuvaj</>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default EditProcessedRequestModal;
