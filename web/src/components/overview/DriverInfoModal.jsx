import { X, Truck, Phone, Mail, MapPin, ClipboardList } from 'lucide-react';

const DriverInfoModal = ({ driver, onClose, onAssignTask }) => {
    if (!driver) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/20 transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-2xl font-bold backdrop-blur-sm">
                            {driver.name?.charAt(0)?.toUpperCase() || 'V'}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{driver.name}</h2>
                            <div className="flex items-center gap-2 mt-1 text-emerald-100">
                                <Truck size={14} />
                                <span className="text-sm">Vozac</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Status */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <div className={`w-3 h-3 rounded-full ${driver.status === 'available' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span className="font-medium text-slate-700">
                            {driver.status === 'available' ? 'Slobodan' : 'Zauzet'}
                        </span>
                    </div>

                    {/* Contact Info */}
                    {driver.phone && (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <Phone size={18} className="text-slate-400" />
                            <a href={`tel:${driver.phone}`} className="text-blue-600 hover:underline">
                                {driver.phone}
                            </a>
                        </div>
                    )}

                    {driver.email && (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <Mail size={18} className="text-slate-400" />
                            <a href={`mailto:${driver.email}`} className="text-blue-600 hover:underline text-sm">
                                {driver.email}
                            </a>
                        </div>
                    )}

                    {driver.address && (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <MapPin size={18} className="text-slate-400" />
                            <span className="text-slate-600 text-sm">{driver.address}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-slate-50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors font-medium"
                    >
                        Zatvori
                    </button>
                    {onAssignTask && driver.status === 'available' && (
                        <button
                            onClick={() => {
                                onAssignTask(driver);
                                onClose();
                            }}
                            className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium flex items-center justify-center gap-2"
                        >
                            <ClipboardList size={18} />
                            Dodeli zadatak
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DriverInfoModal;
