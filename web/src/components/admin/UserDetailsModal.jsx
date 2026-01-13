import { X, Phone, MapPin, Building2 } from 'lucide-react';

/**
 * User Details Modal - Shows user information
 */
export const UserDetailsModal = ({ user, onClose }) => {
    if (!user) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Detalji korisnika</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-2xl">
                            {user.name.charAt(0)}
                        </div>
                        <div>
                            <h4 className="font-bold text-lg">{user.name}</h4>
                            <span className="text-sm px-2 py-1 bg-slate-100 rounded-lg capitalize">{user.role}</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-slate-600"><Phone size={18} /> <span>{user.phone}</span></div>
                        <div className="flex items-center gap-3 text-slate-600"><MapPin size={18} /> <span>{user.address || 'Nema adrese'}</span></div>
                        <div className="flex items-center gap-3 text-slate-600"><Building2 size={18} /> <span>{user.company?.name || 'Nema firme'}</span></div>
                        {user.company?.status === 'frozen' && <div className="text-red-600 font-bold text-sm bg-red-50 p-2 rounded">Firma je zamrznuta</div>}
                    </div>
                </div>
                <div className="p-4 bg-slate-50 border-t flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl font-medium text-slate-700">Zatvori</button>
                </div>
            </div>
        </div>
    );
};

export default UserDetailsModal;
