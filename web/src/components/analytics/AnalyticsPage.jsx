import { useState } from 'react';
import { BarChart3, Scale, Truck, CheckCircle2, Recycle, Clock, Calendar, Users } from 'lucide-react';

/**
 * Analytics Page with Charts - Displays waste collection statistics
 */
export const AnalyticsPage = ({ processedRequests, clients, wasteTypes }) => {
    const [dateRange, setDateRange] = useState('month');
    const [selectedWasteType, setSelectedWasteType] = useState('all');

    const getFilteredRequests = () => {
        if (!processedRequests) return [];
        const now = new Date();
        let startDate = null;

        switch (dateRange) {
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'month':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
            case 'year':
                startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                break;
            default:
                startDate = null;
        }

        let filtered = processedRequests;
        if (startDate) {
            filtered = filtered.filter(r => new Date(r.processed_at) >= startDate);
        }
        if (selectedWasteType !== 'all') {
            filtered = filtered.filter(r => r.waste_type === selectedWasteType);
        }
        return filtered;
    };

    const filteredRequests = getFilteredRequests();

    const calculateTotalWeight = (requests) => {
        return requests.reduce((total, r) => {
            if (!r.weight) return total;
            const weightInKg = r.weight_unit === 't' ? r.weight * 1000 : r.weight;
            return total + weightInKg;
        }, 0);
    };

    const getWeightByWasteType = () => {
        const byType = {};
        filteredRequests.forEach(r => {
            if (!r.weight) return;
            const typeLabel = r.waste_label || r.waste_type || 'Nepoznato';
            const weightInKg = r.weight_unit === 't' ? r.weight * 1000 : r.weight;
            byType[typeLabel] = (byType[typeLabel] || 0) + weightInKg;
        });
        return Object.entries(byType)
            .map(([type, weight]) => ({ type, weight }))
            .sort((a, b) => b.weight - a.weight);
    };

    const getWeightByClient = () => {
        const byClient = {};
        filteredRequests.forEach(r => {
            if (!r.weight) return;
            const clientName = r.client_name || 'Nepoznat';
            const weightInKg = r.weight_unit === 't' ? r.weight * 1000 : r.weight;
            byClient[clientName] = (byClient[clientName] || 0) + weightInKg;
        });
        return Object.entries(byClient)
            .map(([client, weight]) => ({ client, weight }))
            .sort((a, b) => b.weight - a.weight);
    };

    const getRequestsByDate = () => {
        const byDate = {};
        filteredRequests.forEach(r => {
            const dateObj = new Date(r.processed_at);
            const dateKey = dateObj.toISOString().split('T')[0];
            const dateLabel = dateObj.toLocaleDateString('sr-RS', { day: 'numeric', month: 'numeric' });
            if (!byDate[dateKey]) byDate[dateKey] = { date: dateLabel, count: 0 };
            byDate[dateKey].count++;
        });
        return Object.entries(byDate)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([, data]) => data)
            .slice(-14);
    };

    const getWeightByDate = () => {
        const byDate = {};
        filteredRequests.forEach(r => {
            if (!r.weight) return;
            const dateObj = new Date(r.processed_at);
            const dateKey = dateObj.toISOString().split('T')[0];
            const dateLabel = dateObj.toLocaleDateString('sr-RS', { day: 'numeric', month: 'numeric' });
            const weightInKg = r.weight_unit === 't' ? r.weight * 1000 : r.weight;
            if (!byDate[dateKey]) byDate[dateKey] = { date: dateLabel, weight: 0 };
            byDate[dateKey].weight += weightInKg;
        });
        return Object.entries(byDate)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([, data]) => data)
            .slice(-14);
    };

    const totalWeight = calculateTotalWeight(filteredRequests);
    const weightByType = getWeightByWasteType();
    const weightByClient = getWeightByClient();
    const requestsByDate = getRequestsByDate();
    const weightByDate = getWeightByDate();
    const requestsWithWeight = filteredRequests.filter(r => r.weight).length;

    const calculateAverageTime = () => {
        const requestsWithBothDates = filteredRequests.filter(r => r.created_at && r.processed_at);
        if (requestsWithBothDates.length === 0) return null;

        const totalMinutes = requestsWithBothDates.reduce((total, r) => {
            const created = new Date(r.created_at).getTime();
            const processed = new Date(r.processed_at).getTime();
            return total + (processed - created) / (1000 * 60);
        }, 0);

        return totalMinutes / requestsWithBothDates.length;
    };

    const averageTimeMinutes = calculateAverageTime();

    const formatAverageTime = (minutes) => {
        if (minutes === null) return 'N/A';
        if (minutes < 60) return `${Math.round(minutes)} min`;
        if (minutes < 1440) return `${(minutes / 60).toFixed(1)} h`;
        return `${(minutes / 1440).toFixed(1)} dana`;
    };

    const formatWeight = (kg) => {
        if (kg >= 1000) {
            return `${(kg / 1000).toFixed(2)} t`;
        }
        return `${kg.toFixed(1)} kg`;
    };

    const maxWeightByType = Math.max(...weightByType.map(w => w.weight), 1);
    const maxWeightByClient = Math.max(...weightByClient.map(w => w.weight), 1);
    const maxRequestsByDate = Math.max(...requestsByDate.map(r => r.count), 1);
    const maxWeightByDate = Math.max(...weightByDate.map(w => w.weight), 1);

    return (
        <div className="space-y-6">
            {/* Header with filters */}
            <div className="bg-white rounded-2xl border p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <BarChart3 className="text-emerald-600" />
                            Analitika
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Pregled statistika po težini otpada</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none bg-white"
                        >
                            <option value="week">Poslednjih 7 dana</option>
                            <option value="month">Poslednji mesec</option>
                            <option value="year">Poslednja godina</option>
                            <option value="all">Sve vreme</option>
                        </select>
                        <select
                            value={selectedWasteType}
                            onChange={(e) => setSelectedWasteType(e.target.value)}
                            className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none bg-white"
                        >
                            <option value="all">Sve vrste otpada</option>
                            {wasteTypes?.map(wt => (
                                <option key={wt.id} value={wt.id}>{wt.icon} {wt.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-2xl border p-5">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
                        <Scale className="w-6 h-6 text-emerald-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{formatWeight(totalWeight)}</p>
                    <p className="text-sm text-slate-500">Ukupna težina</p>
                </div>
                <div className="bg-white rounded-2xl border p-5">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                        <Truck className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{filteredRequests.length}</p>
                    <p className="text-sm text-slate-500">Obrađenih zahteva</p>
                </div>
                <div className="bg-white rounded-2xl border p-5">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-3">
                        <CheckCircle2 className="w-6 h-6 text-amber-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{requestsWithWeight}</p>
                    <p className="text-sm text-slate-500">Sa unetom težinom</p>
                </div>
                <div className="bg-white rounded-2xl border p-5">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-3">
                        <Recycle className="w-6 h-6 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{weightByType.length}</p>
                    <p className="text-sm text-slate-500">Vrsta otpada</p>
                </div>
                <div className="bg-white rounded-2xl border p-5">
                    <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center mb-3">
                        <Clock className="w-6 h-6 text-cyan-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{formatAverageTime(averageTimeMinutes)}</p>
                    <p className="text-sm text-slate-500">Prosečno vreme</p>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Weight by Waste Type */}
                <div className="bg-white rounded-2xl border p-5">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Recycle className="text-emerald-600" size={20} />
                        Težina po vrsti otpada
                    </h3>
                    {weightByType.length === 0 ? (
                        <p className="text-slate-500 text-sm py-8 text-center">Nema podataka o težini</p>
                    ) : (
                        <div className="space-y-3">
                            {weightByType.slice(0, 8).map((item, idx) => (
                                <div key={idx}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-700 truncate mr-2">{item.type}</span>
                                        <span className="font-medium text-slate-800">{formatWeight(item.weight)}</span>
                                    </div>
                                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                                            style={{ width: `${(item.weight / maxWeightByType) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Weight by Client */}
                <div className="bg-white rounded-2xl border p-5">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Users className="text-blue-600" size={20} />
                        Težina po klijentu
                    </h3>
                    {weightByClient.length === 0 ? (
                        <p className="text-slate-500 text-sm py-8 text-center">Nema podataka o težini</p>
                    ) : (
                        <div className="space-y-3">
                            {weightByClient.slice(0, 8).map((item, idx) => (
                                <div key={idx}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-700 truncate mr-2">{item.client}</span>
                                        <span className="font-medium text-slate-800">{formatWeight(item.weight)}</span>
                                    </div>
                                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                                            style={{ width: `${(item.weight / maxWeightByClient) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Requests by Date */}
                <div className="bg-white rounded-2xl border p-5">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Calendar className="text-amber-600" size={20} />
                        Zahtevi po datumu
                    </h3>
                    {requestsByDate.length === 0 ? (
                        <p className="text-slate-500 text-sm py-8 text-center">Nema podataka</p>
                    ) : (
                        <div className="flex items-end justify-between gap-1 h-40">
                            {requestsByDate.map((item, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center">
                                    <div
                                        className="w-full bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-lg transition-all duration-500 min-h-[4px]"
                                        style={{ height: `${(item.count / maxRequestsByDate) * 100}%` }}
                                        title={`${item.date}: ${item.count} zahteva`}
                                    />
                                    <span className="text-[10px] text-slate-400 mt-1 transform -rotate-45 origin-top-left whitespace-nowrap">
                                        {item.date.slice(0, 5)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Weight by Date */}
                <div className="bg-white rounded-2xl border p-5">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Scale className="text-purple-600" size={20} />
                        Težina po datumu
                    </h3>
                    {weightByDate.length === 0 ? (
                        <p className="text-slate-500 text-sm py-8 text-center">Nema podataka o težini</p>
                    ) : (
                        <div className="flex items-end justify-between gap-1 h-40">
                            {weightByDate.map((item, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center">
                                    <div
                                        className="w-full bg-gradient-to-t from-purple-500 to-purple-400 rounded-t-lg transition-all duration-500 min-h-[4px]"
                                        style={{ height: `${(item.weight / maxWeightByDate) * 100}%` }}
                                        title={`${item.date}: ${formatWeight(item.weight)}`}
                                    />
                                    <span className="text-[10px] text-slate-400 mt-1 transform -rotate-45 origin-top-left whitespace-nowrap">
                                        {item.date.slice(0, 5)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Large Weight vs Date Chart */}
            <div className="bg-white rounded-2xl border p-5">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <BarChart3 className="text-emerald-600" size={20} />
                    Dijagram: Težina (kg) po datumu
                </h3>
                {weightByDate.length === 0 ? (
                    <p className="text-slate-500 text-sm py-8 text-center">Nema podataka o težini za prikaz dijagrama</p>
                ) : (
                    <div className="relative">
                        {/* Y-axis labels */}
                        <div className="flex">
                            <div className="w-16 flex flex-col justify-between h-64 pr-2 text-right">
                                <span className="text-xs text-slate-500">{formatWeight(maxWeightByDate)}</span>
                                <span className="text-xs text-slate-500">{formatWeight(maxWeightByDate * 0.75)}</span>
                                <span className="text-xs text-slate-500">{formatWeight(maxWeightByDate * 0.5)}</span>
                                <span className="text-xs text-slate-500">{formatWeight(maxWeightByDate * 0.25)}</span>
                                <span className="text-xs text-slate-500">0</span>
                            </div>
                            {/* Chart area */}
                            <div className="flex-1 relative h-64 border-l border-b border-slate-200">
                                {/* Grid lines */}
                                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                    {[0, 1, 2, 3].map(i => (
                                        <div key={i} className="border-t border-slate-100 w-full" />
                                    ))}
                                </div>
                                {/* Bars */}
                                <div className="absolute inset-0 flex items-end justify-around px-2 gap-2">
                                    {weightByDate.map((item, idx) => (
                                        <div key={idx} className="flex-1 flex flex-col items-center max-w-16 group">
                                            <div className="relative w-full flex justify-center">
                                                {/* Tooltip */}
                                                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                                    {item.date}: {formatWeight(item.weight)}
                                                </div>
                                                <div
                                                    className="w-full max-w-10 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-md transition-all duration-500 hover:from-emerald-500 hover:to-emerald-300 cursor-pointer"
                                                    style={{ height: `${Math.max((item.weight / maxWeightByDate) * 100, 2)}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {/* X-axis labels */}
                        <div className="flex ml-16">
                            <div className="flex-1 flex justify-around px-2 mt-2">
                                {weightByDate.map((item, idx) => (
                                    <span key={idx} className="text-xs text-slate-500 max-w-16 text-center truncate flex-1">
                                        {item.date.slice(0, 5)}
                                    </span>
                                ))}
                            </div>
                        </div>
                        {/* Axis labels */}
                        <div className="flex justify-between mt-4 text-sm text-slate-600">
                            <span className="font-medium">Y: Težina (kg/t)</span>
                            <span className="font-medium">X: Datum obrade</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Top clients table */}
            {weightByClient.length > 0 && (
                <div className="bg-white rounded-2xl border overflow-hidden">
                    <div className="p-5 border-b">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Users className="text-emerald-600" size={20} />
                            Top klijenti po količini otpada
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left py-3 px-5 text-sm font-medium text-slate-600">#</th>
                                    <th className="text-left py-3 px-5 text-sm font-medium text-slate-600">Klijent</th>
                                    <th className="text-right py-3 px-5 text-sm font-medium text-slate-600">Ukupna težina</th>
                                    <th className="text-right py-3 px-5 text-sm font-medium text-slate-600">Broj zahteva</th>
                                </tr>
                            </thead>
                            <tbody>
                                {weightByClient.slice(0, 10).map((item, idx) => {
                                    const clientRequestCount = filteredRequests.filter(r => r.client_name === item.client).length;
                                    return (
                                        <tr key={idx} className="border-t hover:bg-slate-50">
                                            <td className="py-3 px-5">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-amber-100 text-amber-700' :
                                                        idx === 1 ? 'bg-slate-200 text-slate-700' :
                                                            idx === 2 ? 'bg-orange-100 text-orange-700' :
                                                                'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {idx + 1}
                                                </span>
                                            </td>
                                            <td className="py-3 px-5 font-medium text-slate-800">{item.client}</td>
                                            <td className="py-3 px-5 text-right font-bold text-emerald-600">{formatWeight(item.weight)}</td>
                                            <td className="py-3 px-5 text-right text-slate-600">{clientRequestCount}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsPage;
