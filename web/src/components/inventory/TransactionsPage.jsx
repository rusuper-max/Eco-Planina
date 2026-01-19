import { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { RecycleLoader } from '../common';
import { InventoryTransactions } from './InventoryTransactions';
import toast from 'react-hot-toast';

/**
 * TransactionsPage - Samostalna stranica za transakcije inventara
 */
export const TransactionsPage = ({ wasteTypes = [] }) => {
    const {
        fetchInventories,
        fetchInventoryTransactions,
        fetchCompanyRegions
    } = useData();

    const [inventories, setInventories] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [regions, setRegions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [invData, txData, regionsData] = await Promise.all([
                fetchInventories(),
                fetchInventoryTransactions({ limit: 500 }),
                fetchCompanyRegions()
            ]);
            setInventories(invData);
            setTransactions(txData);
            setRegions(regionsData || []);
        } catch (err) {
            console.error('Error loading transactions data:', err);
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
                        <TrendingUp className="text-blue-600" />
                        Transakcije
                    </h1>
                    <p className="text-slate-500 mt-1">Istorija svih ulaza i izlaza iz skladišta</p>
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

            {/* Transactions Content */}
            <InventoryTransactions
                transactions={transactions}
                inventories={inventories}
                regions={regions}
                wasteTypes={wasteTypes}
                onRefresh={loadData}
            />
        </div>
    );
};

export default TransactionsPage;
