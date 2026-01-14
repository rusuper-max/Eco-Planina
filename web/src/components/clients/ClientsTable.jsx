import { useState, useMemo } from 'react';
import { Users, Search, ArrowUpDown, ArrowUp, ArrowDown, MapPin, Box, Eye, Trash2, Building2 } from 'lucide-react';
import { EmptyState } from '../common';

/**
 * Clients Table with sorting and search
 */
export const ClientsTable = ({ clients, onView, onDelete, onEditLocation, onEditEquipment, equipment = [], regions = [] }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('name'); // name, phone, pib
    const [sortDir, setSortDir] = useState('asc');

    // Filter equipment to only include items that still exist
    const getClientEquipment = (client) => {
        if (!client.equipment_types || client.equipment_types.length === 0) return [];
        const existingEquipmentIds = new Set(equipment.map(eq => eq.id));
        return client.equipment_types.filter(eqId => existingEquipmentIds.has(eqId));
    };

    // Get region name by ID
    const getRegionName = (regionId) => {
        if (!regionId) return null;
        return regions.find(r => r.id === regionId)?.name;
    };

    // Filter and sort clients
    const filteredClients = useMemo(() => {
        let result = clients || [];

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(c =>
                c.name?.toLowerCase().includes(query) ||
                c.phone?.includes(query) ||
                c.pib?.includes(query)
            );
        }

        // Sort
        result = [...result].sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = (a.name || '').localeCompare(b.name || '');
                    break;
                case 'phone':
                    comparison = (a.phone || '').localeCompare(b.phone || '');
                    break;
                case 'pib':
                    comparison = (a.pib || '').localeCompare(b.pib || '');
                    break;
                default:
                    comparison = 0;
            }
            return sortDir === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [clients, searchQuery, sortBy, sortDir]);

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

    if (!clients?.length) return <EmptyState icon={Users} title="Nema klijenata" desc="Klijenti će se prikazati ovde" />;

    return (
        <div className="space-y-4">
            {/* Search and Filter */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[250px]">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                    <input
                        type="text"
                        placeholder="Pretraži po imenu, telefonu ili PIB-u..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none text-sm placeholder:text-slate-400"
                    />
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>Sortiraj:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
                    >
                        <option value="name">Po imenu</option>
                        <option value="phone">Po telefonu</option>
                        <option value="pib">Po PIB-u</option>
                    </select>
                    <button
                        onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
                        className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                        title={sortDir === 'asc' ? 'Rastuće' : 'Opadajuće'}
                    >
                        {sortDir === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                    </button>
                </div>
            </div>

            {/* Results count */}
            <div className="text-sm text-slate-500">
                Prikazano {filteredClients.length} od {clients.length} klijenata
                {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="ml-2 text-emerald-600 hover:text-emerald-700">
                        Obriši pretragu
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 border-b">
                        <tr>
                            <th className="px-3 md:px-4 py-3 text-left">
                                <button onClick={() => handleSort('name')} className="flex items-center gap-1.5 hover:text-slate-700">
                                    Klijent <SortIcon column="name" />
                                </button>
                            </th>
                            <th className="hidden sm:table-cell px-4 py-3 text-left">
                                <button onClick={() => handleSort('phone')} className="flex items-center gap-1.5 hover:text-slate-700">
                                    Telefon <SortIcon column="phone" />
                                </button>
                            </th>
                            <th className="hidden lg:table-cell px-4 py-3 text-left">
                                <button onClick={() => handleSort('pib')} className="flex items-center gap-1.5 hover:text-slate-700">
                                    PIB <SortIcon column="pib" />
                                </button>
                            </th>
                            <th className="hidden md:table-cell px-4 py-3 text-left">Oprema</th>
                            <th className="hidden lg:table-cell px-4 py-3 text-left">Filijala</th>
                            <th className="px-3 md:px-4 py-3 text-left">Lokacija</th>
                            <th className="px-2 md:px-4 py-3 text-right">Akcije</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredClients.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                                    Nema rezultata za "{searchQuery}"
                                </td>
                            </tr>
                        ) : filteredClients.map(c => {
                            const clientEquipment = getClientEquipment(c);
                            return (
                                <tr key={c.id} className="hover:bg-slate-50">
                                    <td className="px-3 md:px-4 py-3">
                                        <button onClick={() => onView(c)} className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left">{c.name}</button>
                                        <div className="sm:hidden text-xs text-slate-500 mt-0.5">{c.phone}</div>
                                        {/* Show PIB on mobile if exists */}
                                        {c.pib && <div className="lg:hidden text-xs text-blue-600 mt-0.5">PIB: {c.pib}</div>}
                                        {/* Show equipment on mobile */}
                                        <div className="md:hidden text-xs text-slate-500 mt-0.5">
                                            {clientEquipment.length > 0 ? (
                                                <span className="text-emerald-600">{clientEquipment.length} oprema</span>
                                            ) : (
                                                <span className="text-slate-400">Bez opreme</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="hidden sm:table-cell px-4 py-3 text-slate-600">{c.phone}</td>
                                    <td className="hidden lg:table-cell px-4 py-3">
                                        {c.pib ? (
                                            <code className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-mono">{c.pib}</code>
                                        ) : (
                                            <span className="text-slate-400 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="hidden md:table-cell px-4 py-3">
                                        <button
                                            onClick={() => onEditEquipment(c)}
                                            className={`text-xs px-2 py-1 rounded-full flex items-center gap-1.5 ${clientEquipment.length > 0
                                                ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                                                : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                                                }`}
                                        >
                                            <Box size={12} />
                                            <span>{clientEquipment.length > 0 ? `${clientEquipment.length} dodeljeno` : 'Dodeli'}</span>
                                        </button>
                                    </td>
                                    <td className="hidden lg:table-cell px-4 py-3">
                                        {(() => {
                                            const regionName = getRegionName(c.region_id);
                                            return regionName ? (
                                                <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 flex items-center gap-1 w-fit">
                                                    <Building2 size={12} />
                                                    {regionName}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-xs">-</span>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-3 md:px-4 py-3">
                                        <button
                                            onClick={() => onEditLocation(c)}
                                            className={`text-xs px-2 py-1 rounded-full flex items-center gap-1.5 ${c.latitude && c.longitude
                                                ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                                                : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                                                }`}
                                        >
                                            <MapPin size={12} />
                                            <span className="hidden sm:inline">{c.latitude && c.longitude ? 'Podešena' : 'Podesi'}</span>
                                            <span className="sm:hidden">{c.latitude && c.longitude ? 'OK' : 'Podesi'}</span>
                                        </button>
                                    </td>
                                    <td className="px-2 md:px-4 py-3 text-right whitespace-nowrap">
                                        <button onClick={() => onEditEquipment(c)} className="md:hidden p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg" title="Oprema">
                                            <Box size={18} />
                                        </button>
                                        <button onClick={() => onView(c)} className="p-1.5 md:p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Detalji">
                                            <Eye size={18} />
                                        </button>
                                        <button onClick={() => onDelete(c.id)} className="p-1.5 md:p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Obriši">
                                            <Trash2 size={18} />
                                        </button>
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

export default ClientsTable;
