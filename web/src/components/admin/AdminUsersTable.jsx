import { useState, useMemo, useEffect } from 'react';
import { Trash2, Eye, LogIn, Edit3, ArrowUpDown, ArrowUp, ArrowDown, Search, X, Lock, Unlock, AlertTriangle, Users, Loader2 } from 'lucide-react';
import { EmptyState } from '../common';
import { UserDetailsModal } from './UserDetailsModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

export const AdminUsersTable = ({ users, onDelete, isDeveloper, onImpersonate, onChangeRole, onRefresh, onEditUser, isAdmin }) => {
    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'role', direction: 'asc' });
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    const [deleteModal, setDeleteModal] = useState(null);
    const [detailsModal, setDetailsModal] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [changingRole, setChangingRole] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const getRoleConfig = (role) => {
        switch (role) {
            case 'developer':
                return { label: 'Developer', className: 'bg-slate-800 text-white', priority: 1 };
            case 'admin':
                return { label: 'Admin', className: 'bg-blue-100 text-blue-700', priority: 2 };
            case 'company_admin':
                return { label: 'Vlasnik', className: 'bg-purple-100 text-purple-700', priority: 3 };
            case 'manager':
                return { label: 'Menadžer', className: 'bg-emerald-100 text-emerald-700', priority: 4 };
            case 'driver':
                return { label: 'Vozač', className: 'bg-amber-100 text-amber-700', priority: 5 };
            default:
                return { label: 'Klijent', className: 'bg-slate-100 text-slate-700', priority: 6 };
        }
    };

    // Filter & Sort
    const filteredUsers = useMemo(() => {
        let result = [...(users || [])];
        if (searchQuery) {
            const low = searchQuery.toLowerCase();
            result = result.filter(u =>
                u.name?.toLowerCase().includes(low) ||
                u.phone?.includes(low) ||
                u.company?.name?.toLowerCase().includes(low) ||
                (getRoleConfig(u.role).label.toLowerCase().includes(low))
            );
        }
        if (sortConfig.key) {
            result.sort((a, b) => {
                let aVal = a[sortConfig.key] || '';
                let bVal = b[sortConfig.key] || '';

                if (sortConfig.key === 'company') { aVal = a.company?.name || ''; bVal = b.company?.name || ''; }
                if (sortConfig.key === 'role') {
                    aVal = getRoleConfig(a.role).priority;
                    bVal = getRoleConfig(b.role).priority;
                }

                if (typeof aVal === 'string') aVal = aVal.toLowerCase();
                if (typeof bVal === 'string') bVal = bVal.toLowerCase();

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [users, searchQuery, sortConfig]);

    // Pagination
    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredUsers, currentPage]);

    // Reset page when search changes
    useEffect(() => { setCurrentPage(1); }, [searchQuery]);

    const handleSort = (key) => {
        setSortConfig(curr => ({ key, direction: curr.key === key && curr.direction === 'asc' ? 'desc' : 'asc' }));
    };

    const toggleSelect = (id, e) => {
        e.stopPropagation();
        const newSet = new Set(selectedUsers);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setSelectedUsers(newSet);
    };

    const toggleSelectAll = () => {
        // Filter out protected roles from selection
        const selectableUsers = filteredUsers.filter(u => u.role !== 'developer');
        if (selectedUsers.size === selectableUsers.length) setSelectedUsers(new Set());
        else setSelectedUsers(new Set(selectableUsers.map(u => u.id)));
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            if (deleteModal.type === 'bulk') {
                for (const id of deleteModal.ids) {
                    await onDelete(id);
                }
            } else {
                await onDelete(deleteModal.ids[0]);
            }
            setSelectedUsers(new Set());
            setDeleteModal(null);
        } catch (error) {
            console.error(error);
            alert('Greška pri brisanju korisnika');
        } finally {
            setIsDeleting(false);
        }
    };

    const isProtected = (role) => role === 'developer';

    if (!users?.length && !searchQuery) return <EmptyState icon={Users} title="Nema korisnika" desc="Korisnici će se prikazati ovde" />;

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Pretraži korisnike, firme, telefone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                </div>
                {selectedUsers.size > 0 && isAdmin && (
                    <button
                        onClick={() => setDeleteModal({ type: 'bulk', ids: [...selectedUsers], expected: 'DELETE' })}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 font-medium transition-colors"
                    >
                        <Trash2 size={18} />
                        <span>Obriši označene ({selectedUsers.size})</span>
                    </button>
                )}
            </div>

            <div className="bg-white rounded-2xl border overflow-x-auto">
                <table className="w-full text-sm min-w-[800px]">
                    <thead className="bg-slate-50 text-slate-500 border-b">
                        <tr>
                            <th className="px-3 md:px-6 py-3 md:py-4 w-10">
                                <input
                                    type="checkbox"
                                    checked={filteredUsers.length > 0 && selectedUsers.size === filteredUsers.filter(u => !isProtected(u.role)).length}
                                    onChange={toggleSelectAll}
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                            </th>
                            {[
                                { key: 'name', label: 'Korisnik' },
                                { key: 'phone', label: 'Telefon' },
                                { key: 'role', label: 'Uloga' },
                                { key: 'company', label: 'Firma' }
                            ].map(col => (
                                <th key={col.key} className="px-3 md:px-6 py-3 md:py-4 text-left cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap" onClick={() => handleSort(col.key)}>
                                    <div className="flex items-center gap-1">
                                        {col.label}
                                        {sortConfig.key === col.key && (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                    </div>
                                </th>
                            ))}
                            <th className="px-3 md:px-6 py-3 md:py-4 text-right sticky right-0 bg-slate-50">Akcije</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredUsers.length === 0 ? (
                            <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">Nema rezultata za "{searchQuery}"</td></tr>
                        ) : (
                            paginatedUsers.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setDetailsModal(u)}>
                                    <td className="px-3 md:px-6 py-3 md:py-4" onClick={(e) => e.stopPropagation()}>
                                        {!isProtected(u.role) && (
                                            <input
                                                type="checkbox"
                                                checked={selectedUsers.has(u.id)}
                                                onChange={(e) => toggleSelect(u.id, e)}
                                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                        )}
                                    </td>
                                    <td className="px-3 md:px-6 py-3 md:py-4 font-medium whitespace-nowrap">{u.name}</td>
                                    <td className="px-3 md:px-6 py-3 md:py-4 text-slate-600 whitespace-nowrap">{u.phone}</td>
                                    <td className="px-3 md:px-6 py-3 md:py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getRoleConfig(u.role).className}`}>
                                            {getRoleConfig(u.role).label}
                                        </span>
                                    </td>
                                    <td className="px-3 md:px-6 py-3 md:py-4">
                                        <div className="flex items-center gap-2 whitespace-nowrap">
                                            <span className="text-slate-600">{u.company?.name || '-'}</span>
                                            {u.company?.status === 'frozen' && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1 rounded">FROZEN</span>}
                                        </div>
                                    </td>
                                    <td className="px-3 md:px-6 py-3 md:py-4 text-right sticky right-0 bg-white" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-1">
                                            {/* Edit button */}
                                            {!isProtected(u.role) && (
                                                <button
                                                    onClick={() => onEditUser(u)}
                                                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                                    title="Izmeni korisnika"
                                                >
                                                    <Edit3 size={18} />
                                                </button>
                                            )}
                                            {/* Impersonate button - for non-admin/dev users */}
                                            {!isProtected(u.role) && u.role !== 'admin' && (
                                                <button
                                                    onClick={() => onImpersonate(u.id)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Pristupi nalogu"
                                                >
                                                    <LogIn size={18} />
                                                </button>
                                            )}
                                            {/* Role change buttons - hierarchy: client <-> driver <-> manager */}
                                            {/* Promote button (client->driver, driver->manager) */}
                                            {(u.role === 'client' || u.role === 'driver') && (
                                                <button
                                                    onClick={async () => {
                                                        setChangingRole(u.id);
                                                        const newRole = u.role === 'client' ? 'driver' : 'manager';
                                                        try {
                                                            await onChangeRole(u.id, newRole);
                                                            onRefresh();
                                                        } catch (err) { alert(err.message); }
                                                        finally { setChangingRole(null); }
                                                    }}
                                                    disabled={changingRole === u.id}
                                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                    title={u.role === 'client' ? 'Promovi u Vozača' : 'Promovi u Menadžera'}
                                                >
                                                    {changingRole === u.id ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={18} />}
                                                </button>
                                            )}
                                            {/* Demote button (manager->driver, driver->client) */}
                                            {(u.role === 'manager' || u.role === 'driver') && (
                                                <button
                                                    onClick={async () => {
                                                        setChangingRole(u.id);
                                                        const newRole = u.role === 'manager' ? 'driver' : 'client';
                                                        try {
                                                            await onChangeRole(u.id, newRole);
                                                            onRefresh();
                                                        } catch (err) { alert(err.message); }
                                                        finally { setChangingRole(null); }
                                                    }}
                                                    disabled={changingRole === u.id}
                                                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                    title={u.role === 'manager' ? 'Degradiraj u Vozača' : 'Degradiraj u Klijenta'}
                                                >
                                                    {changingRole === u.id ? <Loader2 size={18} className="animate-spin" /> : <ArrowDown size={18} />}
                                                </button>
                                            )}
                                            {/* Delete button - for admin/developer */}
                                            {isAdmin && !isProtected(u.role) && (
                                                <button
                                                    onClick={() => setDeleteModal({ type: 'single', ids: [u.id], expected: 'DELETE' })}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Obriši"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
                    <p className="text-sm text-slate-500">
                        Prikazano {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} od {filteredUsers.length}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Prethodna
                        </button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-8 h-8 text-sm font-medium rounded-lg ${currentPage === page ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Sledeća
                        </button>
                    </div>
                </div>
            )}

            {/* Modals */}
            {detailsModal && <UserDetailsModal user={detailsModal} onClose={() => setDetailsModal(null)} />}
            {deleteModal && (
                <DeleteConfirmationModal
                    title={deleteModal.type === 'bulk' ? 'Obriši označene korisnike' : 'Obriši korisnika'}
                    warning="Ova akcija je trajna i ne može se poništiti."
                    expectedInput={deleteModal.expected}
                    onClose={() => setDeleteModal(null)}
                    onConfirm={confirmDelete}
                    loading={isDeleting}
                />
            )}
        </div>
    );
};
