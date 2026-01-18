import { useState } from 'react';
import toast from 'react-hot-toast';
import { Box, CheckCircle2, Package } from 'lucide-react';
import { ModalWithFooter, RecycleLoader } from '../common';

/**
 * Client Equipment Assignment Modal - Assign equipment, PIB, waste types and notes to client
 */
export const ClientEquipmentModal = ({ client, equipment, wasteTypes = [], onSave, onClose }) => {
    const [selectedEquipment, setSelectedEquipment] = useState(client?.equipment_types || []);
    // Obrnuta logika: null/prazno = sve dozvoljeno (sve štiklirano), inače samo izabrane
    const [selectedWasteTypes, setSelectedWasteTypes] = useState(() => {
        // Ako je null ili prazna lista, klijent ima sve vrste - štikliraj sve
        if (!client?.allowed_waste_types || client.allowed_waste_types.length === 0) {
            return wasteTypes.map(wt => wt.id);
        }
        // Inače vrati samo dozvoljene
        return client.allowed_waste_types;
    });
    const [note, setNote] = useState(client?.manager_note || '');
    const [pib, setPib] = useState(client?.pib || '');
    const [saving, setSaving] = useState(false);

    if (!client) return null;

    // Da li su sve vrste izabrane?
    const allWasteTypesSelected = wasteTypes.length > 0 && selectedWasteTypes.length === wasteTypes.length;

    const toggleEquipment = (eqId) => {
        setSelectedEquipment(prev =>
            prev.includes(eqId)
                ? prev.filter(id => id !== eqId)
                : [...prev, eqId]
        );
    };

    const toggleWasteType = (wtId) => {
        setSelectedWasteTypes(prev =>
            prev.includes(wtId)
                ? prev.filter(id => id !== wtId)
                : [...prev, wtId]
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Ako su sve vrste izabrane, sačuvaj null (= sve dozvoljene)
            // Inače sačuvaj samo izabrane
            const wasteTypesToSave = allWasteTypesSelected ? null : selectedWasteTypes;
            await onSave(client.id, selectedEquipment, note, pib, wasteTypesToSave);
            onClose();
        } catch (err) {
            toast.error('Greška pri čuvanju: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <ModalWithFooter
            open={!!client}
            onClose={onClose}
            title="Podešavanja klijenta"
            size="lg"
            footer={
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium"
                    >
                        Otkaži
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm shadow-emerald-200"
                    >
                        {saving ? <RecycleLoader size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                        Sačuvaj
                    </button>
                </div>
            }
        >
            <div className="space-y-6">
                {/* Client Info */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-lg">{client.name?.charAt(0)}</div>
                    <div>
                        <h4 className="font-bold text-lg text-slate-800">{client.name}</h4>
                        <p className="text-sm text-slate-500">{client.phone}</p>
                    </div>
                </div>

                {/* Equipment Selection */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3">Izaberi opremu</label>
                    {equipment.length === 0 ? (
                        <p className="text-sm text-slate-500 p-4 bg-slate-50 rounded-xl text-center">
                            Nema definisane opreme. Dodajte opremu u sekciji "Oprema".
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                            {equipment.map(eq => (
                                <label
                                    key={eq.id}
                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedEquipment.includes(eq.id)
                                        ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/20'
                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedEquipment.includes(eq.id)}
                                        onChange={() => toggleEquipment(eq.id)}
                                        className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                                    />
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {eq.customImage ? (
                                            <img src={eq.customImage} alt={eq.name} className="w-10 h-10 rounded-lg object-cover bg-white border border-slate-100" />
                                        ) : (
                                            <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center shrink-0">
                                                <Box size={20} className="text-slate-400" />
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="font-medium text-sm truncate">{eq.name}</p>
                                            {eq.description && <p className="text-xs text-slate-500 truncate">{eq.description}</p>}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* Waste Types Selection */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3">
                        Dozvoljene vrste robe
                        <span className="font-normal text-slate-500 ml-2 text-xs bg-slate-100 px-2 py-0.5 rounded-full">
                            {allWasteTypesSelected
                                ? 'Sve vrste'
                                : selectedWasteTypes.length === 0
                                    ? 'Nijedna vrsta'
                                    : `${selectedWasteTypes.length}/${wasteTypes.length} dodeljeno`
                            }
                        </span>
                    </label>
                    {wasteTypes.length === 0 ? (
                        <p className="text-sm text-slate-500 p-4 bg-slate-50 rounded-xl text-center">
                            Nema definisanih vrsta robe.
                        </p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto p-1">
                            {wasteTypes.map(wt => (
                                <label
                                    key={wt.id}
                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedWasteTypes.includes(wt.id)
                                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500/20'
                                        : 'border-red-200 bg-red-50 hover:border-red-300 hover:bg-red-100/50'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedWasteTypes.includes(wt.id)}
                                        onChange={() => toggleWasteType(wt.id)}
                                        className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="text-2xl mb-1">{wt.icon}</div>
                                        <p className="text-sm font-medium truncate leading-tight">{wt.label}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                    <p className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-400"></span>
                        Odštiklirajte vrste koje NE želite da klijent vidi (crveno)
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                </div>
            </div>
        </ModalWithFooter>
    );
};

export default ClientEquipmentModal;
