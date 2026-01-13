import { useState } from 'react';
import toast from 'react-hot-toast';
import { X, Loader2 } from 'lucide-react';

/**
 * User Edit Modal - Edit user details
 */
export const UserEditModal = ({ user, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: user?.name || '',
        phone: user?.phone || '',
        address: user?.address || ''
    });
    const [saving, setSaving] = useState(false);

    if (!user) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave(user.id, formData);
            onClose();
        } catch (err) {
            toast.error(err.message || 'Greška pri čuvanju');
        } finally {
            setSaving(false);
        }
    };

    const getRoleConfig = (role) => {
        switch (role) {
            case 'developer':
                return { label: 'Developer', className: 'bg-slate-800 text-white' };
            case 'admin':
                return { label: 'Admin', className: 'bg-blue-100 text-blue-700' };
            case 'company_admin':
                return { label: 'Vlasnik', className: 'bg-purple-100 text-purple-700' };
            case 'manager':
                return { label: 'Menadžer', className: 'bg-emerald-100 text-emerald-700' };
            case 'driver':
                return { label: 'Vozač', className: 'bg-amber-100 text-amber-700' };
            default:
                return { label: 'Klijent', className: 'bg-slate-100 text-slate-700' };
        }
    };

    const roleConfig = getRoleConfig(user.role);

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Izmeni korisnika</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-xl">
                                {formData.name.charAt(0) || '?'}
                            </div>
                            <div>
                                <span className={`text-sm px-2 py-1 rounded-lg ${roleConfig.className}`}>
                                    {roleConfig.label}
                                </span>
                                <p className="text-xs text-slate-400 mt-1">ID: {user.id?.slice(0, 8)}...</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Ime</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Telefon</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Adresa</label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                placeholder="Ulica i broj, Grad"
                            />
                        </div>

                        {user.company?.name && (
                            <div className="p-3 bg-slate-50 rounded-xl">
                                <p className="text-xs text-slate-500 mb-1">Firma</p>
                                <p className="font-medium text-slate-700">{user.company.name}</p>
                                <p className="text-xs text-slate-400">Kod: {user.company_code}</p>
                            </div>
                        )}
                    </div>
                    <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl font-medium text-slate-700">
                            Otkaži
                        </button>
                        <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium flex items-center gap-2 disabled:opacity-50">
                            {saving ? <Loader2 size={18} className="animate-spin" /> : null}
                            Sačuvaj
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserEditModal;
