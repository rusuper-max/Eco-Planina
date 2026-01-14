import { useState } from 'react';
import { Plus, User, Package, AlertCircle, Loader2 } from 'lucide-react';
import { Modal } from '../common';

/**
 * Modal for manager to create request on behalf of a client (phone call scenario)
 */
export const CreateRequestModal = ({
    open,
    onClose,
    clients = [],
    wasteTypes = [],
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
                note: note || 'Zahtev kreiran telefonski',
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

    return (
        <Modal open={open} onClose={handleClose} title="Kreiraj zahtev">
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
                    <div className="relative">
                        <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={selectedClient}
                            onChange={(e) => setSelectedClient(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
                            required
                        >
                            <option value="">Izaberi klijenta...</option>
                            {clients.map(client => (
                                <option key={client.id} value={client.id}>
                                    {client.name} {client.address ? `- ${client.address}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Waste Type Select */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Vrsta otpada *
                    </label>
                    <div className="relative">
                        <Package size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={wasteType}
                            onChange={(e) => setWasteType(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
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
                </div>

                {/* Fill Level */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Popunjenost kontejnera: {fillLevel}%
                    </label>
                    <input
                        type="range"
                        min="10"
                        max="100"
                        step="10"
                        value={fillLevel}
                        onChange={(e) => setFillLevel(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>10%</span>
                        <span>50%</span>
                        <span>100%</span>
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
