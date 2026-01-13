import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context';
import { MapPin, Plus, Edit3, Trash2, Users, Loader2, Search, X, AlertTriangle } from 'lucide-react';
import { EmptyState } from '../common';
import toast from 'react-hot-toast';

/**
 * RegionsPage - Manage company branches/regions (for company_admin only)
 */
export const RegionsPage = () => {
    const { companyCode, isCompanyAdmin, isAdmin } = useAuth();
    const [regions, setRegions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingRegion, setEditingRegion] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // Load regions
    const fetchRegions = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('regions')
                .select(`
                    id,
                    name,
                    created_at,
                    users:users(count)
                `)
                .eq('company_code', companyCode)
                .is('deleted_at', null)
                .order('name');

            if (error) throw error;

            // Transform data to include user count
            const regionsWithCounts = data?.map(r => ({
                ...r,
                userCount: r.users?.[0]?.count || 0
            })) || [];

            setRegions(regionsWithCounts);
        } catch (error) {
            console.error('Error fetching regions:', error);
            toast.error('Greška pri učitavanju filijala');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (companyCode) {
            fetchRegions();
        }
    }, [companyCode]);

    // Filter regions
    const filteredRegions = regions.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Add region
    const handleAddRegion = async (name) => {
        try {
            const { error } = await supabase
                .from('regions')
                .insert({ company_code: companyCode, name: name.trim() });

            if (error) {
                if (error.code === '23505') {
                    throw new Error('Filijala sa tim imenom već postoji');
                }
                throw error;
            }

            toast.success('Filijala kreirana');
            setShowAddModal(false);
            fetchRegions();
        } catch (error) {
            toast.error(error.message || 'Greška pri kreiranju');
        }
    };

    // Update region
    const handleUpdateRegion = async (id, name) => {
        try {
            const { error } = await supabase
                .from('regions')
                .update({ name: name.trim() })
                .eq('id', id);

            if (error) throw error;

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
            // First check if region has users
            const region = regions.find(r => r.id === id);
            if (region?.userCount > 0) {
                throw new Error('Nije moguće obrisati filijalu koja ima korisnike');
            }

            const { error } = await supabase
                .from('regions')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

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
                    <p className="text-slate-500">Upravljajte filijalama vaše firme</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
                >
                    <Plus size={20} />
                    Nova filijala
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder="Pretraži filijale..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
            </div>

            {/* Regions Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                </div>
            ) : filteredRegions.length === 0 ? (
                <EmptyState
                    icon={MapPin}
                    title={searchQuery ? "Nema rezultata" : "Nema filijala"}
                    desc={searchQuery ? `Nema rezultata za "${searchQuery}"` : "Kreirajte prvu filijalu da biste organizovali svoje korisnike po lokacijama"}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredRegions.map(region => (
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
                                        onClick={() => setEditingRegion(region)}
                                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                        title="Izmeni"
                                    >
                                        <Edit3 size={18} />
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfirm(region)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Obriši"
                                        disabled={region.userCount > 0}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
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
                            Da li ste sigurni da želite da obrišete filijalu <strong>"{deleteConfirm.name}"</strong>?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-slate-700"
                            >
                                Otkaži
                            </button>
                            <button
                                onClick={() => handleDeleteRegion(deleteConfirm.id)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium"
                            >
                                Obriši
                            </button>
                        </div>
                    </div>
                </div>
            )}
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

export default RegionsPage;
