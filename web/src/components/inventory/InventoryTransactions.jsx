import { useState, useMemo } from 'react';
import {
    ArrowDownCircle,
    ArrowUpCircle,
    Filter,
    Calendar,
    Search,
    FileText,
    Download
} from 'lucide-react';
import * as XLSX from 'xlsx';

/**
 * InventoryTransactions - Prikaz istorije transakcija inventara
 */
export const InventoryTransactions = ({
    transactions = [],
    inventories = [],
    regions = [],
    wasteTypes = [],
    onRefresh
}) => {
    const [filters, setFilters] = useState({
        inventoryId: '',
        regionId: '',
        wasteTypeId: '',
        transactionType: '',
        dateFrom: '',
        dateTo: ''
    });
    const [searchTerm, setSearchTerm] = useState('');

    // Mapa za brzi lookup
    const wasteTypeMap = useMemo(() => {
        const map = {};
        wasteTypes.forEach(wt => { map[wt.id] = wt; });
        return map;
    }, [wasteTypes]);

    const inventoryMap = useMemo(() => {
        const map = {};
        inventories.forEach(inv => { map[inv.id] = inv; });
        return map;
    }, [inventories]);

    const regionMap = useMemo(() => {
        const map = {};
        regions.forEach(r => { map[r.id] = r; });
        return map;
    }, [regions]);

    // Filtrirane transakcije
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            // Filter po skladištu
            if (filters.inventoryId && t.inventory_id !== filters.inventoryId) return false;

            // Filter po regionu
            if (filters.regionId && t.region_id !== filters.regionId) return false;

            // Filter po tipu otpada
            if (filters.wasteTypeId && t.waste_type_id !== filters.wasteTypeId) return false;

            // Filter po tipu transakcije
            if (filters.transactionType && t.transaction_type !== filters.transactionType) return false;

            // Filter po datumu od
            if (filters.dateFrom) {
                const fromDate = new Date(filters.dateFrom);
                const txDate = new Date(t.created_at);
                if (txDate < fromDate) return false;
            }

            // Filter po datumu do
            if (filters.dateTo) {
                const toDate = new Date(filters.dateTo);
                toDate.setHours(23, 59, 59, 999);
                const txDate = new Date(t.created_at);
                if (txDate > toDate) return false;
            }

            // Search po notes ili created_by_name
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matchNotes = t.notes?.toLowerCase().includes(term);
                const matchUser = t.created_by_name?.toLowerCase().includes(term);
                const matchRegion = t.region_name?.toLowerCase().includes(term);
                if (!matchNotes && !matchUser && !matchRegion) return false;
            }

            return true;
        });
    }, [transactions, filters, searchTerm]);

    // Statistika filtriranih transakcija
    const stats = useMemo(() => {
        let totalIn = 0;
        let totalOut = 0;

        filteredTransactions.forEach(t => {
            if (t.transaction_type === 'in') {
                totalIn += parseFloat(t.quantity_kg) || 0;
            } else {
                totalOut += parseFloat(t.quantity_kg) || 0;
            }
        });

        return { totalIn, totalOut, net: totalIn - totalOut };
    }, [filteredTransactions]);

    // Format količine
    const formatQuantity = (kg) => {
        const num = parseFloat(kg) || 0;
        if (num >= 1000) {
            return `${(num / 1000).toFixed(2)} t`;
        }
        return `${num.toFixed(1)} kg`;
    };

    // Format datuma
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('sr-Latn-RS', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Source type label
    const getSourceLabel = (sourceType) => {
        const labels = {
            'processed_request': 'Obrađen zahtev',
            'shipment': 'Isporuka',
            'adjustment': 'Korekcija'
        };
        return labels[sourceType] || sourceType;
    };

    // Clear filters
    const clearFilters = () => {
        setFilters({
            inventoryId: '',
            regionId: '',
            wasteTypeId: '',
            transactionType: '',
            dateFrom: '',
            dateTo: ''
        });
        setSearchTerm('');
    };

    // Export to Excel
    const exportToExcel = () => {
        const data = filteredTransactions.map(t => ({
            'Datum': formatDate(t.created_at),
            'Skladište': inventoryMap[t.inventory_id]?.name || '-',
            'Tip': t.transaction_type === 'in' ? 'Ulaz' : 'Izlaz',
            'Vrsta otpada': wasteTypeMap[t.waste_type_id]?.name || '-',
            'Količina (kg)': parseFloat(t.quantity_kg) || 0,
            'Region': t.region_name || '-',
            'Izvor': getSourceLabel(t.source_type),
            'Napomena': t.notes || '',
            'Korisnik': t.created_by_name || '-'
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Transakcije');
        XLSX.writeFile(wb, `inventory_transactions_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const hasActiveFilters = filters.inventoryId || filters.regionId ||
        filters.wasteTypeId || filters.transactionType ||
        filters.dateFrom || filters.dateTo || searchTerm;

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Filter size={18} className="text-slate-400" />
                    <span className="font-medium text-slate-700">Filteri</span>
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="ml-auto text-xs text-emerald-600 hover:text-emerald-700"
                        >
                            Obriši sve filtere
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {/* Skladište */}
                    <select
                        value={filters.inventoryId}
                        onChange={(e) => setFilters(prev => ({ ...prev, inventoryId: e.target.value }))}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    >
                        <option value="">Sva skladišta</option>
                        {inventories.map(inv => (
                            <option key={inv.id} value={inv.id}>{inv.name}</option>
                        ))}
                    </select>

                    {/* Region */}
                    <select
                        value={filters.regionId}
                        onChange={(e) => setFilters(prev => ({ ...prev, regionId: e.target.value }))}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    >
                        <option value="">Svi regioni</option>
                        {regions.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>

                    {/* Vrsta otpada */}
                    <select
                        value={filters.wasteTypeId}
                        onChange={(e) => setFilters(prev => ({ ...prev, wasteTypeId: e.target.value }))}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    >
                        <option value="">Sve vrste otpada</option>
                        {wasteTypes.map(wt => (
                            <option key={wt.id} value={wt.id}>{wt.name}</option>
                        ))}
                    </select>

                    {/* Tip transakcije */}
                    <select
                        value={filters.transactionType}
                        onChange={(e) => setFilters(prev => ({ ...prev, transactionType: e.target.value }))}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    >
                        <option value="">Svi tipovi</option>
                        <option value="in">Ulaz</option>
                        <option value="out">Izlaz</option>
                    </select>

                    {/* Datum od */}
                    <div className="relative">
                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                            placeholder="Od"
                        />
                    </div>

                    {/* Datum do */}
                    <div className="relative">
                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                            placeholder="Do"
                        />
                    </div>
                </div>

                {/* Search */}
                <div className="mt-3 relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Pretraži po napomeni, korisniku ili regionu..."
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    />
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                    <div className="flex items-center gap-2 text-emerald-600 mb-1">
                        <ArrowDownCircle size={18} />
                        <span className="text-sm font-medium">Ukupan ulaz</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-700">{formatQuantity(stats.totalIn)}</p>
                </div>

                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                    <div className="flex items-center gap-2 text-red-600 mb-1">
                        <ArrowUpCircle size={18} />
                        <span className="text-sm font-medium">Ukupan izlaz</span>
                    </div>
                    <p className="text-2xl font-bold text-red-700">{formatQuantity(stats.totalOut)}</p>
                </div>

                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                        <FileText size={18} />
                        <span className="text-sm font-medium">Neto promena</span>
                    </div>
                    <p className={`text-2xl font-bold ${stats.net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {stats.net >= 0 ? '+' : ''}{formatQuantity(stats.net)}
                    </p>
                </div>
            </div>

            {/* Export button */}
            <div className="flex justify-end">
                <button
                    onClick={exportToExcel}
                    disabled={filteredTransactions.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download size={16} />
                    Izvezi Excel ({filteredTransactions.length})
                </button>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Datum</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Tip</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Skladište</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Vrsta otpada</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Količina</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Region</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Izvor</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Korisnik</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                                        {transactions.length === 0
                                            ? 'Nema transakcija u sistemu'
                                            : 'Nema transakcija koje odgovaraju filterima'
                                        }
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map(t => {
                                    const wasteType = wasteTypeMap[t.waste_type_id];
                                    const inventory = inventoryMap[t.inventory_id];

                                    return (
                                        <tr key={t.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-sm text-slate-600">
                                                {formatDate(t.created_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {t.transaction_type === 'in' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                                                        <ArrowDownCircle size={12} />
                                                        Ulaz
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                                        <ArrowUpCircle size={12} />
                                                        Izlaz
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-slate-700">
                                                {inventory?.name || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {wasteType ? (
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: wasteType.color || '#94a3b8' }}
                                                        />
                                                        <span className="text-sm text-slate-700">{wasteType.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`text-sm font-semibold ${
                                                    t.transaction_type === 'in' ? 'text-emerald-600' : 'text-red-600'
                                                }`}>
                                                    {t.transaction_type === 'in' ? '+' : '-'}
                                                    {formatQuantity(t.quantity_kg)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">
                                                {t.region_name || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                                    t.source_type === 'processed_request'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : t.source_type === 'adjustment'
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-purple-100 text-purple-700'
                                                }`}>
                                                    {getSourceLabel(t.source_type)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">
                                                {t.created_by_name || '-'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Notes section if present */}
            {filteredTransactions.some(t => t.notes) && (
                <div className="text-xs text-slate-500 mt-2">
                    * Neke transakcije imaju dodatne napomene. Kliknite na red za detalje.
                </div>
            )}
        </div>
    );
};

export default InventoryTransactions;
