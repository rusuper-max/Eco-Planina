import { useState, useEffect, useMemo } from 'react';
import {
    Truck, Plus, Edit3, Trash2, Search, Users, AlertTriangle,
    Wrench, CheckCircle2, XCircle, UserPlus, X, Star, StarOff
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Modal, EmptyState, RecycleLoader } from '../common';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
    { value: 'active', label: 'Aktivan', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
    { value: 'maintenance', label: 'Na servisu', color: 'bg-amber-100 text-amber-700', icon: Wrench },
    { value: 'retired', label: 'Povučen', color: 'bg-slate-100 text-slate-500', icon: XCircle }
];

/**
 * VehiclesPage - Manage company vehicles
 * Accessible by: company_admin, supervisor, manager
 */
export const VehiclesPage = () => {
    const { user } = useAuth();
    const {
        fetchVehicles,
        createVehicle,
        updateVehicle,
        deleteVehicle,
        assignDriverToVehicle,
        removeDriverFromVehicle,
        setPrimaryVehicle,
        fetchCompanyMembers
    } = useData();

    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState(null);
    const [deletingVehicle, setDeletingVehicle] = useState(null);
    const [assigningDrivers, setAssigningDrivers] = useState(null); // Vehicle for driver assignment

    // Load vehicles and drivers
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [vehiclesData, membersData] = await Promise.all([
                fetchVehicles(),
                fetchCompanyMembers()
            ]);
            setVehicles(vehiclesData);
            // Filter only drivers from members
            setDrivers(membersData?.filter(m => m.role === 'driver') || []);
        } catch (err) {
            console.error('Error loading data:', err);
            toast.error('Greška pri učitavanju podataka');
        } finally {
            setLoading(false);
        }
    };

    const loadVehicles = async () => {
        try {
            const data = await fetchVehicles();
            setVehicles(data);
        } catch (err) {
            console.error('Error loading vehicles:', err);
        }
    };

    // Filtered vehicles
    const filteredVehicles = useMemo(() => {
        return vehicles.filter(v => {
            const matchesSearch =
                v.registration?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.brand?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [vehicles, searchQuery, statusFilter]);

    // Stats
    const stats = useMemo(() => ({
        total: vehicles.length,
        active: vehicles.filter(v => v.status === 'active').length,
        maintenance: vehicles.filter(v => v.status === 'maintenance').length,
        retired: vehicles.filter(v => v.status === 'retired').length
    }), [vehicles]);

    // Handle create
    const handleCreate = async (data) => {
        try {
            await createVehicle(data);
            toast.success('Vozilo dodato');
            setShowAddModal(false);
            loadVehicles();
        } catch (err) {
            if (err.message?.includes('unique_registration_per_company')) {
                toast.error('Vozilo sa ovom registracijom već postoji');
            } else {
                toast.error('Greška: ' + err.message);
            }
        }
    };

    // Handle update
    const handleUpdate = async (data) => {
        try {
            await updateVehicle(editingVehicle.id, data);
            toast.success('Vozilo ažurirano');
            setEditingVehicle(null);
            loadVehicles();
        } catch (err) {
            if (err.message?.includes('unique_registration_per_company')) {
                toast.error('Vozilo sa ovom registracijom već postoji');
            } else {
                toast.error('Greška: ' + err.message);
            }
        }
    };

    // Handle delete
    const handleDelete = async () => {
        try {
            await deleteVehicle(deletingVehicle.id);
            toast.success('Vozilo obrisano');
            setDeletingVehicle(null);
            loadVehicles();
        } catch (err) {
            toast.error('Greška: ' + err.message);
        }
    };

    // Handle assign driver
    const handleAssignDriver = async (driverId) => {
        try {
            await assignDriverToVehicle(assigningDrivers.id, driverId);
            toast.success('Vozač dodeljen');
            loadVehicles();
        } catch (err) {
            if (err.message?.includes('unique_vehicle_driver')) {
                toast.error('Ovaj vozač je već dodeljen ovom vozilu');
            } else {
                toast.error('Greška: ' + err.message);
            }
        }
    };

    // Handle remove driver
    const handleRemoveDriver = async (vehicleId, driverId) => {
        try {
            await removeDriverFromVehicle(vehicleId, driverId);
            toast.success('Vozač uklonjen');
            loadVehicles();
        } catch (err) {
            toast.error('Greška: ' + err.message);
        }
    };

    // Handle set primary
    const handleSetPrimary = async (vehicleId, driverId) => {
        try {
            await setPrimaryVehicle(vehicleId, driverId);
            toast.success('Primarno vozilo postavljeno');
            loadVehicles();
        } catch (err) {
            toast.error('Greška: ' + err.message);
        }
    };

    // Get status badge
    const getStatusBadge = (status) => {
        const opt = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];
        const Icon = opt.icon;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${opt.color}`}>
                <Icon size={12} />
                {opt.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RecycleLoader size={48} className="text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Truck className="text-blue-600" />
                        Vozila
                    </h1>
                    <p className="text-slate-500 mt-1">Upravljajte voznim parkom</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5"
                >
                    <Plus size={16} />
                    Novo vozilo
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                    <p className="text-sm text-slate-500">Ukupno</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                    <p className="text-sm text-emerald-600">Aktivna</p>
                    <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                    <p className="text-sm text-amber-600">Na servisu</p>
                    <p className="text-2xl font-bold text-amber-600">{stats.maintenance}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                    <p className="text-sm text-slate-500">Povučena</p>
                    <p className="text-2xl font-bold text-slate-500">{stats.retired}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Pretraži po registraciji, nazivu..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm"
                >
                    <option value="all">Svi statusi</option>
                    {STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {/* Vehicle Grid */}
            {filteredVehicles.length === 0 ? (
                <EmptyState
                    icon={Truck}
                    title={searchQuery || statusFilter !== 'all' ? "Nema rezultata" : "Nema vozila"}
                    desc={searchQuery || statusFilter !== 'all'
                        ? "Pokušajte sa drugim filterima"
                        : "Dodajte prvo vozilo klikom na dugme iznad"
                    }
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredVehicles.map(vehicle => (
                        <div
                            key={vehicle.id}
                            className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
                        >
                            <div className="p-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                            vehicle.status === 'active' ? 'bg-blue-100' :
                                            vehicle.status === 'maintenance' ? 'bg-amber-100' : 'bg-slate-100'
                                        }`}>
                                            <Truck className={`w-6 h-6 ${
                                                vehicle.status === 'active' ? 'text-blue-600' :
                                                vehicle.status === 'maintenance' ? 'text-amber-600' : 'text-slate-400'
                                            }`} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-lg">
                                                {vehicle.registration}
                                            </h3>
                                            {vehicle.name && (
                                                <p className="text-sm text-slate-500">{vehicle.name}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => setAssigningDrivers(vehicle)}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                            title="Dodeli vozače"
                                        >
                                            <UserPlus size={16} />
                                        </button>
                                        <button
                                            onClick={() => setEditingVehicle(vehicle)}
                                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                                            title="Izmeni"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                        <button
                                            onClick={() => setDeletingVehicle(vehicle)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                            title="Obriši"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                                    {vehicle.brand && <span>{vehicle.brand}</span>}
                                    {vehicle.model && <span>• {vehicle.model}</span>}
                                    {vehicle.year && <span>• {vehicle.year}</span>}
                                    {vehicle.capacity_kg && <span>• {vehicle.capacity_kg} kg</span>}
                                </div>

                                {/* Status */}
                                <div className="mt-3">
                                    {getStatusBadge(vehicle.status)}
                                </div>

                                {/* Assigned Drivers */}
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                                        <Users size={12} />
                                        Vozači ({vehicle.vehicle_drivers?.length || 0})
                                    </p>
                                    {vehicle.vehicle_drivers?.length > 0 ? (
                                        <div className="space-y-1">
                                            {vehicle.vehicle_drivers.map(vd => (
                                                <div
                                                    key={vd.id}
                                                    className="flex items-center justify-between bg-slate-50 rounded-lg px-2 py-1.5"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {vd.is_primary && (
                                                            <Star size={12} className="text-amber-500 fill-amber-500" />
                                                        )}
                                                        <span className="text-sm text-slate-700">
                                                            {vd.driver?.name || 'Nepoznat'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {!vd.is_primary && (
                                                            <button
                                                                onClick={() => handleSetPrimary(vehicle.id, vd.driver_id)}
                                                                className="p-1 text-slate-400 hover:text-amber-500"
                                                                title="Postavi kao primarno"
                                                            >
                                                                <StarOff size={14} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleRemoveDriver(vehicle.id, vd.driver_id)}
                                                            className="p-1 text-slate-400 hover:text-red-500"
                                                            title="Ukloni"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">Nema dodeljenih vozača</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {(showAddModal || editingVehicle) && (
                <VehicleModal
                    vehicle={editingVehicle}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingVehicle(null);
                    }}
                    onSave={editingVehicle ? handleUpdate : handleCreate}
                />
            )}

            {/* Delete Confirmation */}
            {deletingVehicle && (
                <Modal
                    open={!!deletingVehicle}
                    onClose={() => setDeletingVehicle(null)}
                    title="Obriši vozilo"
                >
                    <div className="space-y-4">
                        <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                            <p className="text-sm text-red-800">
                                Da li ste sigurni da želite da obrišete vozilo <strong>{deletingVehicle.registration}</strong>?
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeletingVehicle(null)}
                                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium"
                            >
                                Odustani
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
                            >
                                Obriši
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Assign Drivers Modal */}
            {assigningDrivers && (
                <AssignDriversModal
                    vehicle={assigningDrivers}
                    drivers={drivers}
                    assignedDriverIds={(assigningDrivers.vehicle_drivers || []).map(vd => vd.driver_id)}
                    onClose={() => setAssigningDrivers(null)}
                    onAssign={handleAssignDriver}
                />
            )}
        </div>
    );
};

/**
 * Vehicle Add/Edit Modal
 */
const VehicleModal = ({ vehicle, onClose, onSave }) => {
    const [registration, setRegistration] = useState(vehicle?.registration || '');
    const [name, setName] = useState(vehicle?.name || '');
    const [brand, setBrand] = useState(vehicle?.brand || '');
    const [model, setModel] = useState(vehicle?.model || '');
    const [year, setYear] = useState(vehicle?.year || '');
    const [capacityKg, setCapacityKg] = useState(vehicle?.capacity_kg || '');
    const [status, setStatus] = useState(vehicle?.status || 'active');
    const [notes, setNotes] = useState(vehicle?.notes || '');
    const [saving, setSaving] = useState(false);

    const isEdit = !!vehicle;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!registration.trim()) {
            toast.error('Registracija je obavezna');
            return;
        }

        setSaving(true);
        try {
            await onSave({
                registration,
                name,
                brand,
                model,
                year: year ? parseInt(year) : null,
                capacity_kg: capacityKg ? parseFloat(capacityKg) : null,
                status,
                notes
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={true}
            onClose={onClose}
            title={isEdit ? 'Izmeni vozilo' : 'Novo vozilo'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Registration */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Registracija *
                    </label>
                    <input
                        type="text"
                        value={registration}
                        onChange={(e) => setRegistration(e.target.value.toUpperCase())}
                        placeholder="BG-123-AB"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        required
                        autoFocus
                    />
                </div>

                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Naziv vozila
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="npr. Mercedes Sprinter"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                </div>

                {/* Brand & Model */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Marka
                        </label>
                        <input
                            type="text"
                            value={brand}
                            onChange={(e) => setBrand(e.target.value)}
                            placeholder="Mercedes"
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Model
                        </label>
                        <input
                            type="text"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            placeholder="Sprinter"
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                    </div>
                </div>

                {/* Year & Capacity */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Godina
                        </label>
                        <input
                            type="number"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            placeholder="2020"
                            min="1990"
                            max={new Date().getFullYear() + 1}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Nosivost (kg)
                        </label>
                        <input
                            type="number"
                            value={capacityKg}
                            onChange={(e) => setCapacityKg(e.target.value)}
                            placeholder="3500"
                            min="0"
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                    </div>
                </div>

                {/* Status */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Status
                    </label>
                    <div className="flex gap-2">
                        {STATUS_OPTIONS.map(opt => (
                            <label
                                key={opt.value}
                                className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer transition-colors ${
                                    status === opt.value
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="status"
                                    value={opt.value}
                                    checked={status === opt.value}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="hidden"
                                />
                                <opt.icon size={16} />
                                <span className="text-sm font-medium">{opt.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Napomene
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        placeholder="Dodatne informacije o vozilu..."
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                    />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium"
                        disabled={saving}
                    >
                        Odustani
                    </button>
                    <button
                        type="submit"
                        className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold disabled:opacity-50"
                        disabled={saving || !registration.trim()}
                    >
                        {saving ? 'Čuvanje...' : isEdit ? 'Sačuvaj' : 'Dodaj'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

/**
 * Assign Drivers Modal - Checkbox selection for multiple drivers
 */
const AssignDriversModal = ({ vehicle, drivers, assignedDriverIds, onClose, onAssign }) => {
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [assigning, setAssigning] = useState(false);

    const availableDrivers = useMemo(() => {
        return drivers
            .filter(d => !assignedDriverIds.includes(d.id))
            .filter(d =>
                d.name?.toLowerCase().includes(search.toLowerCase()) ||
                d.phone?.includes(search)
            );
    }, [drivers, assignedDriverIds, search]);

    const toggleDriver = (driverId) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(driverId)) {
                next.delete(driverId);
            } else {
                next.add(driverId);
            }
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedIds.size === availableDrivers.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(availableDrivers.map(d => d.id)));
        }
    };

    const handleAssign = async () => {
        if (selectedIds.size === 0) return;
        setAssigning(true);
        try {
            for (const driverId of selectedIds) {
                await onAssign(driverId);
            }
            onClose();
        } finally {
            setAssigning(false);
        }
    };

    return (
        <Modal
            open={true}
            onClose={onClose}
            title={`Dodeli vozače - ${vehicle.registration}`}
        >
            <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Pretraži vozače..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                </div>

                {/* Select All */}
                {availableDrivers.length > 0 && (
                    <div className="flex items-center justify-between px-1">
                        <span className="text-sm text-slate-500">
                            Izabrano: {selectedIds.size} od {availableDrivers.length}
                        </span>
                        <button
                            type="button"
                            onClick={toggleAll}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            {selectedIds.size === availableDrivers.length ? 'Odznači sve' : 'Označi sve'}
                        </button>
                    </div>
                )}

                {/* Available Drivers - Checkbox List */}
                <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-3">
                    {availableDrivers.length === 0 ? (
                        <p className="text-center text-slate-500 py-6">
                            {search ? 'Nema rezultata' : 'Svi vozači su već dodeljeni'}
                        </p>
                    ) : (
                        availableDrivers.map(driver => (
                            <label
                                key={driver.id}
                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                                    selectedIds.has(driver.id)
                                        ? 'bg-blue-50 border border-blue-200'
                                        : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(driver.id)}
                                    onChange={() => toggleDriver(driver.id)}
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                    <p className={`font-medium ${selectedIds.has(driver.id) ? 'text-blue-700' : 'text-slate-800'}`}>
                                        {driver.name}
                                    </p>
                                    {driver.phone && (
                                        <p className="text-sm text-slate-500">{driver.phone}</p>
                                    )}
                                </div>
                            </label>
                        ))
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium"
                        disabled={assigning}
                    >
                        Odustani
                    </button>
                    <button
                        onClick={handleAssign}
                        disabled={selectedIds.size === 0 || assigning}
                        className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold disabled:opacity-50"
                    >
                        {assigning ? 'Dodeljujem...' : `Dodeli (${selectedIds.size})`}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default VehiclesPage;
