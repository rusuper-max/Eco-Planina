import { useState, useMemo } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import { Modal, RecycleLoader } from '../common';

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
    const [fillLevel, setFillLevel] = useState(50);
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Filtriraj vrste robe na osnovu izabranog klijenta
    const availableWasteTypes = useMemo(() => {
        if (!selectedClient) return [];

        const client = clients.find(c => c.id === selectedClient);
        if (!client) return [];

        // Ako klijent nema ograničenja (null ili prazan niz), prikaži sve
        if (!client.allowed_waste_types || client.allowed_waste_types.length === 0) {
            return wasteTypes;
        }

        // Inače filtriraj samo dozvoljene
        return wasteTypes.filter(wt => client.allowed_waste_types.includes(wt.id));
    }, [selectedClient, clients, wasteTypes]);

    // Resetuj wasteType kad se promeni klijent
    const handleClientChange = (clientId) => {
        setSelectedClient(clientId);
        setWasteType(''); // Reset waste type selection
    };

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
                urgency: 'standard',
                note: note || `Zahtev kreirao: ${managerName || 'Menadžer'}`,
                latitude: client?.latitude,
                longitude: client?.longitude
            });

            // Reset form
            setSelectedClient('');
            setWasteType('');
            setFillLevel(50);
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
        if (fillLevel <= 25) return '#10b981'; // emerald
        if (fillLevel <= 50) return '#84cc16'; // lime
        if (fillLevel <= 75) return '#f59e0b'; // amber
        return '#ef4444'; // red
    };

    // Labela za nivo popunjenosti
    const getFillLabel = (value) => {
        if (value <= 25) return 'Skoro prazan';
        if (value <= 50) return 'Polupun';
        if (value <= 75) return 'Skoro pun';
        return 'Potpuno pun';
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
                    <select
                        value={selectedClient}
                        onChange={(e) => handleClientChange(e.target.value)}
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
                        Vrsta robe *
                    </label>
                    <select
                        value={wasteType}
                        onChange={(e) => setWasteType(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                        required
                        disabled={!selectedClient}
                    >
                        <option value="">
                            {!selectedClient
                                ? 'Prvo izaberi klijenta...'
                                : availableWasteTypes.length === 0
                                    ? 'Klijent nema dodeljene vrste robe'
                                    : 'Izaberi vrstu robe...'}
                        </option>
                        {availableWasteTypes.map(type => (
                            <option key={type.id} value={type.id}>
                                {type.icon} {type.label}
                            </option>
                        ))}
                    </select>
                    {selectedClient && availableWasteTypes.length === 0 && (
                        <p className="mt-1 text-xs text-amber-600">
                            Ovom klijentu nije dodeljena nijedna vrsta robe
                        </p>
                    )}
                </div>

                {/* Fill Level */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-slate-700">
                            Popunjenost kontejnera
                        </label>
                        <span
                            className="px-3 py-1 rounded-full text-sm font-bold"
                            style={{ backgroundColor: `${getSliderColor()}20`, color: getSliderColor() }}
                        >
                            {fillLevel}% - {getFillLabel(fillLevel)}
                        </span>
                    </div>
                    <div className="relative pt-2 pb-4">
                        {/* Gradient bar */}
                        <div className="h-3 rounded-full bg-gradient-to-r from-emerald-400 via-yellow-400 via-orange-400 to-red-500 shadow-inner" />

                        {/* Hidden range input */}
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={fillLevel}
                            onChange={(e) => setFillLevel(Number(e.target.value))}
                            className="absolute top-0 left-0 w-full h-7 opacity-0 cursor-pointer z-10"
                        />

                        {/* Thumb indicator */}
                        <div
                            className="absolute top-[-2px] w-7 h-7 rounded-full bg-white border-[3px] shadow-lg transform -translate-x-1/2 pointer-events-none"
                            style={{
                                left: `${fillLevel}%`,
                                borderColor: getSliderColor(),
                                transition: 'left 0.05s ease-out, border-color 0.15s ease',
                            }}
                        >
                            <div
                                className="absolute inset-[3px] rounded-full transition-colors duration-150"
                                style={{ backgroundColor: getSliderColor() }}
                            />
                        </div>

                        {/* Scale markers */}
                        <div className="flex justify-between mt-3 px-1 text-xs text-slate-400">
                            <span>0%</span>
                            <span>25%</span>
                            <span>50%</span>
                            <span>75%</span>
                            <span>100%</span>
                        </div>
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
                            <RecycleLoader size={18} className="animate-spin" />
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
