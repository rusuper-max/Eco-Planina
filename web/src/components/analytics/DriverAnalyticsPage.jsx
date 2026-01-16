import { useState, useMemo } from 'react';
import { Truck, Package, Scale, Calendar, ChevronDown, ChevronUp, Users, RotateCcw, AlertTriangle, Loader2, Download, MapPin } from 'lucide-react';
import { EmptyState, Modal } from '../common';
import * as XLSX from 'xlsx';

/**
 * Driver Analytics Page - Shows performance metrics for each driver
 * Used by Company Admin to track which drivers completed the most deliveries
 */
export const DriverAnalyticsPage = ({ driverAssignments = [], drivers = [], wasteTypes = [], processedRequests = [], onResetStats = null }) => {
    const [expandedDriver, setExpandedDriver] = useState(null);
    const [sortBy, setSortBy] = useState('count'); // count, weight, recent
    const [periodFilter, setPeriodFilter] = useState('all'); // all, month, week
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetting, setResetting] = useState(false);

    // Filter by period - use processed_requests as primary source with driver_assignment data
    // After migration 025: driver_assignments.request_id becomes NULL after processing
    // So we use processed_requests.driver_assignment_id to link them
    const filteredAssignments = useMemo(() => {
        // Build a map of driver_assignments by ID for fast lookup
        const assignmentsById = {};
        driverAssignments.forEach(a => {
            assignmentsById[a.id] = a;
        });

        // Process requests with driver info - these are the source of truth after processing
        const processedWithDriver = processedRequests
            .filter(pr => pr.driver_id)
            .map(pr => {
                // Get linked assignment if exists (for timeline data)
                const linkedAssignment = pr.driver_assignment_id ? assignmentsById[pr.driver_assignment_id] : null;
                const isRetroactive = !linkedAssignment || (!linkedAssignment.assigned_at && !linkedAssignment.picked_up_at);

                return {
                    id: pr.driver_assignment_id || `retro-${pr.id}`,
                    processed_request_id: pr.id,
                    driver_assignment_id: pr.driver_assignment_id,
                    driver_id: pr.driver_id,
                    status: 'completed',
                    completed_at: linkedAssignment?.completed_at || pr.processed_at,
                    assigned_at: linkedAssignment?.assigned_at || pr.processed_at,
                    picked_up_at: linkedAssignment?.picked_up_at,
                    delivered_at: linkedAssignment?.delivered_at,
                    isRetroactive,
                    // Include processed request data directly
                    client_name: pr.client_name,
                    client_address: pr.client_address,
                    waste_type: pr.waste_type,
                    waste_label: pr.waste_label,
                    weight: pr.weight,
                    client_id: pr.client_id,
                    processed_at: pr.processed_at
                };
            });

        if (periodFilter === 'all') return processedWithDriver;

        const now = new Date();
        const cutoff = new Date();
        if (periodFilter === 'month') cutoff.setMonth(now.getMonth() - 1);
        if (periodFilter === 'week') cutoff.setDate(now.getDate() - 7);

        return processedWithDriver.filter(a => new Date(a.completed_at || a.assigned_at) >= cutoff);
    }, [driverAssignments, processedRequests, periodFilter]);

    // Calculate stats per driver
    const driverStats = useMemo(() => {
        const stats = {};

        filteredAssignments.forEach(assignment => {
            const driverId = assignment.driver_id;
            const driver = drivers.find(d => d.id === driverId);
            const driverName = driver?.name || 'Nepoznat';

            if (!stats[driverId]) {
                stats[driverId] = {
                    id: driverId,
                    name: driverName,
                    phone: driver?.phone || '',
                    count: 0,
                    totalWeight: 0,
                    wasteTypes: {},
                    clients: new Set(),
                    lastCompleted: null,
                    assignments: []
                };
            }

            stats[driverId].count++;

            // Weight is now included directly in assignment from processed_requests
            if (assignment.weight) {
                stats[driverId].totalWeight += parseFloat(assignment.weight) || 0;
            }

            // Track waste types (now directly in assignment)
            if (assignment.waste_type) {
                const wasteType = assignment.waste_type;
                stats[driverId].wasteTypes[wasteType] = (stats[driverId].wasteTypes[wasteType] || 0) + 1;
            }

            // Track unique clients (now directly in assignment)
            if (assignment.client_id) {
                stats[driverId].clients.add(assignment.client_id);
            }

            // Track latest completed
            const completedAt = new Date(assignment.completed_at || assignment.assigned_at);
            if (!stats[driverId].lastCompleted || completedAt > stats[driverId].lastCompleted) {
                stats[driverId].lastCompleted = completedAt;
            }

            // Store assignment for details (data already included)
            stats[driverId].assignments.push(assignment);
        });

        // Convert to array and sort
        let result = Object.values(stats).map(s => ({
            ...s,
            clients: s.clients.size
        }));

        // Sort
        if (sortBy === 'count') result.sort((a, b) => b.count - a.count);
        else if (sortBy === 'weight') result.sort((a, b) => b.totalWeight - a.totalWeight);
        else if (sortBy === 'recent') result.sort((a, b) => (b.lastCompleted || 0) - (a.lastCompleted || 0));

        return result;
    }, [filteredAssignments, drivers, sortBy]);

    // Get waste type label from ID
    const getWasteTypeLabel = (typeId) => {
        const wasteType = wasteTypes.find(w => w.id === typeId);
        return wasteType?.label || typeId;
    };

    // Get waste type icon from ID
    const getWasteTypeIcon = (typeId) => {
        const wasteType = wasteTypes.find(w => w.id === typeId);
        return wasteType?.icon || '📦';
    };

    // Format weight
    const formatWeight = (kg) => {
        if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
        return `${kg.toFixed(1)} kg`;
    };

    // Calculate totals
    const totals = useMemo(() => ({
        deliveries: filteredAssignments.length,
        weight: driverStats.reduce((sum, d) => sum + d.totalWeight, 0),
        activeDrivers: driverStats.length
    }), [filteredAssignments, driverStats]);

    // Export to Excel
    const handleExportExcel = () => {
        // Prepare driver summary data
        const summaryData = driverStats.map((driver, index) => ({
            'Rang': index + 1,
            'Vozač': driver.name,
            'Telefon': driver.phone,
            'Broj dostava': driver.count,
            'Ukupna težina (kg)': driver.totalWeight.toFixed(1),
            'Broj klijenata': driver.clients,
            'Poslednja aktivnost': driver.lastCompleted
                ? driver.lastCompleted.toLocaleDateString('sr-RS')
                : 'N/A'
        }));

        // Prepare detailed deliveries data (data now directly in assignment)
        const detailedData = filteredAssignments.map(assignment => {
            const driver = drivers.find(d => d.id === assignment.driver_id);
            return {
                'Datum': new Date(assignment.completed_at || assignment.assigned_at).toLocaleDateString('sr-RS'),
                'Vreme': new Date(assignment.completed_at || assignment.assigned_at).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' }),
                'Vozač': driver?.name || 'Nepoznat',
                'Klijent': assignment.client_name || 'Nepoznat',
                'Adresa': assignment.client_address || '',
                'Vrsta robe': assignment.waste_type ? getWasteTypeLabel(assignment.waste_type) : '',
                'Težina (kg)': assignment.weight || ''
            };
        });

        // Create workbook with multiple sheets
        const wb = XLSX.utils.book_new();

        // Summary sheet
        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Pregled po vozačima');

        // Detailed sheet
        const wsDetailed = XLSX.utils.json_to_sheet(detailedData);
        XLSX.utils.book_append_sheet(wb, wsDetailed, 'Sve dostave');

        // Generate filename with date
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `Ucinci_vozaca_${dateStr}.xlsx`;

        // Download
        XLSX.writeFile(wb, filename);
    };

    // Show empty state only if there are no driver stats calculated from processed requests
    if (driverStats.length === 0) {
        return <EmptyState icon={Truck} title="Nema podataka" desc="Kada vozači završe dostave, ovde ćete videti njihovu statistiku" />;
    }

    const handleResetStats = async () => {
        if (!onResetStats) return;
        setResetting(true);
        try {
            await onResetStats();
            setShowResetModal(false);
        } catch (err) {
            console.error('Error resetting driver stats:', err);
        } finally {
            setResetting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Učinak vozača</h1>
                    <p className="text-slate-500 mt-1">Pregledajte koliko je svaki vozač obavio dostava</p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={periodFilter}
                        onChange={(e) => setPeriodFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                    >
                        <option value="all">Svi periodi</option>
                        <option value="month">Poslednjih mesec dana</option>
                        <option value="week">Poslednjih 7 dana</option>
                    </select>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                    >
                        <option value="count">Po broju dostava</option>
                        <option value="weight">Po težini</option>
                        <option value="recent">Po aktivnosti</option>
                    </select>
                    <button
                        onClick={handleExportExcel}
                        className="px-3 py-2 border border-emerald-200 text-emerald-600 rounded-xl text-sm bg-white hover:bg-emerald-50 flex items-center gap-1.5"
                    >
                        <Download size={16} />
                        <span className="hidden sm:inline">Excel</span>
                    </button>
                    {onResetStats && (
                        <button
                            onClick={() => setShowResetModal(true)}
                            className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm hover:bg-red-100 flex items-center gap-1.5"
                        >
                            <RotateCcw size={16} />
                            <span className="hidden sm:inline">Reset</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                            <Package className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Ukupno dostava</p>
                            <p className="text-2xl font-bold text-slate-800">{totals.deliveries}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <Scale className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Ukupna težina</p>
                            <p className="text-2xl font-bold text-slate-800">{formatWeight(totals.weight)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Truck className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Aktivnih vozača</p>
                            <p className="text-2xl font-bold text-slate-800">{totals.activeDrivers}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Driver Cards */}
            <div className="space-y-3">
                {driverStats.map((driver, index) => {
                    const isExpanded = expandedDriver === driver.id;
                    const percentage = totals.deliveries > 0 ? ((driver.count / totals.deliveries) * 100).toFixed(1) : 0;

                    return (
                        <div
                            key={driver.id}
                            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
                        >
                            {/* Main row */}
                            <div
                                className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => setExpandedDriver(isExpanded ? null : driver.id)}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Rank badge */}
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${index === 0 ? 'bg-amber-100 text-amber-700' :
                                            index === 1 ? 'bg-slate-200 text-slate-600' :
                                                index === 2 ? 'bg-orange-100 text-orange-700' :
                                                    'bg-slate-100 text-slate-500'
                                        }`}>
                                        {index + 1}
                                    </div>

                                    {/* Driver info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Truck size={16} className="text-purple-500" />
                                            <h3 className="font-semibold text-slate-800 truncate">
                                                {driver.name}
                                            </h3>
                                        </div>
                                        {driver.phone && (
                                            <p className="text-sm text-slate-500">{driver.phone}</p>
                                        )}
                                    </div>

                                    {/* Stats */}
                                    <div className="hidden sm:flex items-center gap-6 text-center">
                                        <div>
                                            <p className="text-2xl font-bold text-purple-600">{driver.count}</p>
                                            <p className="text-xs text-slate-500">dostava</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-emerald-600">{formatWeight(driver.totalWeight)}</p>
                                            <p className="text-xs text-slate-500">težina</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-blue-600">{driver.clients}</p>
                                            <p className="text-xs text-slate-500">klijenata</p>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="hidden md:block w-32">
                                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                            <span>{percentage}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Expand icon */}
                                    <div className="text-slate-400">
                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                {/* Mobile stats */}
                                <div className="sm:hidden flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
                                    <div className="flex-1 text-center">
                                        <p className="text-lg font-bold text-purple-600">{driver.count}</p>
                                        <p className="text-xs text-slate-500">dostava</p>
                                    </div>
                                    <div className="flex-1 text-center">
                                        <p className="text-lg font-bold text-emerald-600">{formatWeight(driver.totalWeight)}</p>
                                        <p className="text-xs text-slate-500">težina</p>
                                    </div>
                                    <div className="flex-1 text-center">
                                        <p className="text-lg font-bold text-blue-600">{driver.clients}</p>
                                        <p className="text-xs text-slate-500">klijenata</p>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded details */}
                            {isExpanded && (
                                <div className="px-4 pb-4 border-t border-slate-100 bg-slate-50">
                                    <div className="pt-4 space-y-4">
                                        {/* Waste types breakdown */}
                                        {Object.keys(driver.wasteTypes).length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-medium text-slate-600 mb-2">Po vrstama robe</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {Object.entries(driver.wasteTypes).map(([type, count]) => (
                                                        <span
                                                            key={type}
                                                            className="px-3 py-1.5 bg-white rounded-lg text-sm border border-slate-200 flex items-center gap-1.5"
                                                        >
                                                            <span>{getWasteTypeIcon(type)}</span>
                                                            <span className="font-medium">{getWasteTypeLabel(type)}</span>
                                                            <span className="text-slate-500">({count})</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Recent activity */}
                                        <div>
                                            <h4 className="text-sm font-medium text-slate-600 mb-2">Poslednja aktivnost</h4>
                                            <div className="bg-white rounded-xl p-3 border border-slate-200">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Calendar size={16} className="text-slate-400" />
                                                    <span className="text-slate-700">
                                                        {driver.lastCompleted
                                                            ? driver.lastCompleted.toLocaleString('sr-RS', {
                                                                day: 'numeric',
                                                                month: 'long',
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })
                                                            : 'Nema podataka'
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Recent deliveries list */}
                                        <div>
                                            <h4 className="text-sm font-medium text-slate-600 mb-2">
                                                Poslednjih 5 dostava
                                            </h4>
                                            <div className="space-y-2">
                                                {driver.assignments
                                                    .sort((a, b) => new Date(b.completed_at || b.assigned_at) - new Date(a.completed_at || a.assigned_at))
                                                    .slice(0, 5)
                                                    .map((assignment, idx) => (
                                                        <div
                                                            key={assignment.id || idx}
                                                            className="bg-white rounded-lg p-3 border border-slate-200 flex items-center justify-between"
                                                        >
                                                            <div>
                                                                <p className="font-medium text-sm text-slate-800">
                                                                    {assignment.client_name || 'Nepoznat klijent'}
                                                                </p>
                                                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                                                    <MapPin size={12} />
                                                                    {assignment.client_address || 'Nepoznata adresa'}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-sm font-medium text-emerald-600">
                                                                    {assignment.weight ? `${assignment.weight} kg` : '-'}
                                                                </p>
                                                                <p className="text-xs text-slate-400">
                                                                    {new Date(assignment.completed_at || assignment.assigned_at).toLocaleDateString('sr-RS')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {showResetModal && (
                <Modal
                    open={showResetModal}
                    onClose={() => setShowResetModal(false)}
                    title="Resetuj statistiku vozača"
                >
                    <p className="text-sm text-slate-600">
                        Ovo će obrisati obrađene zahteve i statistikа će se vratiti na nulu. Da li ste sigurni?
                    </p>
                    <div className="mt-4 flex gap-2 justify-end">
                        <button
                            onClick={() => setShowResetModal(false)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm text-slate-700"
                            disabled={resetting}
                        >
                            Otkaži
                        </button>
                        <button
                            onClick={handleResetStats}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60"
                            disabled={resetting}
                        >
                            {resetting ? 'Resetujem...' : 'Resetuj'}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default DriverAnalyticsPage;
