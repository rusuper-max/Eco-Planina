import { useState, useEffect, useMemo } from 'react';
import {
    History, Filter, Search, ChevronDown, ChevronUp, RefreshCw,
    User, Truck, Package, CheckCircle2, UserPlus, Shield, XCircle,
    Calendar, Clock, Building2, X, Eye, ExternalLink, Users
} from 'lucide-react';
import { supabase } from '../../config/supabase';

// Ikone za razlicite akcije
const ACTION_CONFIG = {
    create: { icon: Package, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Kreiran' },
    process: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Obradjen' },
    assign: { icon: Truck, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Dodeljen' },
    picked_up: { icon: Package, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Preuzeto' },
    delivered: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Dostavljeno' },
    completed: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', label: 'Zavrseno' },
    cancelled: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Otkazano' },
    register: { icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Registrovan' },
    role_change: { icon: Shield, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Promena uloge' },
    update: { icon: RefreshCw, color: 'text-slate-600', bg: 'bg-slate-100', label: 'Azuriran' },
    delete: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Obrisan' },
};

// Ikone za tipove entiteta
const ENTITY_CONFIG = {
    pickup_request: { icon: Package, label: 'Zahtev' },
    processed_request: { icon: CheckCircle2, label: 'Obradjen zahtev' },
    driver_assignment: { icon: Truck, label: 'Dostava' },
    user: { icon: User, label: 'Korisnik' },
    client: { icon: Users, label: 'Klijent' },
    company: { icon: Building2, label: 'Firma' },
};

/**
 * Activity Log Page - Audit trail za pracenje aktivnosti
 */
export const ActivityLogPage = ({ companyCode, userRole, onUserClick, onClientClick }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filteri
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState('all');
    const [filterEntity, setFilterEntity] = useState('all');
    const [filterDateRange, setFilterDateRange] = useState('week');
    const [showFilters, setShowFilters] = useState(false);

    // Detail modal
    const [selectedLog, setSelectedLog] = useState(null);

    // Paginacija
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 50;

    // Ucitaj logove
    const fetchLogs = async (reset = false) => {
        setLoading(true);
        setError(null);

        try {
            const currentPage = reset ? 0 : page;

            let query = supabase
                .from('activity_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

            // Filter po firmi (osim za developera koji vidi sve)
            if (userRole !== 'developer' && companyCode) {
                query = query.eq('company_code', companyCode);
            }

            // Filter po akciji
            if (filterAction !== 'all') {
                query = query.eq('action', filterAction);
            }

            // Filter po tipu entiteta
            if (filterEntity !== 'all') {
                query = query.eq('entity_type', filterEntity);
            }

            // Filter po datumu
            if (filterDateRange !== 'all') {
                const now = new Date();
                let startDate;
                switch (filterDateRange) {
                    case 'today':
                        startDate = new Date(now.setHours(0, 0, 0, 0));
                        break;
                    case 'week':
                        startDate = new Date(now.setDate(now.getDate() - 7));
                        break;
                    case 'month':
                        startDate = new Date(now.setMonth(now.getMonth() - 1));
                        break;
                    default:
                        startDate = null;
                }
                if (startDate) {
                    query = query.gte('created_at', startDate.toISOString());
                }
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            if (reset) {
                setLogs(data || []);
                setPage(0);
            } else {
                setLogs(prev => [...prev, ...(data || [])]);
            }

            setHasMore((data?.length || 0) === PAGE_SIZE);
        } catch (err) {
            console.error('Error fetching activity logs:', err);
            setError('Greska pri ucitavanju logova');
        } finally {
            setLoading(false);
        }
    };

    // Ucitaj pri mount-u i kad se filteri promene
    useEffect(() => {
        fetchLogs(true);
    }, [companyCode, filterAction, filterEntity, filterDateRange]);

    // Filtrirani logovi (po search term-u)
    const filteredLogs = useMemo(() => {
        if (!searchTerm) return logs;
        const term = searchTerm.toLowerCase();
        return logs.filter(log =>
            log.description?.toLowerCase().includes(term) ||
            log.user_name?.toLowerCase().includes(term) ||
            log.action?.toLowerCase().includes(term)
        );
    }, [logs, searchTerm]);

    // Formatiraj vreme
    const formatDateTime = (dateStr) => {
        const date = new Date(dateStr);
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();

        if (isToday) {
            return `Danas, ${date.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}`;
        }

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return `Juce, ${date.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}`;
        }

        return date.toLocaleString('sr-RS', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Dobij config za akciju
    const getActionConfig = (action) => {
        return ACTION_CONFIG[action] || { icon: History, color: 'text-slate-600', bg: 'bg-slate-100', label: action };
    };

    // Dobij config za entitet
    const getEntityConfig = (entityType) => {
        return ENTITY_CONFIG[entityType] || { icon: Package, label: entityType };
    };

    // Grupisanje logova po datumu
    const groupedLogs = useMemo(() => {
        const groups = {};
        filteredLogs.forEach(log => {
            const date = new Date(log.created_at).toDateString();
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(log);
        });
        return groups;
    }, [filteredLogs]);

    // Format date header
    const formatDateHeader = (dateStr) => {
        const date = new Date(dateStr);
        const today = new Date();

        if (date.toDateString() === today.toDateString()) {
            return 'Danas';
        }

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return 'Juce';
        }

        return date.toLocaleDateString('sr-RS', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-xl">
                        <History className="w-6 h-6 text-slate-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Aktivnosti</h2>
                        <p className="text-sm text-slate-500">Pregled svih akcija u sistemu</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchLogs(true)}
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Osvezi"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${showFilters ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        <span className="text-sm font-medium">Filteri</span>
                        {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Filteri */}
            {showFilters && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Pretrazi..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Filter po akciji */}
                        <select
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">Sve akcije</option>
                            <option value="create">Kreiranje</option>
                            <option value="process">Obrada</option>
                            <option value="assign">Dodeljivanje</option>
                            <option value="picked_up">Preuzimanje</option>
                            <option value="delivered">Dostava</option>
                            <option value="delete">Brisanje</option>
                            <option value="register">Registracija</option>
                            <option value="role_change">Promena uloge</option>
                        </select>

                        {/* Filter po entitetu */}
                        <select
                            value={filterEntity}
                            onChange={(e) => setFilterEntity(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">Svi tipovi</option>
                            <option value="pickup_request">Zahtevi</option>
                            <option value="processed_request">Obradjeni zahtevi</option>
                            <option value="driver_assignment">Dostave</option>
                            <option value="user">Korisnici</option>
                            <option value="client">Klijenti</option>
                        </select>

                        {/* Filter po datumu */}
                        <select
                            value={filterDateRange}
                            onChange={(e) => setFilterDateRange(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="today">Danas</option>
                            <option value="week">Poslednjih 7 dana</option>
                            <option value="month">Poslednjih 30 dana</option>
                            <option value="all">Sve vreme</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                    {error}
                </div>
            )}

            {/* Log lista */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {loading && logs.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
                        <span className="ml-2 text-slate-500">Ucitavanje...</span>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                        <History className="w-12 h-12 mb-3 opacity-30" />
                        <p className="font-medium">Nema aktivnosti</p>
                        <p className="text-sm">Pokusajte sa drugim filterima</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {Object.entries(groupedLogs).map(([dateStr, dayLogs]) => (
                            <div key={dateStr}>
                                {/* Date header */}
                                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                                        <Calendar className="w-4 h-4" />
                                        {formatDateHeader(dateStr)}
                                        <span className="text-slate-400">({dayLogs.length})</span>
                                    </div>
                                </div>

                                {/* Day logs */}
                                {dayLogs.map((log) => {
                                    const actionConfig = getActionConfig(log.action);
                                    const entityConfig = getEntityConfig(log.entity_type);
                                    const ActionIcon = actionConfig.icon;
                                    const EntityIcon = entityConfig.icon;
                                    const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

                                    return (
                                        <div
                                            key={log.id}
                                            className="px-4 py-3 hover:bg-slate-50 transition-colors group"
                                        >
                                            <div className="flex items-start gap-3">
                                                {/* Action icon */}
                                                <div className={`p-2 rounded-lg ${actionConfig.bg}`}>
                                                    <ActionIcon className={`w-4 h-4 ${actionConfig.color}`} />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${actionConfig.bg} ${actionConfig.color}`}>
                                                            {actionConfig.label}
                                                        </span>
                                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                                            <EntityIcon className="w-3 h-3" />
                                                            {entityConfig.label}
                                                        </span>
                                                        <span className="text-sm text-slate-600">
                                                            {log.description}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                                        {/* User - klikabilan ako imamo onUserClick i user_id */}
                                                        <div className="flex items-center gap-1">
                                                            <User className="w-3 h-3" />
                                                            {onUserClick && log.user_id ? (
                                                                <button
                                                                    onClick={() => onUserClick(log.user_id)}
                                                                    className="text-blue-600 hover:underline hover:text-blue-700"
                                                                >
                                                                    {log.user_name || 'Sistem'}
                                                                </button>
                                                            ) : (
                                                                <span>{log.user_name || 'Sistem'}</span>
                                                            )}
                                                            {log.user_role && (
                                                                <span className="text-slate-300">({log.user_role})</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            <span>{formatDateTime(log.created_at)}</span>
                                                        </div>
                                                        {userRole === 'developer' && log.company_code && (
                                                            <div className="flex items-center gap-1">
                                                                <Building2 className="w-3 h-3" />
                                                                <span>{log.company_code}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Detail button */}
                                                {hasMetadata && (
                                                    <button
                                                        onClick={() => setSelectedLog(log)}
                                                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                        title="Prikazi detalje"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}

                {/* Load more */}
                {hasMore && !loading && filteredLogs.length > 0 && (
                    <div className="p-4 border-t border-slate-100">
                        <button
                            onClick={() => {
                                setPage(prev => prev + 1);
                                fetchLogs(false);
                            }}
                            className="w-full py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            Ucitaj jos...
                        </button>
                    </div>
                )}
            </div>

            {/* Stats summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Package className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">
                                {logs.filter(l => l.action === 'create').length}
                            </p>
                            <p className="text-xs text-slate-500">Novih zahteva</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">
                                {logs.filter(l => l.action === 'delivered').length}
                            </p>
                            <p className="text-xs text-slate-500">Dostavljeno</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Truck className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">
                                {logs.filter(l => l.action === 'assign').length}
                            </p>
                            <p className="text-xs text-slate-500">Dodeljeno</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <UserPlus className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">
                                {logs.filter(l => l.action === 'register').length}
                            </p>
                            <p className="text-xs text-slate-500">Novih korisnika</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
                        {/* Header */}
                        <div className="px-5 py-4 border-b flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-3">
                                {(() => {
                                    const config = getActionConfig(selectedLog.action);
                                    const Icon = config.icon;
                                    return (
                                        <div className={`p-2 rounded-lg ${config.bg}`}>
                                            <Icon className={`w-5 h-5 ${config.color}`} />
                                        </div>
                                    );
                                })()}
                                <div>
                                    <h3 className="font-bold text-slate-800">Detalji aktivnosti</h3>
                                    <p className="text-xs text-slate-500">{formatDateTime(selectedLog.created_at)}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh]">
                            {/* Opis */}
                            <div>
                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Opis</label>
                                <p className="mt-1 text-slate-800">{selectedLog.description}</p>
                            </div>

                            {/* Ko je izvrsio */}
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Korisnik</label>
                                    <div className="mt-1 flex items-center gap-2">
                                        <User className="w-4 h-4 text-slate-400" />
                                        {onUserClick && selectedLog.user_id ? (
                                            <button
                                                onClick={() => {
                                                    setSelectedLog(null);
                                                    onUserClick(selectedLog.user_id);
                                                }}
                                                className="text-blue-600 hover:underline font-medium"
                                            >
                                                {selectedLog.user_name || 'Sistem'}
                                            </button>
                                        ) : (
                                            <span className="text-slate-800">{selectedLog.user_name || 'Sistem'}</span>
                                        )}
                                        {selectedLog.user_role && (
                                            <span className="text-xs px-2 py-0.5 bg-slate-100 rounded-full text-slate-600">
                                                {selectedLog.user_role}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Tip entiteta i ID */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tip</label>
                                    <p className="mt-1 text-slate-800 capitalize">
                                        {getEntityConfig(selectedLog.entity_type).label}
                                    </p>
                                </div>
                                {selectedLog.entity_id && (
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">ID</label>
                                        <p className="mt-1 text-slate-600 font-mono text-xs break-all">
                                            {selectedLog.entity_id}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Metadata */}
                            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                                <div>
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Dodatni podaci</label>
                                    <div className="mt-2 bg-slate-50 rounded-lg p-3 space-y-2">
                                        {Object.entries(selectedLog.metadata).map(([key, value]) => {
                                            // Preskoci prazne vrednosti
                                            if (value === null || value === undefined || value === '') return null;

                                            // Formatiranje kljuca
                                            const label = key
                                                .replace(/_/g, ' ')
                                                .replace(/([A-Z])/g, ' $1')
                                                .toLowerCase()
                                                .replace(/^\w/, c => c.toUpperCase());

                                            // Formatiranje vrednosti
                                            let displayValue = value;
                                            if (typeof value === 'object') {
                                                displayValue = JSON.stringify(value, null, 2);
                                            } else if (key.includes('_at') || key.includes('date')) {
                                                try {
                                                    displayValue = new Date(value).toLocaleString('sr-RS');
                                                } catch {
                                                    displayValue = String(value);
                                                }
                                            }

                                            // Klikabilni linkovi za client_name
                                            const isClickableClient = key === 'client_name' && onClientClick && selectedLog.metadata.client_id;

                                            return (
                                                <div key={key} className="flex justify-between items-start">
                                                    <span className="text-xs text-slate-500">{label}:</span>
                                                    {isClickableClient ? (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedLog(null);
                                                                onClientClick(selectedLog.metadata.client_id);
                                                            }}
                                                            className="text-sm text-blue-600 hover:underline font-medium text-right"
                                                        >
                                                            {displayValue}
                                                        </button>
                                                    ) : (
                                                        <span className="text-sm text-slate-800 text-right font-medium">
                                                            {displayValue}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 border-t bg-slate-50 flex justify-end">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                            >
                                Zatvori
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActivityLogPage;
