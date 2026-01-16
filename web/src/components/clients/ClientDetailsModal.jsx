import { Phone, MapPin, Box, Recycle } from 'lucide-react';
import { Modal } from '../common';

/**
 * Client Details Modal - Shows detailed information about a client
 */
export const ClientDetailsModal = ({ client, equipment, wasteTypes = [], onClose }) => {
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

    // Get waste type info from IDs
    const getWasteTypeInfo = () => {
        if (!client.waste_types || client.waste_types.length === 0 || !wasteTypes || wasteTypes.length === 0) {
            return [];
        }
        return client.waste_types
            .map(wtId => wasteTypes.find(w => w.id === wtId))
            .filter(Boolean);
    };

    const equipmentNames = getEquipmentNames();
    const clientWasteTypes = getWasteTypeInfo();

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
                {clientWasteTypes.length > 0 && (
                    <div className="p-4 bg-purple-50 rounded-xl">
                        <p className="text-xs text-purple-600 mb-2 flex items-center gap-1">
                            <Recycle size={12} />
                            Dodeljene vrste otpada
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {clientWasteTypes.map((wt) => (
                                <span key={wt.id} className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium flex items-center gap-1.5">
                                    <span>{wt.icon || '📦'}</span>
                                    {wt.label}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                {equipmentNames.length > 0 && (
                    <div className="p-4 bg-emerald-50 rounded-xl">
                        <p className="text-xs text-emerald-600 mb-2 flex items-center gap-1">
                            <Box size={12} />
                            Dodeljena oprema
                        </p>
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
