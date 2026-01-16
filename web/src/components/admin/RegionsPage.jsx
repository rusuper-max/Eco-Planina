import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context';
import { useData } from '../../context/DataContext';
import { MapPin, Plus, Edit3, Trash2, Users, Loader2, Search, X, AlertTriangle, User, Truck, Check, Building2, LayoutGrid, UserPlus, Network } from 'lucide-react';
import { EmptyState } from '../common';
import { RegionNodeEditor } from './RegionNodeEditor';
import toast from 'react-hot-toast';

// Predefinisani srpski gradovi za brzu selekciju
const SERBIAN_CITIES = [
    'Beograd', 'Novi Sad', 'Niš', 'Kragujevac', 'Subotica', 'Zrenjanin',
    'Pančevo', 'Čačak', 'Novi Pazar', 'Kraljevo', 'Smederevo', 'Leskovac',
    'Užice', 'Valjevo', 'Kruševac', 'Vranje', 'Šabac', 'Sombor'
];

const ROLE_OPTIONS = [
    { value: 'all', label: 'Svi korisnici' },
    { value: 'manager', label: 'Menadžeri' },
    { value: 'driver', label: 'Vozači' },
    { value: 'client', label: 'Klijenti' }
];

const ROLE_COLORS = {
    manager: 'bg-emerald-100 text-emerald-700',
    driver: 'bg-amber-100 text-amber-700',
    client: 'bg-blue-100 text-blue-700',
    company_admin: 'bg-purple-100 text-purple-700'
};

const ROLE_LABELS = {
    manager: 'Menadžer',
    driver: 'Vozač',
    client: 'Klijent',
    company_admin: 'Admin'
};

/**
 * RegionsPage - Manage company branches/regions (for company_admin only)
 */
