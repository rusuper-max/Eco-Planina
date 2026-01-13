import { useState, useEffect } from 'react';
import { Truck, Search, ArrowUpDown, ArrowUp, ArrowDown, Info, CheckCircle2, Trash2 } from 'lucide-react';
import { EmptyState, FillLevelBar, RequestStatusBadge } from '../common';
import { getRemainingTime, getCurrentUrgency } from '../../utils/timeUtils';

const DEFAULT_WASTE_TYPES = [
    { id: 'cardboard', label: 'Karton', icon: '📦' },
    { id: 'plastic', label: 'Plastika', icon: '♻️' },
    { id: 'glass', label: 'Staklo', icon: '🍾' },
];

/**
 * Manager Table with sorting, filtering and search
 */
export const ManagerRequestsTable = ({
    requests,
    onProcess,
    onDelete,
    onView,
    onClientClick,
    wasteTypes = DEFAULT_WASTE_TYPES,
    initialUrgencyFilter = 'all',
    onUrgencyFilterChange,
    assignments = []
}) => {
    const [sortBy, setSortBy] = useState('remaining'); // remaining, client, type, fill, date
    const [sortDir, setSortDir] = useState('asc'); // asc, desc
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, or waste type id
    const [filterUrgency, setFilterUrgency] = useState(initialUrgencyFilter); // all, 24h, 48h, 72h

    // Sync with external filter
    useEffect(() => {
        setFilterUrgency(initialUrgencyFilter);
    }, [initialUrgencyFilter]);

    const handleUrgencyChange = (value) => {
        setFilterUrgency(value);
        onUrgencyFilterChange?.(value);
    };

    if (!requests?.length) return <EmptyState icon={Truck} title="Nema zahteva" desc="Zahtevi će se prikazati ovde" />;

    // Filter requests
    let filtered = requests.filter(req => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesName = req.client_name?.toLowerCase().includes(query);
            const matchesType = req.waste_label?.toLowerCase().includes(query);
            const matchesDate = new Date(req.created_at).toLocaleDateString('sr-RS').includes(query);
            const matchesCode = req.request_code?.toLowerCase().includes(query);
            if (!matchesName && !matchesType && !matchesDate && !matchesCode) return false;
        }
        // Type filter
        if (filterType !== 'all' && req.waste_type !== filterType) return false;
        // Urgency filter - use current urgency based on remaining time, not original
        if (filterUrgency !== 'all') {
            const currentUrgency = getCurrentUrgency(req.created_at, req.urgency);
            if (currentUrgency !== filterUrgency) return false;
        }
        return true;
    });

    // Sort requests
    filtered = [...filtered].sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
            case 'remaining':
                comparison = getRemainingTime(a.created_at, a.urgency).ms - getRemainingTime(b.created_at, b.urgency).ms;
                break;
            case 'client':
                comparison = (a.client_name || '').localeCompare(b.client_name || '');
                break;
            case 'type':
                comparison = (a.waste_label || '').localeCompare(b.waste_label || '');
                break;
            case 'fill':
                comparison = a.fill_level - b.fill_level;
                break;
            case 'date':
                comparison = new Date(a.created_at) - new Date(b.created_at);
                break;
            default:
                comparison = 0;
        }
        return sortDir === 'asc' ? comparison : -comparison;
    });

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortDir('asc');
        }
    };

    const SortIcon = ({ column }) => {
        if (sortBy !== column) return <ArrowUpDown size={14} className="text-slate-300" />;
        return sortDir === 'asc' ? <ArrowUp size={14} className="text-emerald-600" /> : <ArrowDown size={14} className="text-emerald-600" />;
    };

    return (
        <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 md:max-w-md">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                    <input
                        type="text"
                        placeholder="Pretraži po imenu, vrsti, datumu..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none text-sm placeholder:text-slate-400"
                    />
                </div>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm bg-white"
                >
                    <option value="all">Sve vrste</option>
                    {wasteTypes.map(w => <option key={w.id} value={w.id}>{w.icon} {w.label}</option>)}
                </select>
                <select
                    value={filterUrgency}
                    onChange={(e) => handleUrgencyChange(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm bg-white"
                >
                    <option value="all">Sva hitnost</option>
                    <option value="24h">Hitno (24h)</option>
                    <option value="48h">Srednje (48h)</option>
                    <option value="72h">Normalno (72h)</option>
                </select>
            </div>

            {/* Results count */}
            <div className="text-sm text-slate-500">
                Prikazano {filtered.length} od {requests.length} zahteva
                {(searchQuery || filterType !== 'all' || filterUrgency !== 'all') && (
                    <button onClick={() => { setSearchQuery(''); setFilterType('all'); handleUrgencyChange('all'); }} className="ml-2 text-emerald-600 hover:text-emerald-700">
                        Obriši filtere
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 border-b">
                        <tr>
                            <th className="px-3 md:px-4 py-3 text-left">
                                <button onClick={() => handleSort('client')} className="flex items-center gap-1.5 hover:text-slate-700">
                                    Klijent <SortIcon column="client" />
                                </button>
                            </th>
                            <th className="px-3 md:px-4 py-3 text-left">
                                <button onClick={() => handleSort('type')} className="flex items-center gap-1.5 hover:text-slate-700">
                                    Tip <SortIcon column="type" />
                                </button>
                            </th>
                            <th className="hidden lg:table-cell px-2 py-3 text-left text-xs">Status</th>
                            <th className="hidden md:table-cell px-4 py-3 text-left">
                                <button onClick={() => handleSort('fill')} className="flex items-center gap-1.5 hover:text-slate-700">
                                    % <SortIcon column="fill" />
                                </button>
                            </th>
                            <th className="px-3 md:px-4 py-3 text-left">
                                <button onClick={() => handleSort('remaining')} className="flex items-center gap-1.5 hover:text-slate-700">
                                    <span className="hidden sm:inline">Preostalo</span>
                                    <span className="sm:hidden">Vreme</span>
                                    <SortIcon column="remaining" />
                                </button>
                            </th>
                            <th className="hidden md:table-cell px-4 py-3 text-left">
                                <button onClick={() => handleSort('date')} className="flex items-center gap-1.5 hover:text-slate-700">
                                    Datum <SortIcon column="date" />
                                </button>
                            </th>
                            <th className="px-2 md:px-4 py-3 text-center">Akcije</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Nema rezultata za ovu pretragu</td></tr>
                        ) : filtered.map(req => {
                            const rem = getRemainingTime(req.created_at, req.urgency);
                            const assignment = assignments.find(a => a.request_id === req.id);
                            const assignmentStatus = assignment?.status || 'not_assigned';
                            const driverName = assignment?.driver?.name;
                            return (
                                <tr key={req.id} className="hover:bg-slate-50">
                                    <td className="px-3 md:px-4 py-3">
                                        <button
                                            onClick={() => onClientClick?.(req.user_id)}
                                            className="font-medium text-sm text-blue-600 hover:text-blue-800 hover:underline text-left"
                                        >
                                            {req.client_name}
                                        </button>
                                        {req.request_code && (
                                            <p className="text-xs text-slate-400 font-mono mt-0.5">{req.request_code}</p>
                                        )}
                                    </td>
                                    <td className="px-3 md:px-4 py-3">
                                        <span className="text-lg">{wasteTypes.find(w => w.id === req.waste_type)?.icon || '📦'}</span>
                                        <span className="hidden sm:inline ml-1">{req.waste_label}</span>
                                    </td>
                                    <td className="hidden lg:table-cell px-2 py-3">
                                        <RequestStatusBadge status={assignmentStatus} driverName={driverName} assignment={assignment} />
                                    </td>
                                    <td className="hidden md:table-cell px-4 py-3">
                                        <FillLevelBar fillLevel={req.fill_level} />
                                    </td>
                                    <td className="px-3 md:px-4 py-3"><span className={`px-2 py-1 text-xs font-medium rounded-full ${rem.bg} ${rem.color}`}>{rem.text}</span></td>
                                    <td className="hidden md:table-cell px-4 py-3 text-xs text-slate-500">{new Date(req.created_at).toLocaleDateString('sr-RS')}</td>
                                    <td className="px-2 md:px-4 py-3 text-center whitespace-nowrap">
                                        <button onClick={() => onView(req)} className="p-1.5 md:p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Info"><Info size={18} /></button>
                                        <button onClick={() => onProcess(req)} className="p-1.5 md:p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Obradi"><CheckCircle2 size={18} /></button>
                                        <button onClick={() => onDelete(req.id)} className="p-1.5 md:p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Obriši"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ManagerRequestsTable;
