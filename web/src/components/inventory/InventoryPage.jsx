import { useState, useEffect, useMemo } from 'react';
import {
    Warehouse, Package, Plus, ArrowDownToLine, ArrowUpFromLine,
    TrendingUp, Scale, MapPin, Calendar, ChevronDown, ChevronUp,
    Edit3, Trash2, Settings, Eye, EyeOff, Download, RefreshCw, Send, Sliders
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Modal, EmptyState, RecycleLoader } from '../common';
import { InventoryModal } from './InventoryModal';
import { InventoryTransactions } from './InventoryTransactions';
import { OutboundTab } from './OutboundTab';
import { AdjustmentModal } from './AdjustmentModal';
import { LowStockAlert } from './LowStockAlert';
import { InventoryChart } from './InventoryChart';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

/**
 * InventoryPage - Main inventory management page
 * For company_admin: full CRUD on warehouses + view all
 * For manager: view only (warehouse they belong to)
 */
export const InventoryPage = ({ wasteTypes = [], regions: propRegions = [] }) => {
    const { user } = useAuth();
    const {
        fetchInventories,
        createInventory,
        updateInventory,
        deleteInventory,
        fetchInventoryItems,
        fetchInventoryTransactions,
        getInventoryStatsByRegion,
        assignRegionToInventory,
        fetchCompanyRegions,
        // Outbound
        fetchOutbounds,
        createOutbound,
        sendOutbound,
        confirmOutbound,
        cancelOutbound
    } = useData();

    const [activeTab, setActiveTab] = useState('warehouses'); // warehouses, stock, transactions, outbound
    const [inventories, setInventories] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [outbounds, setOutbounds] = useState([]);
    const [regions, setRegions] = useState(propRegions);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
    const [editingInventory, setEditingInventory] = useState(null);
    const [deletingInventory, setDeletingInventory] = useState(null);
    const [selectedInventory, setSelectedInventory] = useState(null); // For detailed view
    const [regionStats, setRegionStats] = useState([]);

    // Filters
    const [selectedWarehouse, setSelectedWarehouse] = useState('all');

    const isSupervisor = user?.role === 'supervisor';
    const isManager = user?.role === 'manager';
    const isCompanyAdmin = user?.role === 'company_admin' || user?.is_owner;
    const isAdmin = ['admin', 'developer'].includes(user?.role);
    const canManage = isCompanyAdmin || isAdmin; // Only company_admin/admin can CREATE/EDIT/DELETE
    const showDisabledButton = isSupervisor || isManager; // These roles see disabled button

    // Load data
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [invData, itemsData, txData, regionsData, outboundsData] = await Promise.all([
                fetchInventories(),
                fetchInventoryItems(),
                fetchInventoryTransactions({ limit: 100 }),
                fetchCompanyRegions(),
                fetchOutbounds({ limit: 100 })
            ]);
            setInventories(invData);
            setInventoryItems(itemsData);
            setTransactions(txData);
            setRegions(regionsData || []);
            setOutbounds(outboundsData || []);
        } catch (err) {
            console.error('Error loading inventory data:', err);
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

    // Calculate aggregated stock by warehouse
    const stockByWarehouse = useMemo(() => {
        const result = {};
        inventoryItems.forEach(item => {
            const invId = item.inventory_id;
            if (!result[invId]) {
                result[invId] = {
                    inventory: item.inventory,
                    total_kg: 0,
                    items: []
                };
            }
            result[invId].total_kg += parseFloat(item.quantity_kg) || 0;
            result[invId].items.push(item);
        });
        return result;
    }, [inventoryItems]);

    // Get regions for each inventory
    const regionsByInventory = useMemo(() => {
        const result = {};
        regions.forEach(r => {
            if (r.inventory_id) {
                if (!result[r.inventory_id]) {
                    result[r.inventory_id] = [];
                }
                result[r.inventory_id].push(r);
            }
        });
        return result;
    }, [regions]);

    // Filtered stock based on selected warehouse
    const filteredStock = useMemo(() => {
        if (selectedWarehouse === 'all') {
            return inventoryItems;
        }
        return inventoryItems.filter(item => item.inventory_id === selectedWarehouse);
    }, [inventoryItems, selectedWarehouse]);

    // Aggregate stock by waste type (filter out zero quantities)
    const stockByWasteType = useMemo(() => {
        const result = {};
        filteredStock.forEach(item => {
            const wtId = item.waste_type_id;
            const qty = parseFloat(item.quantity_kg) || 0;
            // Skip items with zero or negative quantity
            if (qty <= 0) return;

            if (!result[wtId]) {
                result[wtId] = {
                    waste_type: item.waste_type,
                    total_kg: 0,
                    warehouses: []
                };
            }
            result[wtId].total_kg += qty;
            result[wtId].warehouses.push({
                inventory: item.inventory,
                quantity_kg: item.quantity_kg
            });
        });
        // Filter out any that ended up with zero total
        return Object.values(result)
            .filter(item => item.total_kg > 0)
            .sort((a, b) => b.total_kg - a.total_kg);
    }, [filteredStock]);

    // Total stock
    const totalStock = useMemo(() => {
        return filteredStock.reduce((sum, item) => sum + (parseFloat(item.quantity_kg) || 0), 0);
    }, [filteredStock]);

    // Handle create inventory
    const handleCreate = async ({ data, selectedRegionIds }) => {
        try {
            console.log('Creating inventory with data:', data);
            console.log('Selected region IDs:', selectedRegionIds);

            const newInventory = await createInventory(data);
            console.log('Created inventory:', newInventory);

            // Assign selected regions to this inventory
            if (selectedRegionIds && selectedRegionIds.length > 0 && newInventory?.id) {
                for (const regionId of selectedRegionIds) {
                    console.log(`Assigning region ${regionId} to inventory ${newInventory.id}`);
                    const result = await assignRegionToInventory(regionId, newInventory.id);
                    console.log('Assignment result:', result);
                }
            }

            toast.success('Skladište kreirano');
            setShowAddModal(false);
            loadData();
        } catch (err) {
            console.error('Error in handleCreate:', err);
            toast.error('Greška: ' + err.message);
        }
    };

    // Handle update inventory
    const handleUpdate = async ({ data, selectedRegionIds }) => {
        try {
            console.log('Updating inventory with data:', data);
            console.log('Selected region IDs:', selectedRegionIds);

            await updateInventory(editingInventory.id, data);

            // Update region assignments
            // First, unassign all regions currently assigned to this inventory
            const currentlyAssigned = regions.filter(r => r.inventory_id === editingInventory.id);
            console.log('Currently assigned regions:', currentlyAssigned.map(r => r.id));

            for (const region of currentlyAssigned) {
                if (!selectedRegionIds.includes(region.id)) {
                    console.log(`Unassigning region ${region.id}`);
                    const result = await assignRegionToInventory(region.id, null);
                    console.log('Unassign result:', result);
                }
            }

            // Then assign newly selected regions
            for (const regionId of selectedRegionIds) {
                const region = regions.find(r => r.id === regionId);
                if (region?.inventory_id !== editingInventory.id) {
                    console.log(`Assigning region ${regionId} to inventory ${editingInventory.id}`);
                    const result = await assignRegionToInventory(regionId, editingInventory.id);
                    console.log('Assignment result:', result);
                }
            }

            toast.success('Skladište ažurirano');
            setEditingInventory(null);
            loadData();
        } catch (err) {
            console.error('Error in handleUpdate:', err);
            toast.error('Greška: ' + err.message);
        }
    };

    // Handle delete inventory
    const handleDelete = async () => {
        try {
            await deleteInventory(deletingInventory.id);
            toast.success('Skladište obrisano');
            setDeletingInventory(null);
            loadData();
        } catch (err) {
            toast.error('Greška: ' + err.message);
        }
    };

    // Load region stats for selected inventory
    const loadRegionStats = async (inventoryId) => {
        try {
            const stats = await getInventoryStatsByRegion(inventoryId);
            setRegionStats(stats);
        } catch (err) {
            console.error('Error loading region stats:', err);
        }
    };

    // View inventory details
    const handleViewDetails = (inv) => {
        setSelectedInventory(inv);
        loadRegionStats(inv.id);
    };

    // Format weight
    const formatWeight = (kg) => {
        if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
        return `${kg.toFixed(1)} kg`;
    };

    // Export to Excel
    const handleExportExcel = () => {
        // Stock sheet
        const stockData = stockByWasteType.map(item => ({
            'Vrsta otpada': item.waste_type?.label || item.waste_type?.name || 'Nepoznato',
            'Količina (kg)': item.total_kg.toFixed(2),
            'Količina (t)': (item.total_kg / 1000).toFixed(3),
            'Skladišta': item.warehouses.map(w => w.inventory?.name).join(', ')
        }));

        // Transactions sheet
        const txData = transactions.slice(0, 500).map(tx => ({
            'Datum': new Date(tx.created_at).toLocaleDateString('sr-RS'),
            'Vreme': new Date(tx.created_at).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' }),
            'Skladište': tx.inventory?.name || '-',
            'Vrsta otpada': tx.waste_type?.label || tx.waste_type?.name || '-',
            'Tip': tx.transaction_type === 'in' ? 'Ulaz' : 'Izlaz',
            'Količina (kg)': tx.quantity_kg,
            'Region': tx.region_name || '-',
            'Napomena': tx.notes || '-'
        }));

        const wb = XLSX.utils.book_new();
        const wsStock = XLSX.utils.json_to_sheet(stockData);
        const wsTx = XLSX.utils.json_to_sheet(txData);
        XLSX.utils.book_append_sheet(wb, wsStock, 'Stanje');
        XLSX.utils.book_append_sheet(wb, wsTx, 'Transakcije');

        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Inventar_${dateStr}.xlsx`);
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
                        <Warehouse className="text-emerald-600" />
                        Inventar
                    </h1>
                    <p className="text-slate-500 mt-1">Praćenje zaliha po skladištima</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white hover:bg-slate-50 flex items-center gap-1.5"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">Osveži</span>
                    </button>
                    <button
                        onClick={handleExportExcel}
                        className="px-3 py-2 border border-emerald-200 text-emerald-600 rounded-xl text-sm bg-white hover:bg-emerald-50 flex items-center gap-1.5"
                    >
                        <Download size={16} />
                        <span className="hidden sm:inline">Excel</span>
                    </button>
                    {canManage && (
                        <button
                            onClick={() => setShowAdjustmentModal(true)}
                            className="px-3 py-2 border border-amber-200 text-amber-600 rounded-xl text-sm bg-white hover:bg-amber-50 flex items-center gap-1.5"
                            title="Ručna korekcija stanja"
                        >
                            <Sliders size={16} />
                            <span className="hidden sm:inline">Korekcija</span>
                        </button>
                    )}
                    {canManage ? (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 flex items-center gap-1.5"
                        >
                            <Plus size={16} />
                            Novo skladište
                        </button>
                    ) : showDisabledButton ? (
                        <button
                            disabled
                            title="Ovu funkciju može koristiti samo Admin vaše firme"
                            className="px-4 py-2 bg-slate-200 text-slate-400 rounded-xl text-sm font-medium cursor-not-allowed flex items-center gap-1.5"
                        >
                            <Plus size={16} />
                            Novo skladište
                        </button>
                    ) : null}
                </div>
            </div>

            {/* Low Stock Alert */}
            <LowStockAlert
                inventoryItems={inventoryItems}
                wasteTypes={wasteTypes}
                defaultThreshold={100}
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <Warehouse className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Skladišta</p>
                            <p className="text-2xl font-bold text-slate-800">{inventories.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Scale className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Ukupno na stanju</p>
                            <p className="text-2xl font-bold text-slate-800">{formatWeight(totalStock)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                            <Package className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Vrsta robe</p>
                            <p className="text-2xl font-bold text-slate-800">{stockByWasteType.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                            <MapPin className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Povezanih regiona</p>
                            <p className="text-2xl font-bold text-slate-800">
                                {regions.filter(r => r.inventory_id).length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart - only show when we have transactions */}
            {transactions.length > 0 && (
                <InventoryChart transactions={transactions} days={14} />
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
                {[
                    { id: 'warehouses', label: 'Skladišta', icon: Warehouse },
                    { id: 'stock', label: 'Stanje', icon: Package },
                    { id: 'outbound', label: 'Izlazi', icon: ArrowUpFromLine },
                    { id: 'transactions', label: 'Transakcije', icon: TrendingUp }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                            activeTab === tab.id
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'warehouses' && (
                <div className="space-y-4">
                    {inventories.length === 0 ? (
                        <EmptyState
                            icon={Warehouse}
                            title="Nema skladišta"
                            desc={canManage ? "Kreirajte prvo skladište da biste počeli sa praćenjem inventara" : "Administrator još nije kreirao skladišta"}
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {inventories.map(inv => {
                                const stock = stockByWarehouse[inv.id];
                                const invRegions = regionsByInventory[inv.id] || [];

                                return (
                                    <div
                                        key={inv.id}
                                        className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                                    >
                                        <div className="p-5">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                                                        <Warehouse className="w-6 h-6 text-emerald-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-slate-800">{inv.name}</h3>
                                                        {inv.description && (
                                                            <p className="text-sm text-slate-500 mt-0.5">{inv.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                {canManage && (
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => setEditingInventory(inv)}
                                                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                                                        >
                                                            <Edit3 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeletingInventory(inv)}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Stats */}
                                            <div className="mt-4 grid grid-cols-2 gap-3">
                                                <div className="bg-slate-50 rounded-xl p-3 text-center">
                                                    <p className="text-lg font-bold text-emerald-600">
                                                        {formatWeight(stock?.total_kg || 0)}
                                                    </p>
                                                    <p className="text-xs text-slate-500">Na stanju</p>
                                                </div>
                                                <div className="bg-slate-50 rounded-xl p-3 text-center">
                                                    <p className="text-lg font-bold text-blue-600">
                                                        {invRegions.length}
                                                    </p>
                                                    <p className="text-xs text-slate-500">Regiona</p>
                                                </div>
                                            </div>

                                            {/* Regions list */}
                                            {invRegions.length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-1">
                                                    {invRegions.slice(0, 3).map(r => (
                                                        <span
                                                            key={r.id}
                                                            className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs"
                                                        >
                                                            {r.name}
                                                        </span>
                                                    ))}
                                                    {invRegions.length > 3 && (
                                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
                                                            +{invRegions.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Visibility indicator */}
                                            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                                                {inv.manager_visibility === 'full' ? (
                                                    <>
                                                        <Eye size={14} />
                                                        <span>Menadžeri vide sve</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <EyeOff size={14} />
                                                        <span>Menadžeri vide samo svoj region</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                                            <button
                                                onClick={() => handleViewDetails(inv)}
                                                className="w-full text-center text-sm text-emerald-600 font-medium hover:text-emerald-700"
                                            >
                                                Pogledaj detalje
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'stock' && (
                <div className="space-y-4">
                    {/* Filter */}
                    <div className="flex gap-3">
                        <select
                            value={selectedWarehouse}
                            onChange={(e) => setSelectedWarehouse(e.target.value)}
                            className="px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                        >
                            <option value="all">Sva skladišta</option>
                            {inventories.map(inv => (
                                <option key={inv.id} value={inv.id}>{inv.name}</option>
                            ))}
                        </select>
                    </div>

                    {stockByWasteType.length === 0 ? (
                        <EmptyState
                            icon={Package}
                            title="Nema zaliha"
                            desc="Kada se obrađuju zahtevi sa težinom, zalihe će se automatski ažurirati"
                        />
                    ) : (
                        <div className="bg-white rounded-2xl border overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Vrsta otpada</th>
                                        <th className="px-4 py-3 text-right">Količina (kg)</th>
                                        <th className="px-4 py-3 text-right">Količina (t)</th>
                                        <th className="px-4 py-3 text-left hidden sm:table-cell">Skladišta</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {stockByWasteType.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">
                                                        {item.waste_type?.icon || '📦'}
                                                    </span>
                                                    <span className="font-medium">
                                                        {item.waste_type?.label || item.waste_type?.name || 'Nepoznato'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono">
                                                {item.total_kg.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-emerald-600 font-semibold">
                                                {(item.total_kg / 1000).toFixed(3)}
                                            </td>
                                            <td className="px-4 py-3 hidden sm:table-cell">
                                                <div className="flex flex-wrap gap-1">
                                                    {item.warehouses.map((w, i) => (
                                                        <span
                                                            key={i}
                                                            className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs"
                                                        >
                                                            {w.inventory?.name}: {formatWeight(w.quantity_kg)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-emerald-50 border-t-2 border-emerald-200">
                                    <tr>
                                        <td className="px-4 py-3 font-bold text-emerald-800">UKUPNO</td>
                                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-800">
                                            {totalStock.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-800">
                                            {(totalStock / 1000).toFixed(3)}
                                        </td>
                                        <td className="px-4 py-3 hidden sm:table-cell"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'outbound' && (
                <OutboundTab
                    outbounds={outbounds}
                    inventories={inventories}
                    wasteTypes={wasteTypes}
                    inventoryItems={inventoryItems}
                    canManage={canManage || isSupervisor || isManager}
                    onCreateOutbound={createOutbound}
                    onSendOutbound={sendOutbound}
                    onConfirmOutbound={confirmOutbound}
                    onCancelOutbound={cancelOutbound}
                    onRefresh={loadData}
                />
            )}

            {activeTab === 'transactions' && (
                <InventoryTransactions
                    transactions={transactions}
                    inventories={inventories}
                    regions={regions}
                    wasteTypes={wasteTypes}
                    onRefresh={loadData}
                />
            )}

            {/* Add/Edit Modal */}
            {(showAddModal || editingInventory) && (
                <InventoryModal
                    inventory={editingInventory}
                    regions={regions}
                    assignedRegionIds={editingInventory
                        ? regions.filter(r => r.inventory_id === editingInventory.id).map(r => r.id)
                        : []
                    }
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingInventory(null);
                    }}
                    onSave={editingInventory ? handleUpdate : handleCreate}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deletingInventory && (
                <Modal
                    open={!!deletingInventory}
                    onClose={() => setDeletingInventory(null)}
                    title="Obriši skladište"
                >
                    <div className="space-y-4">
                        <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                            <p className="text-sm text-red-800">
                                Da li ste sigurni da želite da obrišete skladište <strong>{deletingInventory.name}</strong>?
                            </p>
                            <p className="text-xs text-red-600 mt-2">
                                Ova akcija će obrisati sve podatke o zalihama za ovo skladište.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeletingInventory(null)}
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

            {/* Details Modal */}
            {selectedInventory && (
                <Modal
                    open={!!selectedInventory}
                    onClose={() => setSelectedInventory(null)}
                    title={selectedInventory.name}
                    size="lg"
                >
                    <div className="space-y-4">
                        {/* Stock in this warehouse */}
                        <div>
                            <h4 className="font-medium text-slate-700 mb-2">Stanje zaliha</h4>
                            <div className="space-y-2">
                                {(stockByWarehouse[selectedInventory.id]?.items || []).map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <span>{item.waste_type?.icon || '📦'}</span>
                                            <span>{item.waste_type?.label || item.waste_type?.name}</span>
                                        </div>
                                        <span className="font-mono font-semibold text-emerald-600">
                                            {formatWeight(item.quantity_kg)}
                                        </span>
                                    </div>
                                ))}
                                {(!stockByWarehouse[selectedInventory.id]?.items?.length) && (
                                    <p className="text-sm text-slate-500 text-center py-4">Nema zaliha</p>
                                )}
                            </div>
                        </div>

                        {/* Contribution by region */}
                        <div>
                            <h4 className="font-medium text-slate-700 mb-2">Doprinos po regionima</h4>
                            <div className="space-y-2">
                                {regionStats.map((stat, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <MapPin size={16} className="text-amber-600" />
                                            <span>{stat.region_name}</span>
                                        </div>
                                        <span className="font-mono font-semibold text-amber-700">
                                            {formatWeight(stat.total_kg)}
                                        </span>
                                    </div>
                                ))}
                                {regionStats.length === 0 && (
                                    <p className="text-sm text-slate-500 text-center py-4">Nema podataka o doprinosu</p>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => setSelectedInventory(null)}
                            className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium"
                        >
                            Zatvori
                        </button>
                    </div>
                </Modal>
            )}

            {/* Adjustment Modal */}
            {showAdjustmentModal && (
                <AdjustmentModal
                    inventories={inventories}
                    wasteTypes={wasteTypes}
                    inventoryItems={inventoryItems}
                    onClose={() => setShowAdjustmentModal(false)}
                    onSave={loadData}
                />
            )}
        </div>
    );
};

export default InventoryPage;