export const RegionsPage = () => {
    const { companyCode, isCompanyAdmin, isAdmin } = useAuth();
    const { fetchCompanyRegions, createRegion, updateRegion, deleteRegion, assignUsersToRegion, fetchUsersByAddressPattern, fetchUsersGroupedByRegion } = useData();

    const [activeTab, setActiveTab] = useState('regions'); // 'regions' | 'assign' | 'visual'
    const [regions, setRegions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingRegion, setEditingRegion] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [groupedUsers, setGroupedUsers] = useState({ regions: [], unassigned: [] });

    // Load regions
    const fetchRegions = async () => {
        try {
            setLoading(true);
            const data = await fetchCompanyRegions();
            setRegions(data);
        } catch (error) {
            console.error('Error fetching regions:', error);
            toast.error('Greška pri učitavanju filijala');
        } finally {
            setLoading(false);
        }
    };

    const refreshGroupedUsers = async () => {
        try {
            const data = await fetchUsersGroupedByRegion();
            setGroupedUsers(data);
        } catch (error) {
            console.error('Error fetching users grouped by region:', error);
        }
    };

    useEffect(() => {
        if (companyCode) {
            fetchRegions();
            refreshGroupedUsers();
        }
    }, [companyCode]);

    // Filter regions
    const filteredRegions = regions.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Add region
    const handleAddRegion = async (name) => {
        try {
            await createRegion(name);
            toast.success('Filijala kreirana');
            setShowAddModal(false);
            fetchRegions();
        } catch (error) {
            if (error.code === '23505') {
                toast.error('Filijala sa tim imenom već postoji');
            } else {
                toast.error(error.message || 'Greška pri kreiranju');
            }
        }
    };

    // Update region
    const handleUpdateRegion = async (id, name) => {
        try {
            await updateRegion(id, name);
            toast.success('Filijala ažurirana');
            setEditingRegion(null);
            fetchRegions();
        } catch (error) {
            toast.error(error.message || 'Greška pri ažuriranju');
        }
    };

    // Delete region (soft delete)
    const handleDeleteRegion = async (id) => {
        try {
            const region = regions.find(r => r.id === id);
            if (region?.userCount > 0) {
                throw new Error('Nije moguće obrisati filijalu koja ima korisnike');
            }
            // Prevent deletion of last region
            if (regions.length <= 1) {
                throw new Error('Nije moguće obrisati poslednju filijalu. Kompanija mora imati bar jednu filijalu.');
            }
            await deleteRegion(id);
            toast.success('Filijala obrisana');
            setDeleteConfirm(null);
            fetchRegions();
        } catch (error) {
            toast.error(error.message || 'Greška pri brisanju');
        }
    };

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
                    <h1 className="text-2xl font-bold text-slate-800">Filijale</h1>
                    <p className="text-slate-500">Upravljajte filijalama i dodeljujte korisnike</p>
                </div>
                {activeTab === 'regions' && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
                    >
                        <Plus size={20} />
                        Nova filijala
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('regions')}
                    className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                        activeTab === 'regions'
                            ? 'border-b-2 border-emerald-500 text-emerald-600'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <LayoutGrid size={18} />
                    Filijale ({regions.length})
                </button>
                <button
                    onClick={() => setActiveTab('assign')}
                    className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                        activeTab === 'assign'
                            ? 'border-b-2 border-emerald-500 text-emerald-600'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <UserPlus size={18} />
                    Dodeli Korisnike
                </button>
                <button
                    onClick={() => setActiveTab('visual')}
                    className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                        activeTab === 'visual'
                            ? 'border-b-2 border-emerald-500 text-emerald-600'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Network size={18} />
                    Vizuelni Pregled
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'regions' && (
                <RegionsListTab
                    regions={filteredRegions}
                    loading={loading}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onEdit={setEditingRegion}
                    onDelete={setDeleteConfirm}
                    totalRegions={regions.length}
                    groupedUsers={groupedUsers}
                    onMoveUser={async (userId, targetRegionId) => {
                        await assignUsersToRegion([userId], targetRegionId);
                        toast.success('Korisnik prebačen');
                        refreshGroupedUsers();
                        fetchRegions();
                    }}
                    onRefreshUsers={refreshGroupedUsers}
                />
            )}

            {activeTab === 'assign' && (
                <AssignUsersTab
                    regions={regions}
                    onRefresh={fetchRegions}
                />
            )}

            {activeTab === 'visual' && (
                <RegionNodeEditor />
            )}

            {/* Add Modal */}
            {showAddModal && (
                <RegionModal
                    title="Nova filijala"
                    onClose={() => setShowAddModal(false)}
                    onSubmit={handleAddRegion}
                />
            )}

            {/* Edit Modal */}
            {editingRegion && (
                <RegionModal
                    title="Izmeni filijalu"
                    initialName={editingRegion.name}
                    onClose={() => setEditingRegion(null)}
                    onSubmit={(name) => handleUpdateRegion(editingRegion.id, name)}
                />
            )}

            {/* Delete Confirm Modal */}
            {deleteConfirm && (
                <DeleteConfirmModal
                    region={deleteConfirm}
                    onClose={() => setDeleteConfirm(null)}
                    onConfirm={() => handleDeleteRegion(deleteConfirm.id)}
                />
            )}
        </div>
    );
};

/**
 * Regions List Tab - Grid view of all regions
 */
