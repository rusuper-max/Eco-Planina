import { Phone, MapPin, Box } from 'lucide-react';
import { Modal } from '../common';

/**
 * Client Details Modal - Shows detailed information about a client
 */
export const ClientDetailsModal = ({ client, equipment, onClose }) => {
    if (!client) return null;

    // Get equipment names from IDs
    const getEquipmentNames = () => {
        if (!client.equipment_types || client.equipment_types.length === 0 || !equipment || equipment.length === 0) {
            return [];
        }
        return client.equipment_types
            .map(eqId => equipment.find(e => e.id === eqId))
            .filter(Boolean)
            .map(e => e.name);
    };

    const equipmentNames = getEquipmentNames();

    return (
        <Modal open={!!client} onClose={onClose} title="Detalji klijenta">
            <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-2xl">{client.name?.charAt(0)}</div>
                    <div>
                        <h3 className="font-bold text-lg">{client.name}</h3>
                        <p className="text-sm text-slate-500">Klijent</p>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500">Telefon</p>
                    <p className="font-medium flex items-center gap-2"><Phone size={16} /> {client.phone}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500">Adresa</p>
                    <p className="font-medium flex items-center gap-2"><MapPin size={16} /> {client.address || 'Nije uneta'}</p>
                </div>
                {client.pib && (
                    <div className="p-4 bg-blue-50 rounded-xl">
                        <p className="text-xs text-blue-600">PIB broj</p>
                        <p className="font-medium text-blue-700">{client.pib}</p>
                    </div>
                )}
                {client.manager_note && (
                    <div className="p-4 bg-amber-50 rounded-xl">
                        <p className="text-xs text-amber-600">Napomena menadžera</p>
                        <p className="font-medium">{client.manager_note}</p>
                    </div>
                )}
                {equipmentNames.length > 0 && (
                    <div className="p-4 bg-emerald-50 rounded-xl">
                        <p className="text-xs text-emerald-600 mb-2">Dodeljena oprema</p>
                        <div className="flex flex-wrap gap-2">
                            {equipmentNames.map((name, idx) => (
                                <span key={idx} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium flex items-center gap-1.5">
                                    <Box size={14} />
                                    {name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ClientDetailsModal;
