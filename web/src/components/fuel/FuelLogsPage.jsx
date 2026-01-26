import { useState, useEffect, useMemo } from 'react';
import {
    Fuel, Plus, RefreshCw, Calendar, Truck, User, Filter,
    TrendingUp, DollarSign, Gauge, MoreVertical, Trash2, Edit3, Image
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { RecycleLoader, EmptyState, Modal } from '../common';
import { AddFuelLogModal } from './AddFuelLogModal';
import { FuelStatsCards } from './FuelStatsCards';
import toast from 'react-hot-toast';

/**
 * FuelLogsPage - Stranica za evidenciju goriva
 */
export const FuelLogsPage = () => {
    const { user } = useAuth();
    const {
        fetchFuelLogs,
        deleteFuelLog,
        fetchVehicles,
        fetchFuelStatsByVehicle
    } = useData();

    const [fuelLogs, setFuelLogs] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Filters
    const [vehicleFilter, setVehicleFilter] = useState('all');
    const [periodFilter, setPeriodFilter] = useState('month'); // week, month, year, all

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingLog, setEditingLog] = useState(null);
    const [deletingLog, setDeletingLog] = useState(null);
    const [viewingReceipt, setViewingReceipt] = useState(null);

    const canManage = ['company_admin', 'supervisor', 'manager', 'admin', 'developer'].includes(user?.role);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [logsData, vehiclesData, statsData] = await Promise.all([
                fetchFuelLogs({ limit: 200 }),
                fetchVehicles(),
                fetchFuelStatsByVehicle()
            ]);
            setFuelLogs(logsData || []);
            setVehicles(vehiclesData || []);
            setStats(statsData || []);
        } catch (err) {
            console.error('Error loading fuel data:', err);
            toast.error('Greška pri učitavanju podataka');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
        toast.success('Podaci osveženi');
    };

    const handleDelete = async () => {
        if (!deletingLog) return;
        try {
            await deleteFuelLog(deletingLog.id);
            toast.success('Zapis obrisan');
            setDeletingLog(null);
            await loadData();
        } catch (err) {
            toast.error('Greška pri brisanju: ' + err.message);
        }
    };

    // Filter logs
    const filteredLogs = useMemo(() => {
        let result = [...fuelLogs];

        // Vehicle filter
        if (vehicleFilter !== 'all') {
            result = result.filter(log => log.vehicle_id === vehicleFilter);
        }

        // Period filter
        if (periodFilter !== 'all') {
            const now = new Date();
            let cutoff = new Date();
            if (periodFilter === 'week') cutoff.setDate(now.getDate() - 7);
            if (periodFilter === 'month') cutoff.setMonth(now.getMonth() - 1);
            if (periodFilter === 'year') cutoff.setFullYear(now.getFullYear() - 1);
            result = result.filter(log => new Date(log.date) >= cutoff);
        }

        return result;
    }, [fuelLogs, vehicleFilter, periodFilter]);

    // Calculate totals for filtered logs
    const filteredTotals = useMemo(() => {
        return {
            count: filteredLogs.length,
            liters: filteredLogs.reduce((sum, log) => sum + parseFloat(log.liters || 0), 0),
            cost: filteredLogs.reduce((sum, log) => sum + parseFloat(log.total_price || 0), 0)
        };
    }, [filteredLogs]);

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('sr-RS', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatCurrency = (amount) => {
        if (!amount) return '-';
        return parseFloat(amount).toLocaleString('sr-RS', { minimumFractionDigits: 2 }) + ' RSD';
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
                        <Fuel className="text-amber-600" />
                        Gorivo
                    </h1>
                    <p className="text-slate-500 mt-1">Evidencija potrošnje goriva</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white hover:bg-slate-50 flex items-center gap-2"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        Osveži
                    </button>
                    {canManage && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
                        >
                            <Plus size={16} />
                            Novo točenje
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <FuelStatsCards stats={stats} vehicles={vehicles} />

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <select
                    value={vehicleFilter}
                    onChange={(e) => setVehicleFilter(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
                >
                    <option value="all">Sva vozila</option>
                    {vehicles.map(v => (
                        <option key={v.id} value={v.id}>
                            {v.registration} - {v.brand} {v.model}
                        </option>
                    ))}
                </select>
                <select
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
                >
                    <option value="week">Poslednjih 7 dana</option>
                    <option value="month">Poslednjih 30 dana</option>
                    <option value="year">Ove godine</option>
                    <option value="all">Sve</option>
                </select>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 border border-slate-100">
                    <p className="text-sm text-slate-500">Broj točenja</p>
                    <p className="text-2xl font-bold text-slate-800">{filteredTotals.count}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-100">
                    <p className="text-sm text-slate-500">Ukupno litara</p>
                    <p className="text-2xl font-bold text-amber-600">{filteredTotals.liters.toFixed(1)} L</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-100">
                    <p className="text-sm text-slate-500">Ukupni troškovi</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(filteredTotals.cost)}</p>
                </div>
            </div>

            {/* Logs Table */}
            {filteredLogs.length === 0 ? (
                <EmptyState
                    icon={Fuel}
                    title="Nema zapisa"
                    desc="Dodajte prvo točenje goriva"
                />
            ) : (
                <div className="bg-white rounded-2xl border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-500 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left">Datum</th>
                                    <th className="px-4 py-3 text-left">Vozilo</th>
                                    <th className="px-4 py-3 text-left">Vozač</th>
                                    <th className="px-4 py-3 text-right">Litara</th>
                                    <th className="px-4 py-3 text-right">Cena/L</th>
                                    <th className="px-4 py-3 text-right">Ukupno</th>
                                    <th className="px-4 py-3 text-right">Km</th>
                                    <th className="px-4 py-3 text-center">Račun</th>
                                    <th className="px-4 py-3 text-center w-20">Akcije</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-slate-400" />
                                                {formatDate(log.date)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                                                    <Truck size={16} className="text-amber-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{log.vehicle?.registration || '-'}</p>
                                                    <p className="text-xs text-slate-500">{log.vehicle?.brand} {log.vehicle?.model}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <User size={14} className="text-slate-400" />
                                                {log.driver?.name || '-'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-amber-600">
                                            {parseFloat(log.liters).toFixed(2)} L
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-600">
                                            {log.price_per_liter ? `${parseFloat(log.price_per_liter).toFixed(2)} RSD` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-emerald-600">
                                            {formatCurrency(log.total_price)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {log.odometer_km ? (
                                                <span className="text-slate-600">{log.odometer_km.toLocaleString('sr-RS')} km</span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {log.receipt_image_url ? (
                                                <button
                                                    onClick={() => setViewingReceipt(log)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                                                    title="Pogledaj račun"
                                                >
                                                    <Image size={18} />
                                                </button>
                                            ) : (
                                                <span className="text-slate-300"><Image size={18} /></span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-1">
                                                {canManage && (
                                                    <>
                                                        <button
                                                            onClick={() => setEditingLog(log)}
                                                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"
                                                            title="Izmeni"
                                                        >
                                                            <Edit3 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeletingLog(log)}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                                            title="Obriši"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {(showAddModal || editingLog) && (
                <AddFuelLogModal
                    log={editingLog}
                    vehicles={vehicles}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingLog(null);
                    }}
                    onSave={() => {
                        setShowAddModal(false);
                        setEditingLog(null);
                        loadData();
                    }}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deletingLog && (
                <Modal
                    open={!!deletingLog}
                    onClose={() => setDeletingLog(null)}
                    title="Obriši zapis"
                >
                    <div className="space-y-4">
                        <p className="text-slate-600">
                            Da li ste sigurni da želite da obrišete zapis o točenju goriva?
                        </p>
                        <div className="p-3 bg-slate-50 rounded-xl">
                            <p className="text-sm">
                                <strong>{deletingLog.vehicle?.registration}</strong> - {formatDate(deletingLog.date)}
                            </p>
                            <p className="text-sm text-slate-500">
                                {parseFloat(deletingLog.liters).toFixed(2)} L • {formatCurrency(deletingLog.total_price)}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeletingLog(null)}
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

            {/* View Receipt Modal */}
            {viewingReceipt && (
                <Modal
                    open={!!viewingReceipt}
                    onClose={() => setViewingReceipt(null)}
                    title="Račun za gorivo"
                >
                    <div className="space-y-4">
                        <div className="p-3 bg-slate-50 rounded-xl">
                            <p className="text-sm">
                                <strong>{viewingReceipt.vehicle?.registration}</strong> - {formatDate(viewingReceipt.date)}
                            </p>
                            {viewingReceipt.gas_station && (
                                <p className="text-sm text-slate-500">{viewingReceipt.gas_station}</p>
                            )}
                        </div>
                        <div className="flex justify-center">
                            <img
                                src={viewingReceipt.receipt_image_url}
                                alt="Račun"
                                className="max-w-full max-h-[60vh] rounded-xl shadow-lg"
                            />
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default FuelLogsPage;