const RegionsListTab = ({ regions, loading, searchQuery, onSearchChange, onEdit, onDelete, totalRegions, groupedUsers, onMoveUser }) => {
    const [expanded, setExpanded] = useState(null);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Pretraži filijale..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
            </div>

            {/* Grid */}
            {regions.length === 0 ? (
                <EmptyState
                    icon={MapPin}
                    title={searchQuery ? "Nema rezultata" : "Nema filijala"}
                    desc={searchQuery ? `Nema rezultata za "${searchQuery}"` : "Kreirajte prvu filijalu da biste organizovali svoje korisnike po lokacijama"}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {regions.map(region => (
                        <div
                            key={region.id}
                            className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                        <MapPin className="w-6 h-6 text-purple-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-800">{region.name}</h3>
                                        <p className="text-sm text-slate-500 flex items-center gap-1">
                                            <Users size={14} />
                                            {region.userCount} korisnika
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                            <button
                                onClick={() => setExpanded(expanded === region.id ? null : region.id)}
                                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Prikaži korisnike"
                            >
                                {expanded === region.id ? <X size={18} /> : <Users size={18} />}
                            </button>
                                    <button
                                        onClick={() => onEdit(region)}
                                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                        title="Izmeni"
                                    >
                                        <Edit3 size={18} />
                                    </button>
                                    <button
                                        onClick={() => onDelete(region)}
                                        className={`p-2 rounded-lg transition-colors ${
                                            region.userCount > 0 || totalRegions <= 1
                                                ? 'text-slate-300 cursor-not-allowed'
                                                : 'text-red-500 hover:bg-red-50'
                                        }`}
                                        title={
                                            totalRegions <= 1
                                                ? 'Ne može se obrisati poslednja filijala'
                                                : region.userCount > 0
                                                    ? 'Ne može se obrisati - ima korisnike'
                                                    : 'Obriši'
                                        }
                                        disabled={region.userCount > 0 || totalRegions <= 1}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Expanded user list */}
                            {expanded === region.id && (
                                <RegionUsersPanel
                                    regionId={region.id}
                                    regions={regions}
                                    groupedUsers={groupedUsers}
                                    onMoveUser={onMoveUser}
                                />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const ROLE_ORDER = ['manager', 'driver', 'client', 'company_admin'];
const MAX_PER_ROLE = 200;

const RegionUsersPanel = ({ regionId, regions, groupedUsers, onMoveUser }) => {
    const users = getUsersForRegion(groupedUsers, regionId);
    if (users.length === 0) {
        return <p className="text-sm text-slate-500 mt-3">Nema korisnika u ovoj filijali.</p>;
    }

    const grouped = groupUsersByRole(users);

    return (
        <div className="mt-4 space-y-3 border-t pt-3">
            {ROLE_ORDER.filter(role => grouped[role] && grouped[role].length > 0).map(role => {
                const list = grouped[role];
                const sliced = list.slice(0, MAX_PER_ROLE);
                const truncated = list.length > MAX_PER_ROLE;
                return (
                    <div key={role} className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[role] || 'bg-slate-100 text-slate-700'}`}>
                                    {ROLE_LABELS[role] || role}
                                </span>
                                <span className="text-xs text-slate-500">{list.length} korisnika</span>
                            </div>
                        </div>
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {sliced.map(u => (
                                <div key={u.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-800 truncate">{u.name}</p>
                                            <p className="text-xs text-slate-500 truncate">{u.phone || u.email || 'Bez kontakta'}</p>
                                        </div>
                                    </div>
                                    <select
                                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white"
                                        value={regionId}
                                        onChange={(e) => onMoveUser(u.id, e.target.value)}
                                    >
                                        {regions.map(r => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                        {truncated && (
                            <p className="text-xs text-slate-400">Prikazano prvih {MAX_PER_ROLE} korisnika za ovu rolu.</p>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const getUsersForRegion = (groupedUsers, regionId) => {
    if (!groupedUsers?.regions) return [];
    const region = groupedUsers.regions.find(r => r.id === regionId);
    if (!region) return [];
    return (region.users || []).map(u => ({
        id: u.id,
        name: u.name,
        role: u.role,
        phone: u.phone,
        email: u.email,
        region_id: u.region_id
    }));
};

const groupUsersByRole = (users = []) => {
    return users.reduce((acc, u) => {
        const role = u.role || 'client';
        if (!acc[role]) acc[role] = [];
        acc[role].push(u);
        return acc;
    }, {});
};

// Pagination constants
const USERS_PER_PAGE = 50;

/**
 * Assign Users Tab - Batch assign users to regions
 */
const AssignUsersTab = ({ regions, onRefresh }) => {
    const { assignUsersToRegion, fetchUsersByAddressPattern } = useData();

    const [selectedRegion, setSelectedRegion] = useState(null);
    const [sourceRegionFilter, setSourceRegionFilter] = useState('all');
    const [addressFilter, setAddressFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [allUsers, setAllUsers] = useState([]); // All filtered users
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // Calculate paginated users
    const totalPages = Math.ceil(allUsers.length / USERS_PER_PAGE);
    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * USERS_PER_PAGE;
        return allUsers.slice(start, start + USERS_PER_PAGE);
    }, [allUsers, currentPage]);

    // Fetch users when filters change
    useEffect(() => {
        setCurrentPage(1); // Reset to page 1 when filter changes
        fetchUsers();
    }, [addressFilter, roleFilter, sourceRegionFilter]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await fetchUsersByAddressPattern(addressFilter, roleFilter);
            let filtered = data || [];
            if (sourceRegionFilter !== 'all') {
                filtered = filtered.filter(u => (u.region_id || null) === (sourceRegionFilter || null));
            }
            setAllUsers(filtered);
        } catch (err) {
            console.error('Error fetching users:', err);
        }
        setLoading(false);
    };

    // Toggle user selection
    const toggleUser = (userId) => {
        setSelectedUsers(prev => {
            const next = new Set(prev);
            if (next.has(userId)) {
                next.delete(userId);
            } else {
                next.add(userId);
            }
            return next;
        });
    };

    // Select/deselect all visible users on current page
    const toggleAll = () => {
        const pageUserIds = paginatedUsers.map(u => u.id);
        const allPageSelected = pageUserIds.every(id => selectedUsers.has(id));

        if (allPageSelected) {
            // Deselect all on current page
            setSelectedUsers(prev => {
                const next = new Set(prev);
                pageUserIds.forEach(id => next.delete(id));
                return next;
            });
        } else {
            // Select all on current page
            setSelectedUsers(prev => {
                const next = new Set(prev);
                pageUserIds.forEach(id => next.add(id));
                return next;
            });
        }
    };

    // Check if all users on current page are selected
    const allPageSelected = paginatedUsers.length > 0 &&
        paginatedUsers.every(u => selectedUsers.has(u.id));

    // Assign selected users to region
    const handleAssign = async () => {
        if (!selectedRegion || selectedUsers.size === 0) return;

        setAssigning(true);
        try {
            await assignUsersToRegion(Array.from(selectedUsers), selectedRegion.id);
            toast.success(`${selectedUsers.size} korisnika dodeljeno filijali "${selectedRegion.name}"`);
            setSelectedUsers(new Set());
            fetchUsers(); // Refresh to show updated region_id
            onRefresh(); // Refresh regions to update counts
        } catch (err) {
            toast.error('Greška pri dodeljivanju: ' + err.message);
        }
        setAssigning(false);
    };

    // Remove users from region (assign to null)
    const handleRemoveFromRegion = async () => {
        if (selectedUsers.size === 0) return;

        setAssigning(true);
        try {
            await assignUsersToRegion(Array.from(selectedUsers), null);
            toast.success(`${selectedUsers.size} korisnika uklonj eno iz filijale`);
            setSelectedUsers(new Set());
            fetchUsers();
            onRefresh();
        } catch (err) {
            toast.error('Greška: ' + err.message);
        }
        setAssigning(false);
    };

    // Get region name by ID
    const getRegionName = (regionId) => {
        if (!regionId) return null;
        return regions.find(r => r.id === regionId)?.name;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left: Regions Selection */}
            <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl border p-4 sticky top-4">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <MapPin size={18} className="text-purple-600" />
                        Odaberi Filijalu
                    </h3>

                    {regions.length === 0 ? (
                        <p className="text-slate-400 text-sm">Nema filijala. Kreirajte prvu.</p>
                    ) : (
                        <div className="space-y-2">
                            {regions.map(region => (
                                <button
                                    key={region.id}
                                    onClick={() => setSelectedRegion(region)}
                                    className={`w-full p-3 rounded-xl text-left transition-all ${
                                        selectedRegion?.id === region.id
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-slate-50 hover:bg-slate-100'
                                    }`}
                                >
                                    <p className="font-medium">{region.name}</p>
                                    <p className={`text-xs ${selectedRegion?.id === region.id ? 'text-emerald-100' : 'text-slate-400'}`}>
                                        {region.userCount} korisnika
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}

                    {selectedUsers.size > 0 && (
                        <div className="mt-4 pt-4 border-t space-y-2">
                            <button
                                onClick={handleAssign}
                                disabled={!selectedRegion || assigning}
                                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {assigning ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                Dodeli ({selectedUsers.size})
                            </button>
                            <button
                                onClick={handleRemoveFromRegion}
                                disabled={assigning}
                                className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <X size={18} />
                                Ukloni iz filijale
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Users List */}
            <div className="lg:col-span-3 space-y-4">
                {/* Quick City Buttons */}
                <div className="bg-white rounded-2xl border p-4">
                    <p className="text-sm text-slate-500 mb-3">Brzi izbor po gradu:</p>
                    <div className="flex flex-wrap gap-2">
                        {SERBIAN_CITIES.map(city => (
                            <button
                                key={city}
                                onClick={() => setAddressFilter(city)}
                                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                                    addressFilter === city
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {city}
                            </button>
                        ))}
                        {addressFilter && (
                            <button
                                onClick={() => setAddressFilter('')}
                                className="px-3 py-1.5 text-sm rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                            >
                                <X size={14} className="inline mr-1" />
                                Poništi
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            value={addressFilter}
                            onChange={(e) => setAddressFilter(e.target.value)}
                            placeholder="Pretraži po adresi..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    >
                        {ROLE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <select
                        value={sourceRegionFilter}
                        onChange={(e) => setSourceRegionFilter(e.target.value)}
                        className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    >
                        <option value="all">Sve filijale</option>
                        {regions.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                        <option value="">Bez filijale</option>
                    </select>
                </div>

                {/* Users List */}
                <div className="bg-white rounded-2xl border overflow-hidden">
                    {/* Header */}
                    <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={allPageSelected}
                                onChange={toggleAll}
                                className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="font-medium text-slate-700">
                                {selectedUsers.size > 0
                                    ? `Izabrano ${selectedUsers.size} od ${allUsers.length}`
                                    : `${allUsers.length} korisnika`}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            {addressFilter && (
                                <span className="text-sm text-slate-500">
                                    Filtrirano: "{addressFilter}"
                                </span>
                            )}
                            {totalPages > 1 && (
                                <span className="text-sm text-slate-400">
                                    Str. {currentPage}/{totalPages}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* List */}
                    {loading ? (
                        <div className="p-12 flex items-center justify-center">
                            <Loader2 size={32} className="animate-spin text-emerald-600" />
                        </div>
                    ) : allUsers.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <Users size={48} className="mx-auto mb-3 opacity-50" />
                            <p>Nema korisnika koji odgovaraju filterima</p>
                        </div>
                    ) : (
                        <div className="divide-y max-h-[500px] overflow-y-auto">
                            {paginatedUsers.map(user => {
                                const regionName = getRegionName(user.region_id);
                                return (
                                    <label
                                        key={user.id}
                                        className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                                            selectedUsers.has(user.id) ? 'bg-emerald-50' : ''
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.has(user.id)}
                                            onChange={() => toggleUser(user.id)}
                                            className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                                            {user.role === 'driver' ? (
                                                <Truck size={20} className="text-amber-600" />
                                            ) : user.role === 'manager' ? (
                                                <Users size={20} className="text-emerald-600" />
                                            ) : (
                                                <User size={20} className="text-blue-600" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-800 truncate">{user.name}</p>
                                            <p className="text-sm text-slate-500 truncate">{user.address || 'Bez adrese'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {regionName && (
                                                <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full flex items-center gap-1">
                                                    <MapPin size={12} />
                                                    {regionName}
                                                </span>
                                            )}
                                            <span className={`px-2 py-1 text-xs rounded-full ${ROLE_COLORS[user.role] || 'bg-slate-100 text-slate-600'}`}>
                                                {ROLE_LABELS[user.role] || user.role}
                                            </span>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
                            <span className="text-sm text-slate-500">
                                Prikazano {(currentPage - 1) * USERS_PER_PAGE + 1} - {Math.min(currentPage * USERS_PER_PAGE, allUsers.length)} od {allUsers.length}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                                >
                                    Prva
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                                >
                                    Prethodna
                                </button>
                                <span className="px-3 py-1.5 text-sm font-medium bg-emerald-100 text-emerald-700 rounded-lg">
                                    {currentPage}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                                >
                                    Sledeća
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                                >
                                    Poslednja
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Region Modal - Add/Edit region
 */
const RegionModal = ({ title, initialName = '', onClose, onSubmit }) => {
    const [name, setName] = useState(initialName);
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setSaving(true);
        try {
            await onSubmit(name);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Naziv filijale
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="npr. Beograd, Novi Sad, Užice..."
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                            required
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-slate-700"
                        >
                            Otkaži
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !name.trim()}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving && <Loader2 size={18} className="animate-spin" />}
                            Sačuvaj
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/**
 * Delete Confirm Modal
 */
const DeleteConfirmModal = ({ region, onClose, onConfirm }) => {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Obriši filijalu</h3>
                        <p className="text-sm text-slate-500">Ova akcija se ne može poništiti</p>
                    </div>
                </div>
                <p className="text-slate-600 mb-6">
                    Da li ste sigurni da želite da obrišete filijalu <strong>"{region.name}"</strong>?
                </p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-slate-700"
                    >
                        Otkaži
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium"
                    >
                        Obriši
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RegionsPage;
