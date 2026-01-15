import { useState } from 'react';
import toast from 'react-hot-toast';
import { MapPin, Scale, Image, FileText, X, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { Modal, CountdownTimer } from '../common';
import { uploadImage } from '../../utils/storage';

const DEFAULT_WASTE_TYPES = [
    { id: 'cardboard', label: 'Karton', icon: '📦' },
    { id: 'plastic', label: 'Plastika', icon: '♻️' },
    { id: 'glass', label: 'Staklo', icon: '🍾' },
];

/**
 * Process Request Modal with Proof of Service photo/PDF upload
 */
export const ProcessRequestModal = ({ request, wasteTypes = DEFAULT_WASTE_TYPES, onProcess, onClose }) => {
    const [proofFile, setProofFile] = useState(null);
    const [proofType, setProofType] = useState(null); // 'image' or 'pdf'
    const [uploading, setUploading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [note, setNote] = useState('');
    const [weight, setWeight] = useState('');
    const [weightUnit, setWeightUnit] = useState('kg'); // 'kg' or 't'

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

    return (
        <Modal open={!!request} onClose={onClose} title="Obrada zahteva">
            <div className="space-y-4">
                {/* Request summary */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <span className="text-4xl">{wasteTypes.find(w => w.id === request.waste_type)?.icon || '📦'}</span>
                    <div className="flex-1">
                        <h3 className="font-bold text-lg">{request.waste_label}</h3>
                        <p className="text-sm text-slate-500">{request.client_name}</p>
                    </div>
                    <CountdownTimer createdAt={request.created_at} urgency={request.urgency} />
                </div>

                {/* Address */}
                <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={14} /> Adresa</p>
                    <p className="font-medium">{request.client_address || 'Nije uneta'}</p>
                </div>

                {/* Weight input */}
                <div className="p-4 bg-blue-50 rounded-xl">
                    <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                        <Scale size={18} className="text-blue-600" />
                        Količina otpada (opciono)
                    </p>
                    <div className="flex gap-3">
                        <input
                            type="number"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            placeholder="Unesite količinu"
                            min="0"
                            step="0.01"
                            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
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

                {/* Proof of Service photo/PDF */}
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                        <Image size={18} className="text-emerald-600" />
                        Dokaz o izvršenoj usluzi (opciono)
                    </p>
                    <p className="text-xs text-slate-500 mb-3">Uploadujte sliku ili PDF dokument kao dokaz</p>

                    {proofFile ? (
                        <div className="relative">
                            {proofType === 'pdf' ? (
                                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                                    <FileText size={32} className="text-blue-600" />
                                    <div className="flex-1">
                                        <p className="font-medium text-blue-900">PDF dokument</p>
                                        <p className="text-xs text-blue-600">Uploadovan uspešno</p>
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
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Napomena (opciono)</label>
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
            </div>
        </Modal>
    );
};

export default ProcessRequestModal;
