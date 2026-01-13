import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import {
    Truck, Users, MapPin, Phone, CheckCircle2, Clock, AlertCircle,
    ChevronDown, ChevronUp, Search, Filter, X, Plus, Trash2, Navigation,
    RefreshCw, User, Package, PackageCheck, CircleDot, ArrowLeftRight
} from 'lucide-react';
import {
    Modal, CountdownTimer, FillLevelBar, getCurrentUrgency, getRemainingTime, WASTE_TYPES
} from './DashboardComponents';

// Driver Card Component
const DriverCard = ({ driver, isSelected, onSelect, assignedCount }) => (
    <div
        onClick={() => onSelect(driver)}
        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
            isSelected
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-slate-200 hover:border-slate-300 bg-white'
        }`}
    >
        <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
                {driver.name?.charAt(0)?.toUpperCase() || 'V'}
            </div>
            <div className="flex-1">
                <h3 className="font-semibold text-slate-800">{driver.name}</h3>
                <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Phone size={12} /> {driver.phone}
                </p>
            </div>
            {assignedCount > 0 && (
                <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                    {assignedCount} zahteva
                </div>
            )}
        </div>
    </div>
);

// Status Badge Component
const StatusBadge = ({ status, driverName }) => {
    const configs = {
        'not_assigned': {
            label: 'Nije dodeljeno',
            bg: 'bg-slate-100',
            color: 'text-slate-600',
            icon: CircleDot
        },
        'assigned': {
            label: 'Čeka preuzimanje',
            bg: 'bg-blue-100',
            color: 'text-blue-700',
            icon: Clock
        },
        'in_progress': {
            label: 'U toku',
            bg: 'bg-blue-100',
            color: 'text-blue-700',
            icon: Truck
        },
        'picked_up': {
            label: 'Preuzeto',
            bg: 'bg-amber-100',
            color: 'text-amber-700',
            icon: Package
        },
        'delivered': {
            label: 'Dostavljeno',
            bg: 'bg-emerald-100',
            color: 'text-emerald-700',
            icon: PackageCheck
        }
    };

    const config = configs[status] || configs['not_assigned'];
    const Icon = config.icon;

    return (
        <div className="flex flex-col gap-0.5">
            <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.color}`}>
                <Icon size={12} />
                {config.label}
            </span>
            {driverName && status !== 'not_assigned' && (
                <span className="text-xs text-slate-400 pl-1">{driverName}</span>
            )}
        </div>
    );
};

