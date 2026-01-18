import { useState } from 'react';
import toast from 'react-hot-toast';
import { X, Building2, Lock, Trash2, AlertTriangle } from 'lucide-react';
import { RecycleLoader } from '../common';

/**
 * Company Edit Modal - Edit company details with delete option
 */
export const CompanyEditModal = ({ company, onClose, onSave, onDelete }) => {
    const [formData, setFormData] = useState({
        name: company?.name || ''
    });
    const [saving, setSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteInput, setDeleteInput] = useState('');
    const [deleting, setDeleting] = useState(false);

    if (!company) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave(company.code, formData);
            onClose();
        } catch (err) {
            toast.error(err.message || 'Greška pri čuvanju');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await onDelete(company.code);
            onClose();
        } catch (err) {
            toast.error(err.message || 'Greška pri brisanju');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Izmeni firmu</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg"><X size={20} /></button>
                </div>
                {showDeleteConfirm ? (
                    <div className="p-6">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600 mx-auto">
                            <AlertTriangle size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-center mb-2">Obriši firmu?</h3>
                        <p className="text-slate-500 text-center mb-4">Ovo će trajno obrisati firmu "{company.name}" i sve povezane korisnike!</p>
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Ukucajte "DELETE" za potvrdu</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 border-2 border-red-200 rounded-xl focus:border-red-500 focus:ring-0 outline-none font-bold"
                                placeholder="DELETE"
                                value={deleteInput}
                                onChange={e => setDeleteInput(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium">Odustani</button>
                            <button onClick={handleDelete} disabled={deleteInput !== 'DELETE' || deleting} className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-bold">
                                {deleting ? <RecycleLoader className="mx-auto text-white" size={20} /> : 'Obriši'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                    <Building2 size={28} />
                                </div>
                                <div>
                                    <code className="text-sm px-2 py-1 bg-slate-100 rounded-lg">{company.code}</code>
                                    <p className="text-xs text-slate-400 mt-1">{company.managerCount || 0} menadžera • {company.clientCount || 0} klijenata</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Naziv firme</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                    required
                                />
                            </div>

                            {company.status === 'frozen' && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                                    <p className="text-sm text-red-700 font-medium flex items-center gap-2">
                                        <Lock size={16} /> Ova firma je zamrznuta
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-slate-50 border-t flex justify-between">
                            <button type="button" onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium flex items-center gap-2">
                                <Trash2 size={18} /> Obriši
                            </button>
                            <div className="flex gap-3">
                                <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl font-medium text-slate-700">
                                    Otkaži
                                </button>
                                <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium flex items-center gap-2 disabled:opacity-50">
                                    {saving ? <RecycleLoader size={18} className="animate-spin" /> : null}
                                    Sačuvaj
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default CompanyEditModal;
