import { useState, useEffect } from 'react';
import { ArrowUpFromLine, RefreshCw } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { RecycleLoader } from '../common';
import { OutboundTab } from './OutboundTab';
import toast from 'react-hot-toast';

/**
 * OutboundPage - Samostalna stranica za izlaze iz skladišta
 */
export const OutboundPage = ({ wasteTypes = [] }) => {
    const { user } = useAuth();
    const {
        fetchInventories,
        fetchInventoryItems,
        fetchCompanyRegions,
        fetchOutbounds,
        createOutbound,
        sendOutbound,
        confirmOutbound,
        cancelOutbound
    } = useData();

    const [inventories, setInventories] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [outbounds, setOutbounds] = useState([]);
    const [regions, setRegions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const isSupervisor = user?.role === 'supervisor';
    const isManager = user?.role === 'manager';
    const isCompanyAdmin = user?.role === 'company_admin' || user?.is_owner;
    const isAdmin = ['admin', 'developer'].includes(user?.role);
    const canManage = isCompanyAdmin || isAdmin || isSupervisor || isManager;

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [invData, itemsData, regionsData, outboundsData] = await Promise.all([
                fetchInventories(),
                fetchInventoryItems(),
                fetchCompanyRegions(),
                fetchOutbounds({ limit: 200 })
            ]);
            setInventories(invData);
            setInventoryItems(itemsData);
            setRegions(regionsData || []);
            setOutbounds(outboundsData || []);
        } catch (err) {
            console.error('Error loading outbound data:', err);
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
                        <ArrowUpFromLine className="text-purple-600" />
                        Izlazi
                    </h1>
                    <p className="text-slate-500 mt-1">Evidencija izlaza robe iz skladišta</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white hover:bg-slate-50 flex items-center gap-2"
                >
                    <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    Osveži
                </button>
            </div>

            {/* Outbound Tab Content */}
            <OutboundTab
                outbounds={outbounds}
                inventories={inventories}
                wasteTypes={wasteTypes}
                inventoryItems={inventoryItems}
                canManage={canManage}
                onCreateOutbound={createOutbound}
                onSendOutbound={sendOutbound}
                onConfirmOutbound={confirmOutbound}
                onCancelOutbound={cancelOutbound}
                onRefresh={loadData}
            />
        </div>
    );
};

export default OutboundPage;
