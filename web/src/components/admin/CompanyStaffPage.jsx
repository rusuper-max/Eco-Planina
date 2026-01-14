import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context';
import {
    Users, Search, Filter, ChevronDown, Edit3, Trash2, MapPin,
    UserPlus, Loader2, X, AlertTriangle, ArrowUp, ArrowDown,
    Shield, Truck as TruckIcon, User as UserIcon, Building2,
    LogIn, Eye, Package
} from 'lucide-react';
import { EmptyState } from '../common';
import toast from 'react-hot-toast';

// Role configuration
const ROLE_CONFIG = {
    manager: { label: 'Menadzer', color: 'bg-emerald-100 text-emerald-700', avatarBg: 'bg-emerald-600', icon: Shield },
    driver: { label: 'Vozac', color: 'bg-amber-100 text-amber-700', avatarBg: 'bg-amber-600', icon: TruckIcon },
    client: { label: 'Klijent', color: 'bg-blue-100 text-blue-700', avatarBg: 'bg-blue-600', icon: UserIcon }
};

/**
 * CompanyStaffPage - Manage company employees (managers, drivers, clients)
 * For company_admin only
 */
export const CompanyStaffPage = () => {
    const { companyCode, user, isCompanyAdmin, isAdmin, impersonateUser } = useAuth();
    const [staff, setStaff] = useState([]);
    const [regions, setRegions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [regionFilter, setRegionFilter] = useState('all');
    const [sortBy, setSortBy] = useState('name'); // name, role, region
    const [sortDir, setSortDir] = useState('asc'); // asc, desc
    const [editingUser, setEditingUser] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [changingRole, setChangingRole] = useState(null);
    const [impersonating, setImpersonating] = useState(null);

    // Fetch staff and regions
    const fetchData = async () => {
        try {
            setLoading(true);
            const [staffRes, regionsRes] = await Promise.all([
                supabase
                    .from('users')
                    .select('id, name, phone, role, region_id, address, created_at')
                    .eq('company_code', companyCode)
                    .in('role', ['manager', 'driver', 'client']) // Include clients
                    .is('deleted_at', null)
                    .order('role')
                    .order('name'),
                supabase
                    .from('regions')
                    .select('id, name')
                    .eq('company_code', companyCode)
                    .is('deleted_at', null)
                    .order('name')
            ]);

            if (staffRes.error) throw staffRes.error;
            if (regionsRes.error) throw regionsRes.error;

            setStaff(staffRes.data || []);
            setRegions(regionsRes.data || []);
        } catch (error) {
            console.error('Error fetching staff:', error);
            toast.error('Greska pri ucitavanju');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (companyCode) fetchData();
    }, [companyCode]);

    // Role order for sorting
    const roleOrder = { manager: 1, driver: 2, client: 3 };

    // Filter and sort staff
    const filteredStaff = useMemo(() => {
        let result = staff.filter(s => {
            const matchesSearch = !searchQuery ||
                s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.phone?.includes(searchQuery) ||
                s.address?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = roleFilter === 'all' || s.role === roleFilter;
            const matchesRegion = regionFilter === 'all' ||
                (regionFilter === 'none' ? !s.region_id : s.region_id === regionFilter);
            return matchesSearch && matchesRole && matchesRegion;
        });

        // Sort
        result.sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'name') {
                comparison = (a.name || '').localeCompare(b.name || '', 'sr');
            } else if (sortBy === 'role') {
                comparison = (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99);
            } else if (sortBy === 'region') {
                const aRegion = regions.find(r => r.id === a.region_id)?.name || 'zzz';
                const bRegion = regions.find(r => r.id === b.region_id)?.name || 'zzz';
                comparison = aRegion.localeCompare(bRegion, 'sr');
            }
            return sortDir === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [staff, searchQuery, roleFilter, regionFilter, sortBy, sortDir, regions]);

    // Toggle sort
    const handleSort = (column) => {
        if (sortBy === column) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortDir('asc');
        }
    };

    // Sort indicator component
    const SortIndicator = ({ column }) => {
        if (sortBy !== column) return <ArrowUp size={14} className="opacity-0 group-hover:opacity-30" />;
        return sortDir === 'asc'
            ? <ArrowUp size={14} className="text-emerald-600" />
            : <ArrowDown size={14} className="text-emerald-600" />;
    };

    // Get region name by ID
    const getRegionName = (regionId) => {
        if (!regionId) return 'Nije dodeljeno';
        return regions.find(r => r.id === regionId)?.name || 'Nepoznato';
    };

    // Update user region directly from dropdown
    const handleUpdateRegion = async (userId, regionId) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ region_id: regionId || null })
                .eq('id', userId);

            if (error) throw error;

            setStaff(prev => prev.map(s =>
                s.id === userId ? { ...s, region_id: regionId || null } : s
            ));
            toast.success('Filijala azurirana');
            setEditingUser(null);
        } catch (error) {
            toast.error('Greska: ' + error.message);
        }
    };

    // Change role (manager <-> driver)
    const handleChangeRole = async (userId, newRole) => {
        if (!['manager', 'driver'].includes(newRole)) return;

        setChangingRole(userId);
        try {
            const { error } = await supabase
                .from('users')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;

            setStaff(prev => prev.map(s =>
                s.id === userId ? { ...s, role: newRole } : s
            ));
            toast.success(`Uloga promenjena u ${newRole === 'manager' ? 'Menadzer' : 'Vozac'}`);
        } catch (error) {
            toast.error('Greska: ' + error.message);
        } finally {
            setChangingRole(null);
        }
    };

    // Impersonate user (managers and drivers only)
    const handleImpersonate = async (member) => {
        if (member.role === 'client') {
            toast.error('Nije moguce impersonirati klijente');
            return;
        }

        setImpersonating(member.id);
        try {
            if (typeof impersonateUser === 'function') {
                await impersonateUser(member.id);
                toast.success(`Ulogovani kao ${member.name}`);
            } else {
                // Fallback - store in localStorage and reload
                localStorage.setItem('impersonate_user_id', member.id);
                window.location.reload();
            }
        } catch (error) {
            toast.error('Greska pri impersonaciji: ' + error.message);
        } finally {
            setImpersonating(null);
        }
    };

    // Soft delete user
    const handleDeleteUser = async (userId) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', userId);

            if (error) throw error;

            setStaff(prev => prev.filter(s => s.id !== userId));
            toast.success('Korisnik uklonjen');
            setDeleteConfirm(null);
        } catch (error) {
            toast.error('Greska: ' + error.message);
        }
    };

    // Stats
    const stats = useMemo(() => ({
        total: staff.length,
        managers: staff.filter(s => s.role === 'manager').length,
        drivers: staff.filter(s => s.role === 'driver').length,
        clients: staff.filter(s => s.role === 'client').length,
        unassigned: staff.filter(s => !s.region_id).length
    }), [staff]);

    if (!isCompanyAdmin() && !isAdmin()) {
        return (
            <div className="p-8 text-center text-slate-500">
                Nemate pristup ovoj stranici.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Korisnici firme</h1>
                    <p className="text-slate-500">Upravljajte menadzerima, vozacima i klijentima</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                            <p className="text-xs text-slate-500">Ukupno</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <Shield className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{stats.managers}</p>
                            <p className="text-xs text-slate-500">Menadzera</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <TruckIcon className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{stats.drivers}</p>
                            <p className="text-xs text-slate-500">Vozaca</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{stats.clients}</p>
                            <p className="text-xs text-slate-500">Klijenata</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{stats.unassigned}</p>
                            <p className="text-xs text-slate-500">Bez filijale</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Pretrazi po imenu, telefonu ili adresi..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                >
                    <option value="all">Sve uloge</option>
                    <option value="manager">Menadzeri</option>
                    <option value="driver">Vozaci</option>
                    <option value="client">Klijenti</option>
                </select>
                <select
                    value={regionFilter}
                    onChange={(e) => setRegionFilter(e.target.value)}
                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                >
                    <option value="all">Sve filijale</option>
                    <option value="none">Bez filijale</option>
                    {regions.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                </select>
            </div>

            {/* Staff Table */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                </div>
            ) : filteredStaff.length === 0 ? (
                <EmptyState
                    icon={Users}
                    title={searchQuery || roleFilter !== 'all' || regionFilter !== 'all' ? "Nema rezultata" : "Nema korisnika"}
                    desc="Korisnici koji se registruju sa vasim ECO kodom ce se pojaviti ovde"
                />
            ) : (
                <div className="bg-white rounded-2xl border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th
                                        onClick={() => handleSort('name')}
                                        className="px-6 py-4 text-left font-medium text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors group"
                                    >
                                        <div className="flex items-center gap-2">
                                            Korisnik
                                            <SortIndicator column="name" />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left font-medium text-slate-500">Kontakt</th>
                                    <th
                                        onClick={() => handleSort('role')}
                                        className="px-6 py-4 text-left font-medium text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors group"
                                    >
                                        <div className="flex items-center gap-2">
                                            Uloga
                                            <SortIndicator column="role" />
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort('region')}
                                        className="px-6 py-4 text-left font-medium text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors group"
                                    >
                                        <div className="flex items-center gap-2">
                                            Filijala
                                            <SortIndicator column="region" />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-right font-medium text-slate-500">Akcije</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredStaff.map(member => {
                                    const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.client;
                                    const RoleIcon = roleConfig.icon;
                                    return (
                                        <tr key={member.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${roleConfig.avatarBg}`}>
                                                        {member.name?.charAt(0)?.toUpperCase() || '?'}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-slate-800 block">{member.name}</span>
                                                        {member.address && (
                                                            <span className="text-xs text-slate-400 block truncate max-w-[200px]">{member.address}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">{member.phone}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${roleConfig.color}`}>
                                                    <RoleIcon size={12} />
                                                    {roleConfig.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {/* Dropdown for region selection */}
                                                <select
                                                    value={member.region_id || ''}
                                                    onChange={(e) => handleUpdateRegion(member.id, e.target.value || null)}
                                                    className={`text-sm px-2 py-1.5 border rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none ${
                                                        member.region_id ? 'border-purple-200 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-400'
                                                    }`}
                                                >
                                                    <option value="">Bez filijale</option>
                                                    {regions.map(r => (
                                                        <option key={r.id} value={r.id}>{r.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    {/* Impersonate button - only for managers and drivers */}
                                                    {member.role !== 'client' && (
                                                        <button
                                                            onClick={() => handleImpersonate(member)}
                                                            disabled={impersonating === member.id}
                                                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                            title={`Uloguj se kao ${member.name}`}
                                                        >
                                                            {impersonating === member.id ? (
                                                                <Loader2 size={18} className="animate-spin" />
                                                            ) : (
                                                                <LogIn size={18} />
                                                            )}
                                                        </button>
                                                    )}

                                                    {/* Promote/Demote buttons - only for managers and drivers */}
                                                    {member.role === 'driver' && (
                                                        <button
                                                            onClick={() => handleChangeRole(member.id, 'manager')}
                                                            disabled={changingRole === member.id}
                                                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                            title="Promovi u Menadzera"
                                                        >
                                                            {changingRole === member.id ? (
                                                                <Loader2 size={18} className="animate-spin" />
                                                            ) : (
                                                                <ArrowUp size={18} />
                                                            )}
                                                        </button>
                                                    )}
                                                    {member.role === 'manager' && (
                                                        <button
                                                            onClick={() => handleChangeRole(member.id, 'driver')}
                                                            disabled={changingRole === member.id}
                                                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                            title="Degradiraj u Vozaca"
                                                        >
                                                            {changingRole === member.id ? (
                                                                <Loader2 size={18} className="animate-spin" />
                                                            ) : (
                                                                <ArrowDown size={18} />
                                                            )}
                                                        </button>
                                                    )}

                                                    {/* Delete button */}
                                                    <button
                                                        onClick={() => setDeleteConfirm(member)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Ukloni"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Table footer with count */}
                    <div className="px-6 py-3 bg-slate-50 border-t text-sm text-slate-500">
                        Prikazano {filteredStaff.length} od {staff.length} korisnika
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">Ukloni korisnika</h3>
                                <p className="text-sm text-slate-500">Ova akcija se ne moze ponistiti</p>
                            </div>
                        </div>
                        <p className="text-slate-600 mb-6">
                            Da li ste sigurni da zelite da uklonite korisnika <strong>"{deleteConfirm.name}"</strong>?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-slate-700"
                            >
                                Otkazi
                            </button>
                            <button
                                onClick={() => handleDeleteUser(deleteConfirm.id)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium"
                            >
                                Ukloni
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompanyStaffPage;
