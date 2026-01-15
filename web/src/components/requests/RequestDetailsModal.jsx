import { Modal, FillLevelBar, CountdownTimer } from '../common';

const DEFAULT_WASTE_TYPES = [
    { id: 'cardboard', label: 'Karton', icon: '📦' },
    { id: 'plastic', label: 'Plastika', icon: '♻️' },
    { id: 'glass', label: 'Staklo', icon: '🍾' },
];

/**
 * Request Details Modal - Shows detailed information about a request
 */
export const RequestDetailsModal = ({ request, wasteTypes = DEFAULT_WASTE_TYPES, onClose }) => {
    if (!request) return null;

    return (
        <Modal open={!!request} onClose={onClose} title="Detalji zahteva">
            <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <span className="text-4xl">{wasteTypes.find(w => w.id === request.waste_type)?.icon || '📦'}</span>
                    <div>
                        <h3 className="font-bold text-lg">{request.waste_label}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-slate-500">Popunjenost:</span>
                            <FillLevelBar fillLevel={request.fill_level} />
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-xs text-slate-500">Klijent</p>
                        <p className="font-semibold">{request.client_name}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-xs text-slate-500">Preostalo</p>
                        <p className="font-semibold">
                            <CountdownTimer createdAt={request.created_at} urgency={request.urgency} />
                        </p>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500">Adresa</p>
                    <p className="font-medium">{request.client_address || 'Nije uneta'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500">Telefon</p>
                    <p className="font-medium">{request.client_phone || 'Nije unet'}</p>
                </div>
                {request.note && (
                    <div className="p-4 bg-amber-50 rounded-xl">
                        <p className="text-xs text-amber-600">Napomena</p>
                        <p>{request.note}</p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default RequestDetailsModal;
