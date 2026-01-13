import { useState } from 'react';
import toast from 'react-hot-toast';
import { Box, Loader2, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common';

/**
 * Client Equipment Assignment Modal - Assign equipment, PIB and notes to client
 */
export const ClientEquipmentModal = ({ client, equipment, onSave, onClose }) => {
    const [selectedEquipment, setSelectedEquipment] = useState(client?.equipment_types || []);
    const [note, setNote] = useState(client?.manager_note || '');
    const [pib, setPib] = useState(client?.pib || '');
    const [saving, setSaving] = useState(false);

    if (!client) return null;

    const toggleEquipment = (eqId) => {
        setSelectedEquipment(prev =>
            prev.includes(eqId)
                ? prev.filter(id => id !== eqId)
                : [...prev, eqId]
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(client.id, selectedEquipment, note, pib);
            onClose();
        } catch (err) {
            toast.error('Greška pri čuvanju: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open={!!client} onClose={onClose} title="Podešavanja klijenta">
            <div className="space-y-4">
                {/* Client Info */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold">{client.name?.charAt(0)}</div>
                    <div>
                        <h4 className="font-medium">{client.name}</h4>
                        <p className="text-xs text-slate-500">{client.phone}</p>
                    </div>
                </div>

                {/* Equipment Selection */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Izaberi opremu</label>
                    {equipment.length === 0 ? (
                        <p className="text-sm text-slate-500 p-4 bg-slate-50 rounded-xl text-center">
                            Nema definisane opreme. Dodajte opremu u sekciji "Oprema".
                        </p>
                    ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {equipment.map(eq => (
                                <label
                                    key={eq.id}
                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedEquipment.includes(eq.id)
                                        ? 'border-emerald-500 bg-emerald-50'
                                        : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedEquipment.includes(eq.id)}
                                        onChange={() => toggleEquipment(eq.id)}
                                        className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                                    />
                                    <div className="flex items-center gap-3 flex-1">
                                        {eq.customImage ? (
                                            <img src={eq.customImage} alt={eq.name} className="w-10 h-10 rounded-lg object-cover" />
                                        ) : (
                                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                                                <Box size={20} className="text-slate-400" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-medium text-sm">{eq.name}</p>
                                            {eq.description && <p className="text-xs text-slate-500">{eq.description}</p>}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* PIB */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">PIB broj (opciono)</label>
                    <input
                        type="text"
                        value={pib}
                        onChange={(e) => setPib(e.target.value.replace(/\D/g, '').slice(0, 9))}
                        placeholder="123456789"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm"
                        maxLength={9}
                    />
                    <p className="mt-1 text-xs text-slate-500">Poreski identifikacioni broj klijenta</p>
                </div>

                {/* Note for client */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Napomena za klijenta (opciono)</label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Unesite napomenu..."
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm resize-none"
                        rows={3}
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium"
                    >
                        Otkaži
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                        Sačuvaj
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ClientEquipmentModal;
