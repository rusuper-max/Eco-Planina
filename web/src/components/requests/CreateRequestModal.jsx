import { useState } from 'react';
import { Plus, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from '../common';

/**
 * Modal for manager to create request on behalf of a client (phone call scenario)
 */
export const CreateRequestModal = ({
    open,
    onClose,
    clients = [],
    wasteTypes = [],
    managerName = '',
    onSubmit
}) => {
    const [selectedClient, setSelectedClient] = useState('');
    const [wasteType, setWasteType] = useState('');
    const [fillLevel, setFillLevel] = useState(100);
    const [urgency, setUrgency] = useState('48h');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!selectedClient) {
            setError('Izaberite klijenta');
            return;
        }
        if (!wasteType) {
            setError('Izaberite vrstu otpada');
            return;
        }

        setSubmitting(true);
        try {
            const client = clients.find(c => c.id === selectedClient);
            const waste = wasteTypes.find(w => w.id === wasteType);

            await onSubmit({
                userId: selectedClient,
                clientName: client?.name,
                clientAddress: client?.address,
                wasteType: wasteType,
                wasteLabel: waste?.label,
                fillLevel: fillLevel,
                urgency: urgency,
                note: note || `Zahtev kreirao: ${managerName || 'Menadžer'}`,
                latitude: client?.latitude,
                longitude: client?.longitude
            });

            // Reset form
            setSelectedClient('');
            setWasteType('');
            setFillLevel(100);
            setUrgency('48h');
            setNote('');
            onClose();
        } catch (err) {
            setError(err.message || 'Greška pri kreiranju zahteva');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!submitting) {
            setError('');
            onClose();
        }
    };

    // Calculate slider color based on fill level
    const getSliderColor = () => {
        if (fillLevel <= 30) return '#22c55e'; // green
        if (fillLevel <= 60) return '#eab308'; // amber
        return '#ef4444'; // red
    };

    return (
        <Modal open={open} onClose={handleClose} title="Kreiraj zahtev">
            <style>{`
                .fill-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: white;
                    border: 3px solid ${getSliderColor()};
                    cursor: pointer;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                    transition: border-color 0.2s;
                }
                .fill-slider::-moz-range-thumb {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: white;
                    border: 3px solid ${getSliderColor()};
                    cursor: pointer;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                }
                .fill-slider::-webkit-slider-runnable-track {
                    height: 12px;
                    border-radius: 6px;
                }
                .fill-slider::-moz-range-track {
                    height: 12px;
                    border-radius: 6px;
                }
            `}</style>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {/* Client Select */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Klijent *
                    </label>
                    <select
                        value={selectedClient}
                        onChange={(e) => setSelectedClient(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
                        required
                    >
                        <option value="">Izaberi klijenta...</option>
                        {clients.map(client => (
                            <option key={client.id} value={client.id}>
                                {client.name}{client.region_name ? ` - ${client.region_name}` : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Waste Type Select */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Vrsta otpada *
                    </label>
                    <select
                        value={wasteType}
                        onChange={(e) => setWasteType(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
                        required
                    >
                        <option value="">Izaberi vrstu otpada...</option>
                        {wasteTypes.map(type => (
                            <option key={type.id} value={type.id}>
                                {type.icon} {type.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Fill Level */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Popunjenost kontejnera: <span className={`font-bold ${fillLevel <= 30 ? 'text-emerald-600' : fillLevel <= 60 ? 'text-amber-600' : 'text-red-600'}`}>{fillLevel}%</span>
                    </label>
                    <div className="relative py-2">
                        <input
                            type="range"
                            min="10"
                            max="100"
                            step="10"
                            value={fillLevel}
                            onChange={(e) => setFillLevel(Number(e.target.value))}
                            className="fill-slider w-full h-3 rounded-full cursor-pointer"
                            style={{
                                background: (() => {
                                    const percent = ((fillLevel - 10) / 90) * 100;
                                    // Gradient samo do pozicije slidera, ostatak siv
                                    return `linear-gradient(to right, #22c55e 0%, #eab308 ${Math.min(percent, 50)}%, ${percent > 50 ? '#ef4444' : '#eab308'} ${percent}%, #e2e8f0 ${percent}%, #e2e8f0 100%)`;
                                })(),
                                WebkitAppearance: 'none',
                                appearance: 'none'
                            }}
                        />
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                        <span className="text-emerald-600 font-medium">10%</span>
                        <span className="text-amber-600 font-medium">50%</span>
                        <span className="text-red-600 font-medium">100%</span>
                    </div>
                </div>

                {/* Urgency */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Hitnost
                    </label>
                    <div className="flex gap-2">
                        {[
                            { value: '24h', label: 'Hitno (24h)', color: 'red' },
                            { value: '48h', label: 'Srednje (48h)', color: 'amber' },
                            { value: '72h', label: 'Normalno (72h)', color: 'emerald' }
                        ].map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setUrgency(opt.value)}
                                className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                                    urgency === opt.value
                                        ? opt.color === 'red'
                                            ? 'bg-red-100 text-red-700 ring-2 ring-red-500'
                                            : opt.color === 'amber'
                                            ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-500'
                                            : 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Note */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Napomena
                    </label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Telefonski poziv, dodatne informacije..."
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
                        rows={2}
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={submitting}
                        className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                        Odustani
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Plus size={18} />
                        )}
                        Kreiraj zahtev
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateRequestModal;
