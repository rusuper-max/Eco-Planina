import { Building2, Lock, Edit3 } from 'lucide-react';
import { EmptyState } from '../common';

/**
 * Admin Companies Table - Lists all companies for admin management
 */
export const AdminCompaniesTable = ({ companies, onEdit }) => {
    if (!companies?.length) return <EmptyState icon={Building2} title="Nema firmi" desc="Firme će se prikazati ovde" />;

    return (
        <div className="bg-white rounded-2xl border overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 border-b">
                    <tr>
                        <th className="px-3 md:px-6 py-3 md:py-4 text-left whitespace-nowrap">Firma</th>
                        <th className="px-3 md:px-6 py-3 md:py-4 text-left whitespace-nowrap">ECO Kod</th>
                        <th className="px-3 md:px-6 py-3 md:py-4 text-left whitespace-nowrap">Status</th>
                        <th className="px-3 md:px-6 py-3 md:py-4 text-left whitespace-nowrap">Vlasnik</th>
                        <th className="px-3 md:px-6 py-3 md:py-4 text-center whitespace-nowrap">Menadžeri</th>
                        <th className="px-3 md:px-6 py-3 md:py-4 text-center whitespace-nowrap">Vozači</th>
                        <th className="px-3 md:px-6 py-3 md:py-4 text-center whitespace-nowrap">Klijenti</th>
                        <th className="px-3 md:px-6 py-3 md:py-4 text-right sticky right-0 bg-slate-50">Akcije</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {companies.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50">
                            <td className="px-3 md:px-6 py-3 md:py-4 font-medium whitespace-nowrap">{c.name}</td>
                            <td className="px-3 md:px-6 py-3 md:py-4"><code className="px-2 py-1 bg-slate-100 rounded text-xs">{c.code}</code></td>
                            <td className="px-3 md:px-6 py-3 md:py-4">
                                {c.status === 'frozen' ? (
                                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1 w-fit whitespace-nowrap"><Lock size={12} /> Zamrznuta</span>
                                ) : (
                                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium whitespace-nowrap">Aktivna</span>
                                )}
                            </td>
                            <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                                {c.ownerName ? (
                                    <span className="text-purple-700 font-medium">{c.ownerName}</span>
                                ) : (
                                    <span className="text-slate-400 text-xs">Nije dodeljen</span>
                                )}
                            </td>
                            <td className="px-3 md:px-6 py-3 md:py-4 text-center">{c.managerCount || 0}</td>
                            <td className="px-3 md:px-6 py-3 md:py-4 text-center">{c.driverCount || 0}</td>
                            <td className="px-3 md:px-6 py-3 md:py-4 text-center">{c.clientCount || 0}</td>
                            <td className="px-3 md:px-6 py-3 md:py-4 text-right sticky right-0 bg-white">
                                <button onClick={() => onEdit(c)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600" title="Izmeni firmu">
                                    <Edit3 size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default AdminCompaniesTable;
