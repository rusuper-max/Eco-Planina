import { useState, useEffect, useRef } from 'react';
import { Truck, Search, ArrowUpDown, ArrowUp, ArrowDown, Info, CheckCircle2, Trash2, UserPlus, X, ChevronDown } from 'lucide-react';
import { EmptyState, FillLevelBar, RequestStatusBadge, CountdownTimer } from '../common';
import { getRemainingTime } from '../../utils/timeUtils';

const DEFAULT_WASTE_TYPES = [
    { id: 'cardboard', label: 'Karton', icon: '📦' },
    { id: 'plastic', label: 'Plastika', icon: '♻️' },
    { id: 'glass', label: 'Staklo', icon: '🍾' },
];

/**
 * Quick Assign Dropdown for selecting a driver
 * Uses fixed positioning to avoid clipping by parent overflow:hidden
 */
const QuickAssignDropdown = ({ request, drivers, onAssign, onClose, position, triggerRect }) => {
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                // Check if click was on the trigger button (to avoid immediate reopen)
                const isTrigger = triggerRect &&
                    e.clientX >= triggerRect.left &&
                    e.clientX <= triggerRect.right &&
                    e.clientY >= triggerRect.top &&
                    e.clientY <= triggerRect.bottom;

                if (!isTrigger) onClose();
            }
        };
        // Use capture to handle event before other clicks
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [onClose, triggerRect]);

    // Calculate fixed position
    const style = {
        position: 'fixed',
        zIndex: 9999,
        right: window.innerWidth - triggerRect.right,
    };

    if (position === 'top') {
        style.bottom = window.innerHeight - triggerRect.top + 5;
    } else {
        style.top = triggerRect.bottom + 5;
    }

    return (
        <div
            ref={dropdownRef}
            className="bg-white rounded-xl shadow-2xl border border-slate-200 py-2 min-w-56 animate-in fade-in zoom-in-95 duration-100"
            style={style}
        >
            <div className="px-3 pb-2 border-b border-slate-100 flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500">Izaberi vozača:</p>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                    <X size={14} />
                </button>
            </div>
            <div className="max-h-48 overflow-y-auto">
                {drivers.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-slate-400 text-center">Nema dostupnih vozača</p>
                ) : (
                    drivers.map(driver => (
                        <button
                            key={driver.id}
                            onClick={() => {
                                onAssign(request.id, driver.id);
                                onClose();
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-emerald-50 flex items-center gap-2 text-sm"
                        >
                            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                                <Truck size={14} className="text-emerald-600" />
                            </div>
                            <div>
                                <p className="font-medium text-slate-700">{driver.name}</p>
                                {driver.phone && <p className="text-xs text-slate-400">{driver.phone}</p>}
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
};

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
    assignments = [],
    drivers = [],
    onQuickAssign
}) => {
    // DEBUG: Log assignments and requests to see matching
    // console.log('DEBUG ManagerRequestsTable: assignments count:', assignments?.length, 'requests count:', requests?.length);

    const [sortBy, setSortBy] = useState('remaining'); // remaining, client, type, fill, date
    const [sortDir, setSortDir] = useState('asc'); // asc, desc
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, or waste type id
    const [filterFill, setFilterFill] = useState('all'); // all, low, medium, high, full

    // Dropdown state
    const [activeDropdown, setActiveDropdown] = useState({ id: null, rect: null, position: 'bottom' });

    // Sync with external filter (legacy support)
    useEffect(() => {
        // Convert legacy urgency to fill filter if needed
        if (initialUrgencyFilter && initialUrgencyFilter !== 'all') {
            // Legacy: just ignore old urgency filter
        }
    }, [initialUrgencyFilter]);

    // Close dropdown on scroll
    useEffect(() => {
        const handleScroll = () => {
            if (activeDropdown.id) setActiveDropdown({ id: null, rect: null, position: 'bottom' });
        };
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, [activeDropdown.id]);

    const handleFillChange = (value) => {
        setFilterFill(value);
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
        // Fill level filter
        if (filterFill !== 'all') {
            const fill = req.fill_level || 0;
            if (filterFill === 'low' && fill > 25) return false;
            if (filterFill === 'medium' && (fill <= 25 || fill > 50)) return false;
            if (filterFill === 'high' && (fill <= 50 || fill > 75)) return false;
            if (filterFill === 'full' && fill <= 75) return false;
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
                    value={filterFill}
                    onChange={(e) => handleFillChange(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm bg-white"
                >
                    <option value="all">Sva popunjenost</option>
                    <option value="low">Niska (0-25%)</option>
                    <option value="medium">Srednja (26-50%)</option>
                    <option value="high">Visoka (51-75%)</option>
                    <option value="full">Puna (76-100%)</option>
                </select>
            </div>

            {/* Results count */}
            <div className="text-sm text-slate-500">
                Prikazano {filtered.length} od {requests.length} zahteva
                {(searchQuery || filterType !== 'all' || filterFill !== 'all') && (
                    <button onClick={() => { setSearchQuery(''); setFilterType('all'); handleFillChange('all'); }} className="ml-2 text-emerald-600 hover:text-emerald-700">
                        Obriši filtere
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 border-b">
                        <tr>
                            <th className="px-2 md:px-3 py-3 text-left text-xs">ID</th>
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
                    <tbody className="divide-y relative">
                        {filtered.length === 0 ? (
                            <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Nema rezultata za ovu pretragu</td></tr>
                        ) : filtered.map(req => {
                            const rem = getRemainingTime(req.created_at, req.urgency);
                            const assignment = assignments.find(a => a.request_id === req.id);
                            const assignmentStatus = assignment?.status || 'not_assigned';
                            const driverName = assignment?.driver?.name;

                            return (
                                <tr key={req.id} className="hover:bg-slate-50">
                                    <td className="px-2 md:px-3 py-3">
                                        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                            {req.request_code || '-'}
                                        </span>
                                    </td>
                                    <td className="px-3 md:px-4 py-3">
                                        <button
                                            onClick={() => onClientClick?.(req.user_id)}
                                            className="font-medium text-sm text-blue-600 hover:text-blue-800 hover:underline text-left"
                                        >
                                            {req.client_name}
                                        </button>
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
                                    <td className="px-3 md:px-4 py-3">
                                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${rem.bg}`}>
                                            <CountdownTimer createdAt={req.created_at} urgency={req.urgency} />
                                        </span>
                                    </td>
                                    <td className="hidden md:table-cell px-4 py-3 text-xs text-slate-500">{new Date(req.created_at).toLocaleDateString('sr-RS')}</td>
                                    <td className="px-2 md:px-4 py-3 text-center whitespace-nowrap">
                                        <div className="inline-flex items-center gap-0.5 relative">
                                            <button onClick={() => onView(req)} className="p-1.5 md:p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Info"><Info size={18} /></button>
                                            {/* Quick Assign button - only show if not assigned and we have drivers */}
                                            {assignmentStatus === 'not_assigned' && drivers.length > 0 && onQuickAssign && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Close if already open for this id
                                                        if (activeDropdown.id === req.id) {
                                                            setActiveDropdown({ id: null, rect: null, position: 'bottom' });
                                                            return;
                                                        }

                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        const spaceBelow = window.innerHeight - rect.bottom;
                                                        // Increased threshold from 220 to 300 for safer flip
                                                        const position = spaceBelow < 300 ? 'top' : 'bottom';

                                                        setActiveDropdown({
                                                            id: req.id,
                                                            rect,
                                                            position
                                                        });
                                                    }}
                                                    className={`p-1.5 md:p-2 rounded-lg transition-colors ${activeDropdown.id === req.id ? 'bg-purple-100 text-purple-700' : 'text-purple-600 hover:bg-purple-50'}`}
                                                    title="Dodeli vozaču"
                                                >
                                                    <UserPlus size={18} />
                                                </button>
                                            )}
                                            <button onClick={() => onProcess(req)} className="p-1.5 md:p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Obradi"><CheckCircle2 size={18} /></button>
                                            <button onClick={() => onDelete(req.id)} className="p-1.5 md:p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Obriši"><Trash2 size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Render Dropdown using Portal or simple Fixed Overlay at the end */}
            {activeDropdown.id && activeDropdown.rect && (
                <QuickAssignDropdown
                    request={requests.find(r => r.id === activeDropdown.id)}
                    drivers={drivers}
                    onAssign={onQuickAssign}
                    onClose={() => setActiveDropdown({ id: null, rect: null, position: 'bottom' })}
                    position={activeDropdown.position}
                    triggerRect={activeDropdown.rect}
                />
            )}
        </div>
    );
};

export default ManagerRequestsTable;