// Request Row with Checkbox - always enabled
const RequestRow = ({ request, isSelected, onToggle, wasteTypes, assignment, driverName }) => {
    const currentUrgency = getCurrentUrgency(request.created_at, request.urgency);
    const remaining = getRemainingTime(request.created_at, request.urgency);
    const wasteIcon = wasteTypes.find(w => w.id === request.waste_type)?.icon || '📦';
    const status = assignment?.status || 'not_assigned';

    return (
        <tr
            className={`hover:bg-slate-50 cursor-pointer transition-colors ${isSelected ? 'bg-emerald-50' : ''}`}
            onClick={() => onToggle(request.id)}
        >
            <td className="px-4 py-3">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(request.id)}
                    className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    onClick={(e) => e.stopPropagation()}
                />
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                    <span className="text-xl">{wasteIcon}</span>
                    <div>
                        <p className="font-medium text-slate-800">{request.client_name}</p>
                        <p className="text-sm text-slate-500">{request.waste_label}</p>
                        {request.request_code && (
                            <p className="text-xs text-slate-400 font-mono">{request.request_code}</p>
                        )}
                    </div>
                </div>
            </td>
            <td className="px-4 py-3">
                <StatusBadge status={status} driverName={driverName} />
            </td>
            <td className="px-4 py-3">
                <FillLevelBar fillLevel={request.fill_level} />
            </td>
            <td className="px-4 py-3">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${remaining.bg} ${remaining.color}`}>
                    {remaining.text}
                </span>
            </td>
            <td className="px-4 py-3 text-sm text-slate-500 max-w-[200px] truncate">
                {request.client_address || '-'}
            </td>
            <td className="px-4 py-3">
                {request.latitude && request.longitude ? (
                    <span className="text-emerald-600 text-sm flex items-center gap-1">
                        <MapPin size={14} /> Da
                    </span>
                ) : (
                    <span className="text-amber-600 text-sm flex items-center gap-1">
                        <AlertCircle size={14} /> Ne
                    </span>
                )}
            </td>
        </tr>
    );
};

// Driver Select Dropdown
const DriverSelectDropdown = ({ drivers, selectedDriver, onSelect, isOpen, onToggle, buttonRef }) => {
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
                buttonRef.current && !buttonRef.current.contains(e.target)) {
                onToggle(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onToggle, buttonRef]);

    if (!isOpen) return null;

    return (
        <div
            ref={dropdownRef}
            className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 min-w-[250px] max-h-64 overflow-y-auto"
        >
            {drivers.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-sm">
                    Nema registrovanih vozača
                </div>
            ) : (
                <div className="py-1">
                    {drivers.map(driver => (
                        <button
                            key={driver.id}
                            onClick={() => {
                                onSelect(driver);
                                onToggle(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left ${
                                selectedDriver?.id === driver.id ? 'bg-emerald-50' : ''
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                                selectedDriver?.id === driver.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                                {driver.name?.charAt(0)?.toUpperCase() || 'V'}
                            </div>
                            <div>
                                <p className="font-medium text-slate-800">{driver.name}</p>
                                <p className="text-xs text-slate-500">{driver.phone}</p>
                            </div>
                            {selectedDriver?.id === driver.id && (
                                <CheckCircle2 size={18} className="ml-auto text-emerald-600" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// Main Component
export default function DriverManagement({ wasteTypes = WASTE_TYPES }) {
    const { companyCode, pickupRequests } = useAuth();
    const [drivers, setDrivers] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [selectedRequests, setSelectedRequests] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const [search, setSearch] = useState('');
    const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(true);
    const [showAddDriverModal, setShowAddDriverModal] = useState(false);
    const [showDriverDropdown, setShowDriverDropdown] = useState(false);
    const [showChangeDriverModal, setShowChangeDriverModal] = useState(false);
    const [assignmentToChange, setAssignmentToChange] = useState(null);
    const [changingDriver, setChangingDriver] = useState(false);
    const driverDropdownButtonRef = useRef(null);

    // Fetch drivers and assignments
    useEffect(() => {
        if (companyCode) {
            fetchDrivers();
            fetchAssignments();
        }
    }, [companyCode]);

    const fetchDrivers = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, name, phone')
                .eq('company_code', companyCode)
                .eq('role', 'driver')
                .is('deleted_at', null)
                .order('name');

            if (error) throw error;
            setDrivers(data || []);
        } catch (err) {
            console.error('Error fetching drivers:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAssignments = async () => {
        try {
            const { data, error } = await supabase
                .from('driver_assignments')
                .select('*, driver:driver_id(id, name)')
                .eq('company_code', companyCode)
                .in('status', ['assigned', 'in_progress', 'picked_up', 'delivered'])
                .is('deleted_at', null);

            if (error) throw error;
            setAssignments(data || []);
        } catch (err) {
            console.error('Error fetching assignments:', err);
        }
    };

    // Get pending requests
    const pendingRequests = useMemo(() => {
        if (!pickupRequests) return [];
        return pickupRequests
            .filter(r => r.status === 'pending')
            .map(r => ({
                ...r,
                currentUrgency: getCurrentUrgency(r.created_at, r.urgency)
            }))
            .sort((a, b) => {
                const remA = getRemainingTime(a.created_at, a.urgency);
                const remB = getRemainingTime(b.created_at, b.urgency);
                return remA.ms - remB.ms;
            });
    }, [pickupRequests]);

    // Get assigned request IDs
    const assignedRequestIds = useMemo(() => {
        return new Set(assignments.map(a => a.request_id));
    }, [assignments]);

    // Filter requests
    const filteredRequests = useMemo(() => {
        let filtered = pendingRequests;

        if (showOnlyUnassigned) {
            filtered = filtered.filter(r => !assignedRequestIds.has(r.id));
        }

        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(r =>
                r.client_name?.toLowerCase().includes(searchLower) ||
                r.waste_label?.toLowerCase().includes(searchLower) ||
                r.client_address?.toLowerCase().includes(searchLower)
            );
        }

        return filtered;
    }, [pendingRequests, showOnlyUnassigned, assignedRequestIds, search]);

    // Get assignments for a driver
    const getDriverAssignments = (driverId) => {
        return assignments.filter(a => a.driver_id === driverId);
    };

    // Toggle request selection - always enabled now
    const toggleRequest = (requestId) => {
        setSelectedRequests(prev => {
            const newSet = new Set(prev);
            if (newSet.has(requestId)) {
                newSet.delete(requestId);
            } else {
                newSet.add(requestId);
            }
            return newSet;
        });
    };

    // Select all visible requests
    const selectAllVisible = () => {
        if (selectedRequests.size === filteredRequests.length) {
            setSelectedRequests(new Set());
        } else {
            setSelectedRequests(new Set(filteredRequests.map(r => r.id)));
        }
    };

    // Assign selected requests to driver
    const handleAssign = async () => {
        if (!selectedDriver || selectedRequests.size === 0) return;

        setAssigning(true);
        try {
            const { data: userData } = await supabase
                .from('users')
                .select('id')
                .eq('auth_id', (await supabase.auth.getUser()).data.user?.id)
                .single();

            const assignmentsToInsert = Array.from(selectedRequests).map(requestId => ({
                driver_id: selectedDriver.id,
                request_id: requestId,
                company_code: companyCode,
                assigned_by: userData?.id,
                status: 'assigned'
            }));

            const { error } = await supabase
                .from('driver_assignments')
                .insert(assignmentsToInsert);

            if (error) throw error;

            // Refresh data
            await fetchAssignments();
            setSelectedRequests(new Set());
            alert(`${assignmentsToInsert.length} zahteva dodeljeno vozaču ${selectedDriver.name}`);
        } catch (err) {
            console.error('Error assigning requests:', err);
            alert('Greška pri dodeljivanju: ' + err.message);
        } finally {
            setAssigning(false);
        }
    };

    // Unassign request from driver
    const handleUnassign = async (assignmentId) => {
        if (!window.confirm('Ukloniti dodelu?')) return;

        try {
            const { error } = await supabase
                .from('driver_assignments')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', assignmentId);

            if (error) throw error;
            await fetchAssignments();
        } catch (err) {
            alert('Greška: ' + err.message);
        }
    };

    // Open change driver modal
    const openChangeDriverModal = (assignment, request) => {
        setAssignmentToChange({ assignment, request });
        setShowChangeDriverModal(true);
    };

    // Change driver for assignment
    const handleChangeDriver = async (newDriverId) => {
        if (!assignmentToChange || changingDriver) return;

        setChangingDriver(true);
        try {
            const { error } = await supabase
                .from('driver_assignments')
                .update({
                    driver_id: newDriverId,
                    assigned_at: new Date().toISOString(), // Reset assignment time
                    status: 'assigned', // Reset to assigned status
                    picked_up_at: null,
                    delivered_at: null
                })
                .eq('id', assignmentToChange.assignment.id);

            if (error) throw error;

            await fetchAssignments();
            setShowChangeDriverModal(false);
            setAssignmentToChange(null);

            const newDriver = drivers.find(d => d.id === newDriverId);
            alert(`Zahtev preusmeren na vozača: ${newDriver?.name || 'Nepoznato'}`);
        } catch (err) {
            alert('Greška pri promeni vozača: ' + err.message);
        } finally {
            setChangingDriver(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <RefreshCw className="animate-spin text-emerald-600" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Upravljanje vozačima</h2>
                    <p className="text-sm text-slate-500">
                        {drivers.length} vozača | {pendingRequests.length} zahteva na čekanju |
                        {pendingRequests.length - assignedRequestIds.size} nedodeljeno
                    </p>
                </div>
                <button
                    onClick={() => setShowAddDriverModal(true)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2"
                >
                    <Plus size={18} /> Dodaj vozača
                </button>
            </div>

            {/* Drivers List */}
            <div className="bg-white rounded-2xl border p-6">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Users size={20} className="text-emerald-600" />
                    Vozači ({drivers.length})
                </h3>

                {drivers.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        <Truck size={48} className="mx-auto mb-3 opacity-50" />
                        <p>Nema registrovanih vozača</p>
                        <p className="text-sm mt-1">Vozači se registruju sa ECO kodom vaše firme</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {drivers.map(driver => (
                            <DriverCard
                                key={driver.id}
                                driver={driver}
                                isSelected={selectedDriver?.id === driver.id}
                                onSelect={setSelectedDriver}
                                assignedCount={getDriverAssignments(driver.id).length}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Selected Driver's Assignments */}
            {selectedDriver && getDriverAssignments(selectedDriver.id).length > 0 && (
                <div className="bg-white rounded-2xl border p-6">
                    <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Truck size={20} className="text-blue-600" />
                        Dodeljeni zahtevi za {selectedDriver.name}
                    </h3>
                    <div className="space-y-2">
                        {getDriverAssignments(selectedDriver.id).map(assignment => {
                            const request = pendingRequests.find(r => r.id === assignment.request_id);
                            if (!request) return null;

                            return (
                                <div key={assignment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{wasteTypes.find(w => w.id === request.waste_type)?.icon || '📦'}</span>
                                        <div>
                                            <p className="font-medium">{request.client_name}</p>
                                            <p className="text-sm text-slate-500">{request.waste_label}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <StatusBadge status={assignment.status} />
                                        <CountdownTimer createdAt={request.created_at} urgency={request.urgency} />
                                        <button
                                            onClick={() => openChangeDriverModal(assignment, request)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                            title="Promeni vozača"
                                        >
                                            <ArrowLeftRight size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleUnassign(assignment.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                            title="Ukloni dodelu"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Requests Table */}
            <div className="bg-white rounded-2xl border overflow-hidden">
                <div className="p-4 border-b flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Clock size={20} className="text-amber-600" />
                            Zahtevi za dodelu
                            {search && (
                                <span className="text-sm font-normal text-slate-500">
                                    (prikazano {filteredRequests.length} od {pendingRequests.filter(r => showOnlyUnassigned ? !assignedRequestIds.has(r.id) : true).length})
                                </span>
                            )}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Pretraži klijenta, vrstu..."
                                    className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none w-56"
                                />
                                {search && (
                                    <button
                                        onClick={() => setSearch('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={showOnlyUnassigned}
                                    onChange={(e) => setShowOnlyUnassigned(e.target.checked)}
                                    className="rounded border-slate-300 text-emerald-600"
                                />
                                Samo nedodeljene
                            </label>
                        </div>
                    </div>

                    {/* Quick select - always available now */}
                    {filteredRequests.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={selectAllVisible}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    selectedRequests.size === filteredRequests.length && filteredRequests.length > 0
                                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                {selectedRequests.size === filteredRequests.length && filteredRequests.length > 0
                                    ? `Odštikliraj sve (${filteredRequests.length})`
                                    : `Štikliraj sve prikazane (${filteredRequests.length})`
                                }
                            </button>
                            {search && filteredRequests.length > 0 && selectedRequests.size !== filteredRequests.length && (
                                <span className="text-xs text-slate-500">
                                    Pretraga: "{search}"
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Action Bar - shows when requests are selected */}
                {selectedRequests.size > 0 && (
                    <div className="px-4 py-3 bg-emerald-50 border-b flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-emerald-700">
                            <strong>{selectedRequests.size}</strong> zahteva odabrano
                            {selectedDriver && <> za <strong>{selectedDriver.name}</strong></>}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setSelectedRequests(new Set())}
                                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                            >
                                Poništi
                            </button>

                            {/* Driver selection dropdown */}
                            <div className="relative">
                                <button
                                    ref={driverDropdownButtonRef}
                                    onClick={() => setShowDriverDropdown(!showDriverDropdown)}
                                    className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
                                        selectedDriver
                                            ? 'bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                    }`}
                                >
                                    <User size={16} />
                                    {selectedDriver ? selectedDriver.name : 'Odaberi vozača'}
                                    <ChevronDown size={16} />
                                </button>
                                <DriverSelectDropdown
                                    drivers={drivers}
                                    selectedDriver={selectedDriver}
                                    onSelect={setSelectedDriver}
                                    isOpen={showDriverDropdown}
                                    onToggle={setShowDriverDropdown}
                                    buttonRef={driverDropdownButtonRef}
                                />
                            </div>

                            <button
                                onClick={handleAssign}
                                disabled={assigning || !selectedDriver}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {assigning ? <RefreshCw size={16} className="animate-spin" /> : <Truck size={16} />}
                                Dodeli vozaču
                            </button>
                        </div>
                    </div>
                )}

                {/* Info bar when no requests selected and no driver */}
                {selectedRequests.size === 0 && !selectedDriver && filteredRequests.length > 0 && (
                    <div className="px-4 py-3 bg-blue-50 border-b">
                        <p className="text-sm text-blue-700">
                            Odaberite zahteve koje želite dodeliti vozaču
                        </p>
                    </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={selectedRequests.size === filteredRequests.length && filteredRequests.length > 0}
                                        onChange={selectAllVisible}
                                        className="w-5 h-5 rounded border-slate-300 text-emerald-600"
                                    />
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Klijent / Vrsta</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Status</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">%</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Preostalo</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Adresa</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Lokacija</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                                        <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50" />
                                        <p>Nema zahteva za prikaz</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map(request => {
                                    const assignment = assignments.find(a => a.request_id === request.id);
                                    const driverName = assignment?.driver?.name;
                                    return (
                                        <RequestRow
                                            key={request.id}
                                            request={request}
                                            isSelected={selectedRequests.has(request.id)}
                                            onToggle={toggleRequest}
                                            wasteTypes={wasteTypes}
                                            assignment={assignment}
                                            driverName={driverName}
                                        />
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Driver Modal */}
            <Modal
                open={showAddDriverModal}
                onClose={() => setShowAddDriverModal(false)}
                title="Dodavanje vozača"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-xl">
                        <p className="text-sm text-blue-800">
                            <strong>Kako dodati vozača:</strong>
                        </p>
                        <ol className="list-decimal list-inside text-sm text-blue-700 mt-2 space-y-1">
                            <li>Vozač preuzima aplikaciju ili pristupa web verziji</li>
                            <li>Pri registraciji bira ulogu <strong>"Vozač"</strong></li>
                            <li>Unosi vaš ECO kod firme: <code className="bg-blue-100 px-2 py-0.5 rounded font-mono">{companyCode}</code></li>
                            <li>Nakon registracije, vozač će se pojaviti ovde</li>
                        </ol>
                    </div>
                    <div className="flex justify-center gap-2">
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(companyCode);
                                alert('ECO kod kopiran!');
                            }}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
                        >
                            Kopiraj ECO kod
                        </button>
                        <button
                            onClick={() => setShowAddDriverModal(false)}
                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200"
                        >
                            Zatvori
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Change Driver Modal */}
            <Modal
                open={showChangeDriverModal}
                onClose={() => {
                    setShowChangeDriverModal(false);
                    setAssignmentToChange(null);
                }}
                title="Promeni vozača"
            >
                <div className="space-y-4">
                    {assignmentToChange && (
                        <div className="p-3 bg-slate-100 rounded-xl">
                            <p className="text-sm text-slate-600">Zahtev:</p>
                            <p className="font-medium">{assignmentToChange.request?.client_name}</p>
                            <p className="text-sm text-slate-500">{assignmentToChange.request?.waste_label}</p>
                            <p className="text-xs text-slate-400 mt-1">
                                Trenutni vozač: <strong>{assignmentToChange.assignment?.driver?.name || 'Nepoznato'}</strong>
                            </p>
                        </div>
                    )}

                    <div>
                        <p className="text-sm text-slate-600 mb-2">Izaberite novog vozača:</p>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {drivers.filter(d => d.id !== assignmentToChange?.assignment?.driver_id).map(driver => (
                                <button
                                    key={driver.id}
                                    onClick={() => handleChangeDriver(driver.id)}
                                    disabled={changingDriver}
                                    className="w-full flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                                >
                                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold">
                                        {driver.name?.charAt(0)?.toUpperCase() || 'V'}
                                    </div>
                                    <div className="text-left">
                                        <p className="font-medium text-slate-800">{driver.name}</p>
                                        <p className="text-xs text-slate-500">{driver.phone}</p>
                                    </div>
                                    {changingDriver && (
                                        <RefreshCw size={16} className="ml-auto animate-spin text-emerald-600" />
                                    )}
                                </button>
                            ))}
                            {drivers.filter(d => d.id !== assignmentToChange?.assignment?.driver_id).length === 0 && (
                                <p className="text-center text-slate-400 py-4">
                                    Nema drugih dostupnih vozača
                                </p>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            setShowChangeDriverModal(false);
                            setAssignmentToChange(null);
                        }}
                        className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200"
                    >
                        Otkaži
                    </button>
                </div>
            </Modal>
        </div>
    );
}
