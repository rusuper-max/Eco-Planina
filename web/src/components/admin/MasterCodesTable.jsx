import { useState } from 'react';
import { useAdmin } from '../../context';
import { Copy, Trash2, Plus, Lock, Unlock, Scale, EyeOff, Eye, Edit3, X, FileText, Loader2 } from 'lucide-react';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { EmptyState } from '../common';

export const MasterCodesTable = ({ codes, onGenerate, onCopy, onDelete, isDeveloper, isAdmin, onUpdatePrice }) => {
    const { toggleCompanyStatus } = useAdmin();
    const [deleteModal, setDeleteModal] = useState(null);
    const [freezing, setFreezing] = useState(null);
    const [revealedPrices, setRevealedPrices] = useState({});
    const [editingPrice, setEditingPrice] = useState(null);
    const [priceForm, setPriceForm] = useState({ price: '', billing_type: 'one_time', currency: 'EUR' });

    const handleFreeze = async (masterCodeId, companyCode, currentStatus) => {
        if (!companyCode) {
            alert('Ovaj master kod nema povezanu firmu');
            return;
        }
        setFreezing(masterCodeId);
        try {
            // Toggle status: if frozen -> active, if used/active -> frozen
            const newStatus = currentStatus === 'frozen' ? 'active' : 'frozen';
            await toggleCompanyStatus(companyCode, newStatus);
            window.location.reload();
        } catch (e) { alert(e.message); }
        setFreezing(null);
    };

    const togglePriceReveal = (codeId) => {
        setRevealedPrices(prev => ({ ...prev, [codeId]: !prev[codeId] }));
    };

    const startEditPrice = (code) => {
        setEditingPrice(code.id);
        setPriceForm({
            price: code.price || '',
            billing_type: code.billing_type || 'one_time',
            currency: code.currency || 'EUR'
        });
    };

    const savePrice = async (codeId) => {
        if (onUpdatePrice) {
            await onUpdatePrice(codeId, priceForm);
        }
        setEditingPrice(null);
    };

    const billingTypeLabels = {
        one_time: 'Jednokratno',
        monthly: 'Mesečno',
        yearly: 'Godišnje'
    };

    const formatPrice = (code) => {
        if (!code.price) return '-';
        return `${code.price} ${code.currency || 'EUR'}`;
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">Master Kodovi</h2>
                <button onClick={onGenerate} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-sm"><Plus size={18} /> Generiši</button>
            </div>

            {deleteModal && (
                <DeleteConfirmationModal
                    title="Obriši Master Kod"
                    warning="Ova akcija će obrisati firmu i SVE njene korisnike vezane za ovaj kod!"
                    expectedInput={`DELETE ${deleteModal.code}`}
                    onClose={() => setDeleteModal(null)}
                    onConfirm={async () => { await onDelete(deleteModal.id); setDeleteModal(null); }}
                />
            )}

            {!codes?.length ? <EmptyState icon={FileText} title="Nema kodova" desc="Generiši prvi kod" /> : (
                <div className="bg-white rounded-2xl border overflow-hidden overflow-x-auto">
                    <table className="w-full text-sm min-w-[700px]">
                        <thead className="bg-slate-50 text-slate-500 border-b">
                            <tr>
                                <th className="px-4 py-4 text-left">Kod</th>
                                <th className="px-4 py-4 text-left">Status</th>
                                <th className="px-4 py-4 text-left">Firma</th>
                                <th className="px-4 py-4 text-left">Korisnici</th>
                                <th className="px-4 py-4 text-left">Cena</th>
                                <th className="px-4 py-4 text-left">Kreiran</th>
                                <th className="px-4 py-4 text-right">Akcije</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {codes.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-4"><code className="px-3 py-1.5 bg-slate-100 rounded-lg font-mono text-xs">{c.code}</code></td>
                                    <td className="px-4 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${c.companyStatus === 'frozen' ? 'bg-red-100 text-red-700 font-bold' : c.status === 'used' ? 'bg-slate-100' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {c.companyStatus === 'frozen' ? 'ZAMRZNUTO' : c.status === 'used' ? 'Iskorišćen' : 'Dostupan'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-slate-700 font-medium">{c.companyName || '-'}</span>
                                            {c.companyStatus === 'frozen' && <span className="text-[10px] font-bold text-red-600">FROZEN</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        {c.status === 'used' ? (
                                            <div className="flex flex-col gap-0.5 text-xs">
                                                <span className="text-blue-600">{c.userCounts?.managers || 0} menadžera</span>
                                                <span className="text-emerald-600">{c.userCounts?.clients || 0} klijenata</span>
                                                <span className="text-purple-600">{c.userCounts?.drivers || 0} vozača</span>
                                            </div>
                                        ) : <span className="text-slate-400">-</span>}
                                    </td>
                                    <td className="px-4 py-4">
                                        {editingPrice === c.id ? (
                                            <div className="flex flex-col gap-2 min-w-[180px]">
                                                <div className="flex gap-1">
                                                    <input
                                                        type="number"
                                                        value={priceForm.price}
                                                        onChange={(e) => setPriceForm(prev => ({ ...prev, price: e.target.value }))}
                                                        placeholder="Cena"
                                                        className="w-20 px-2 py-1 border rounded text-xs"
                                                    />
                                                    <select
                                                        value={priceForm.currency}
                                                        onChange={(e) => setPriceForm(prev => ({ ...prev, currency: e.target.value }))}
                                                        className="px-1 py-1 border rounded text-xs"
                                                    >
                                                        <option value="EUR">EUR</option>
                                                        <option value="RSD">RSD</option>
                                                        <option value="USD">USD</option>
                                                    </select>
                                                </div>
                                                <select
                                                    value={priceForm.billing_type}
                                                    onChange={(e) => setPriceForm(prev => ({ ...prev, billing_type: e.target.value }))}
                                                    className="px-2 py-1 border rounded text-xs"
                                                >
                                                    <option value="one_time">Jednokratno</option>
                                                    <option value="monthly">Mesečno</option>
                                                    <option value="yearly">Godišnje</option>
                                                </select>
                                                <div className="flex gap-1">
                                                    <button onClick={() => savePrice(c.id)} className="px-2 py-1 bg-emerald-600 text-white rounded text-xs">Sačuvaj</button>
                                                    <button onClick={() => setEditingPrice(null)} className="px-2 py-1 bg-slate-200 rounded text-xs">Otkaži</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => togglePriceReveal(c.id)}
                                                    className="flex items-center gap-1 group"
                                                    title="Klikni da vidiš cenu"
                                                >
                                                    {revealedPrices[c.id] ? (
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-slate-700">{formatPrice(c)}</span>
                                                            {c.billing_type && <span className="text-[10px] text-slate-500">{billingTypeLabels[c.billing_type]}</span>}
                                                        </div>
                                                    ) : (
                                                        <span className="px-3 py-1 bg-slate-200 rounded text-slate-400 blur-[4px] select-none">{c.price ? `${c.price} ${c.currency || 'EUR'}` : '---'}</span>
                                                    )}
                                                    {revealedPrices[c.id] ? <EyeOff size={14} className="text-slate-400" /> : <Eye size={14} className="text-slate-400" />}
                                                </button>
                                                <button onClick={() => startEditPrice(c)} className="p-1 hover:bg-slate-100 rounded" title="Izmeni cenu">
                                                    <Edit3 size={14} className="text-slate-400" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-xs text-slate-500">{new Date(c.created_at).toLocaleDateString('sr-RS')}</td>
                                    <td className="px-4 py-4 text-right flex items-center justify-end gap-1">
                                        <button onClick={() => onCopy(c.code)} className="p-2 hover:bg-slate-100 rounded-lg" title="Kopiraj"><Copy size={16} /></button>

                                        {c.status === 'used' && c.companyCode && (
                                            <button
                                                onClick={() => handleFreeze(c.id, c.companyCode, c.companyStatus)}
                                                className={`p-2 rounded-lg ${c.companyStatus === 'frozen' ? 'bg-red-50 text-red-600' : 'hover:bg-slate-100 text-slate-400'}`}
                                                title={c.companyStatus === 'frozen' ? 'Odmrzni firmu' : 'Zamrzni firmu'}
                                            >
                                                {freezing === c.id ? <Loader2 size={16} className="animate-spin" /> : c.companyStatus === 'frozen' ? <Lock size={16} /> : <Unlock size={16} />}
                                            </button>
                                        )}

                                        {isAdmin && (
                                            <button onClick={() => setDeleteModal({ id: c.id, code: c.code })} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Obriši">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
