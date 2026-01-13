import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context';
import {
    Users, Search, Filter, ChevronDown, Edit3, Trash2, MapPin,
    UserPlus, Loader2, X, AlertTriangle, ArrowUp, ArrowDown,
    Shield, Truck as TruckIcon, User as UserIcon, Building2
} from 'lucide-react';
import { EmptyState } from '../common';
import toast from 'react-hot-toast';

/**
 * CompanyStaffPage - Manage company employees (managers, drivers)
 * For company_admin only
 */
export const CompanyStaffPage = () => {
    const { companyCode, user, isCompanyAdmin, isAdmin } = useAuth();
    const [staff, setStaff] = useState([]);
    const [regions, setRegions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [regionFilter, setRegionFilter] = useState('all');
    const [editingUser, setEditingUser] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [changingRole, setChangingRole] = useState(null);

    // Fetch staff and regions
    const fetchData = async () => {
        try {
            setLoading(true);
            const [staffRes, regionsRes] = await Promise.all([
                supabase
                    .from('users')
                    .select('id, name, phone, role, region_id, created_at')
                    .eq('company_code', companyCode)
                    .in('role', ['manager', 'driver'])
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

    // Filter staff
    const filteredStaff = useMemo(() => {
        return staff.filter(s => {
            const matchesSearch = !searchQuery ||
                s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.phone?.includes(searchQuery);
            const matchesRole = roleFilter === 'all' || s.role === roleFilter;
            const matchesRegion = regionFilter === 'all' ||
                (regionFilter === 'none' ? !s.region_id : s.region_id === regionFilter);
            return matchesSearch && matchesRole && matchesRegion;
        });
    }, [staff, searchQuery, roleFilter, regionFilter]);

    // Get region name by ID
    const getRegionName = (regionId) => {
        if (!regionId) return 'Nije dodeljeno';
        return regions.find(r => r.id === regionId)?.name || 'Nepoznato';
    };

    // Update user region
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
                    <h1 className="text-2xl font-bold text-slate-800">Osoblje</h1>
                    <p className="text-slate-500">Upravljajte menadzerima i vozacima vase firme</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
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
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-slate-600" />
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
                        placeholder="Pretrazi po imenu ili telefonu..."
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
                    title={searchQuery || roleFilter !== 'all' || regionFilter !== 'all' ? "Nema rezultata" : "Nema osoblja"}
                    desc="Korisnici koji se registruju sa vasim ECO kodom ce se pojaviti ovde"
                />
            ) : (
                <div className="bg-white rounded-2xl border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="px-6 py-4 text-left font-medium text-slate-500">Ime</th>
                                    <th className="px-6 py-4 text-left font-medium text-slate-500">Telefon</th>
                                    <th className="px-6 py-4 text-left font-medium text-slate-500">Uloga</th>
                                    <th className="px-6 py-4 text-left font-medium text-slate-500">Filijala</th>
                                    <th className="px-6 py-4 text-right font-medium text-slate-500">Akcije</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredStaff.map(member => (
                                    <tr key={member.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                                                    member.role === 'manager' ? 'bg-emerald-600' : 'bg-amber-600'
                                                }`}>
                                                    {member.name?.charAt(0)?.toUpperCase() || '?'}
                                                </div>
                                                <span className="font-medium text-slate-800">{member.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{member.phone}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                                member.role === 'manager'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {member.role === 'manager' ? 'Menadzer' : 'Vozac'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => setEditingUser(member)}
                                                className="flex items-center gap-1.5 text-slate-600 hover:text-emerald-600"
                                            >
                                                <MapPin size={14} />
                                                <span className={member.region_id ? '' : 'text-slate-400 italic'}>
                                                    {getRegionName(member.region_id)}
                                                </span>
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-1">
                                                {/* Promote/Demote buttons */}
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
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Edit Region Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-bold text-slate-800">Dodeli filijalu</h3>
                                <p className="text-sm text-slate-500">{editingUser.name}</p>
                            </div>
                            <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-slate-200 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-3">
                            <button
                                onClick={() => handleUpdateRegion(editingUser.id, null)}
                                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                                    !editingUser.region_id
                                        ? 'border-emerald-500 bg-emerald-50'
                                        : 'border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <p className="font-medium text-slate-800">Bez filijale</p>
                                <p className="text-sm text-slate-500">Korisnik nece biti dodeljen nijednoj filijali</p>
                            </button>
                            {regions.map(region => (
                                <button
                                    key={region.id}
                                    onClick={() => handleUpdateRegion(editingUser.id, region.id)}
                                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                                        editingUser.region_id === region.id
                                            ? 'border-emerald-500 bg-emerald-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <MapPin size={20} className="text-purple-600" />
                                        <p className="font-medium text-slate-800">{region.name}</p>
                                    </div>
                                </button>
                            ))}
                            {regions.length === 0 && (
                                <p className="text-center text-slate-500 py-4">
                                    Nema kreiranih filijala. Kreirajte filijalu u sekciji "Filijale".
                                </p>
                            )}
                        </div>
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
