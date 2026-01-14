import { useState, useMemo } from 'react';
import { BarChart3, Scale, Truck, CheckCircle2, Recycle, Clock, Calendar, Users, Filter, ChevronDown, X, Printer, FileSpreadsheet } from 'lucide-react';

// Paleta boja za vrste otpada - automatski se dodeljuju po redosledu
const WASTE_TYPE_COLORS = [
    { bg: 'bg-blue-100', bar: 'from-blue-500 to-blue-400', text: 'text-blue-700', hex: '#3B82F6' },
    { bg: 'bg-emerald-100', bar: 'from-emerald-500 to-emerald-400', text: 'text-emerald-700', hex: '#10B981' },
    { bg: 'bg-amber-100', bar: 'from-amber-500 to-amber-400', text: 'text-amber-700', hex: '#F59E0B' },
    { bg: 'bg-purple-100', bar: 'from-purple-500 to-purple-400', text: 'text-purple-700', hex: '#8B5CF6' },
    { bg: 'bg-rose-100', bar: 'from-rose-500 to-rose-400', text: 'text-rose-700', hex: '#F43F5E' },
    { bg: 'bg-cyan-100', bar: 'from-cyan-500 to-cyan-400', text: 'text-cyan-700', hex: '#06B6D4' },
    { bg: 'bg-orange-100', bar: 'from-orange-500 to-orange-400', text: 'text-orange-700', hex: '#F97316' },
    { bg: 'bg-indigo-100', bar: 'from-indigo-500 to-indigo-400', text: 'text-indigo-700', hex: '#6366F1' },
    { bg: 'bg-pink-100', bar: 'from-pink-500 to-pink-400', text: 'text-pink-700', hex: '#EC4899' },
    { bg: 'bg-teal-100', bar: 'from-teal-500 to-teal-400', text: 'text-teal-700', hex: '#14B8A6' },
    { bg: 'bg-lime-100', bar: 'from-lime-500 to-lime-400', text: 'text-lime-700', hex: '#84CC16' },
    { bg: 'bg-red-100', bar: 'from-red-500 to-red-400', text: 'text-red-700', hex: '#EF4444' },
];

/**
 * Analytics Page with Charts - Displays waste collection statistics
 */
export const AnalyticsPage = ({ processedRequests, clients, wasteTypes }) => {
    const [dateRange, setDateRange] = useState('month');
    const [selectedWasteType, setSelectedWasteType] = useState('all');
    const [selectedClient, setSelectedClient] = useState('all');
    const [showClientBreakdown, setShowClientBreakdown] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportMode, setReportMode] = useState('print'); // 'print' or 'excel'
    const [reportDateFrom, setReportDateFrom] = useState('');
    const [reportDateTo, setReportDateTo] = useState('');
    const [reportClient, setReportClient] = useState('all');
    const [reportWasteType, setReportWasteType] = useState('all');

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
        if (selectedClient !== 'all') {
            filtered = filtered.filter(r => r.client_id === selectedClient || r.client_name === selectedClient);
        }
        return filtered;
    };

    // Get unique clients from processed requests
    const uniqueClients = useMemo(() => {
        if (!processedRequests) return [];
        const clientMap = new Map();
        processedRequests.forEach(r => {
            if (r.client_id && r.client_name) {
                clientMap.set(r.client_id, r.client_name);
            }
        });
        return Array.from(clientMap, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'sr'));
    }, [processedRequests]);

    // Detailed breakdown: waste type per client
    const getWasteByClientBreakdown = () => {
        const breakdown = {};
        filteredRequests.forEach(r => {
            if (!r.weight) return;
            const clientName = r.client_name || 'Nepoznat';
            const wasteLabel = r.waste_label || r.waste_type || 'Nepoznato';
            const weightInKg = r.weight_unit === 't' ? r.weight * 1000 : r.weight;

            if (!breakdown[clientName]) {
                breakdown[clientName] = { total: 0, byType: {} };
            }
            breakdown[clientName].total += weightInKg;
            breakdown[clientName].byType[wasteLabel] = (breakdown[clientName].byType[wasteLabel] || 0) + weightInKg;
        });

        return Object.entries(breakdown)
            .map(([client, data]) => ({
                client,
                total: data.total,
                byType: Object.entries(data.byType)
                    .map(([type, weight]) => ({ type, weight }))
                    .sort((a, b) => b.weight - a.weight)
            }))
            .sort((a, b) => b.total - a.total);
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

    // Mapa za konzistentne boje po vrsti otpada
    const wasteTypeColorMap = useMemo(() => {
        const map = {};
        const allTypes = new Set();
        processedRequests?.forEach(r => {
            const label = r.waste_label || r.waste_type;
            if (label) allTypes.add(label);
        });
        Array.from(allTypes).sort().forEach((type, idx) => {
            map[type] = WASTE_TYPE_COLORS[idx % WASTE_TYPE_COLORS.length];
        });
        return map;
    }, [processedRequests]);

    const getColorForType = (type) => wasteTypeColorMap[type] || WASTE_TYPE_COLORS[0];

    // Funkcija za filtriranje podataka za izveštaj
    const getReportData = () => {
        let data = processedRequests || [];

        if (reportDateFrom) {
            const from = new Date(reportDateFrom);
            data = data.filter(r => new Date(r.processed_at) >= from);
        }
        if (reportDateTo) {
            const to = new Date(reportDateTo);
            to.setHours(23, 59, 59, 999);
            data = data.filter(r => new Date(r.processed_at) <= to);
        }
        if (reportClient !== 'all') {
            data = data.filter(r => r.client_id === reportClient || r.client_name === reportClient);
        }
        if (reportWasteType !== 'all') {
            data = data.filter(r => r.waste_type === reportWasteType);
        }
        return data;
    };

    const handleOpenReport = (mode) => {
        setReportMode(mode);
        // Postavi default datume na trenutni filter
        const now = new Date();
        let startDate = new Date();
        switch (dateRange) {
            case 'week': startDate.setDate(now.getDate() - 7); break;
            case 'month': startDate.setMonth(now.getMonth() - 1); break;
            case 'year': startDate.setFullYear(now.getFullYear() - 1); break;
            default: startDate = null;
        }
        setReportDateFrom(startDate ? startDate.toISOString().split('T')[0] : '');
        setReportDateTo(now.toISOString().split('T')[0]);
        setReportClient(selectedClient);
        setReportWasteType(selectedWasteType);
        setShowReportModal(true);
    };

    const handlePrint = () => {
        const data = getReportData();
        const printWindow = window.open('', '_blank');

        // Grupisanje po klijentu i vrsti
        const grouped = {};
        data.forEach(r => {
            if (!r.weight) return;
            const client = r.client_name || 'Nepoznat';
            const type = r.waste_label || r.waste_type || 'Nepoznato';
            const key = `${client}|||${type}`;
            const weightKg = r.weight_unit === 't' ? r.weight * 1000 : r.weight;
            if (!grouped[key]) grouped[key] = { client, type, weight: 0, count: 0 };
            grouped[key].weight += weightKg;
            grouped[key].count++;
        });

        const rows = Object.values(grouped).sort((a, b) => b.weight - a.weight);
        const totalWeight = rows.reduce((sum, r) => sum + r.weight, 0);

        // Naslov izveštaja
        let title = 'Izveštaj analitike';
        const parts = [];
        if (reportClient !== 'all') {
            const clientName = uniqueClients.find(c => c.id === reportClient)?.name || reportClient;
            parts.push(clientName);
        }
        if (reportWasteType !== 'all') {
            const typeName = wasteTypes?.find(w => w.id === reportWasteType)?.name || reportWasteType;
            parts.push(typeName);
        }
        if (reportDateFrom || reportDateTo) {
            const fromStr = reportDateFrom ? new Date(reportDateFrom).toLocaleDateString('sr-RS') : '';
            const toStr = reportDateTo ? new Date(reportDateTo).toLocaleDateString('sr-RS') : '';
            parts.push(`${fromStr} - ${toStr}`);
        }
        if (parts.length > 0) title = parts.join(' | ');

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>EcoMountainTracking - Izveštaj</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 30px; color: #1e293b; }
                    .header { display: flex; align-items: center; gap: 15px; margin-bottom: 10px; }
                    .logo { width: 50px; height: 50px; background: #059669; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
                    .logo svg { width: 30px; height: 30px; fill: white; }
                    h1 { color: #059669; margin: 0; font-size: 24px; }
                    .subtitle { color: #64748b; margin-bottom: 25px; font-size: 14px; }
                    .summary { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 15px 20px; margin-bottom: 25px; display: flex; gap: 30px; }
                    .summary-item { text-align: center; }
                    .summary-value { font-size: 24px; font-weight: bold; color: #059669; }
                    .summary-label { font-size: 12px; color: #64748b; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #e2e8f0; padding: 12px 15px; text-align: left; }
                    th { background: #f1f5f9; font-weight: 600; color: #475569; }
                    tr:nth-child(even) { background: #f8fafc; }
                    tr:hover { background: #f1f5f9; }
                    .weight { font-weight: 600; color: #059669; text-align: right; }
                    .count { text-align: center; color: #64748b; }
                    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; display: flex; justify-content: space-between; }
                    @media print {
                        body { margin: 15px; }
                        .summary { break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">
                        <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                    </div>
                    <h1>EcoMountainTracking</h1>
                </div>
                <p class="subtitle">${title}</p>

                <div class="summary">
                    <div class="summary-item">
                        <div class="summary-value">${formatWeight(totalWeight)}</div>
                        <div class="summary-label">Ukupna težina</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${rows.length}</div>
                        <div class="summary-label">Kombinacija klijent/tip</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${data.length}</div>
                        <div class="summary-label">Ukupno zahteva</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Klijent</th>
                            <th>Vrsta otpada</th>
                            <th style="text-align: right">Težina</th>
                            <th style="text-align: center">Zahteva</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(r => `
                            <tr>
                                <td>${r.client}</td>
                                <td>${r.type}</td>
                                <td class="weight">${formatWeight(r.weight)}</td>
                                <td class="count">${r.count}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="footer">
                    <span>Generisano: ${new Date().toLocaleString('sr-RS')}</span>
                    <span>EcoMountainTracking</span>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 250);
        setShowReportModal(false);
    };

    const handleExportExcel = () => {
        const data = getReportData();

        // Grupisanje po klijentu i vrsti
        const grouped = {};
        data.forEach(r => {
            if (!r.weight) return;
            const client = r.client_name || 'Nepoznat';
            const type = r.waste_label || r.waste_type || 'Nepoznato';
            const key = `${client}|||${type}`;
            const weightKg = r.weight_unit === 't' ? r.weight * 1000 : r.weight;
            if (!grouped[key]) grouped[key] = { client, type, weight: 0, count: 0 };
            grouped[key].weight += weightKg;
            grouped[key].count++;
        });

        const rows = Object.values(grouped).sort((a, b) => b.weight - a.weight);

        // CSV sa BOM za UTF-8
        let csv = '\uFEFF';
        csv += 'Klijent;Vrsta otpada;Težina (kg);Težina (t);Broj zahteva\n';

        rows.forEach(r => {
            csv += `"${r.client}";"${r.type}";${r.weight.toFixed(1)};${(r.weight / 1000).toFixed(3)};${r.count}\n`;
        });

        // Dodaj summary red
        const total = rows.reduce((sum, r) => sum + r.weight, 0);
        csv += `\n"UKUPNO";"";"${total.toFixed(1)}";"${(total / 1000).toFixed(3)}";"${data.length}"\n`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Ime fajla sa filterima
        const parts = ['izvestaj'];
        if (reportClient !== 'all') {
            const clientName = uniqueClients.find(c => c.id === reportClient)?.name || 'klijent';
            parts.push(clientName.replace(/\s/g, '_'));
        }
        if (reportWasteType !== 'all') {
            const typeName = wasteTypes?.find(w => w.id === reportWasteType)?.name || 'tip';
            parts.push(typeName.replace(/\s/g, '_'));
        }
        parts.push(new Date().toISOString().split('T')[0]);

        link.download = `${parts.join('_')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        setShowReportModal(false);
    };

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
                    <div className="flex flex-wrap gap-3 items-center">
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
                        <select
                            value={selectedClient}
                            onChange={(e) => setSelectedClient(e.target.value)}
                            className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none bg-white"
                        >
                            <option value="all">Svi klijenti</option>
                            {uniqueClients.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <div className="flex gap-2 ml-2">
                            <button
                                onClick={() => handleOpenReport('print')}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
                            >
                                <Printer size={16} />
                                <span className="hidden sm:inline">Štampaj</span>
                            </button>
                            <button
                                onClick={() => handleOpenReport('excel')}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors"
                            >
                                <FileSpreadsheet size={16} />
                                <span className="hidden sm:inline">Excel</span>
                            </button>
                        </div>
                    </div>
                </div>
                {/* Active filters display */}
                {(selectedWasteType !== 'all' || selectedClient !== 'all') && (
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                        <span className="text-sm text-slate-500">Aktivni filteri:</span>
                        {selectedWasteType !== 'all' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                                {wasteTypes?.find(w => w.id === selectedWasteType)?.name || selectedWasteType}
                                <button onClick={() => setSelectedWasteType('all')} className="hover:text-emerald-900">
                                    <X size={14} />
                                </button>
                            </span>
                        )}
                        {selectedClient !== 'all' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                {uniqueClients.find(c => c.id === selectedClient)?.name || selectedClient}
                                <button onClick={() => setSelectedClient('all')} className="hover:text-blue-900">
                                    <X size={14} />
                                </button>
                            </span>
                        )}
                    </div>
                )}
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
                            {weightByType.slice(0, 8).map((item, idx) => {
                                const color = getColorForType(item.type);
                                return (
                                    <div key={idx}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="flex items-center gap-2">
                                                <span className={`w-3 h-3 rounded-full ${color.bg} border-2`} style={{ borderColor: color.hex }} />
                                                <span className="text-slate-700 truncate">{item.type}</span>
                                            </span>
                                            <span className={`font-semibold ${color.text}`}>{formatWeight(item.weight)}</span>
                                        </div>
                                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                            <div
                                                className={`h-full bg-gradient-to-r ${color.bar} rounded-full transition-all duration-500`}
                                                style={{ width: `${(item.weight / maxWeightByType) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
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

            {/* Detailed breakdown: Waste by Client with types */}
            <div className="bg-white rounded-2xl border overflow-hidden">
                <div className="p-5 border-b flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Filter className="text-purple-600" size={20} />
                        Detaljan pregled: Vrste otpada po klijentu
                    </h3>
                    <button
                        onClick={() => setShowClientBreakdown(!showClientBreakdown)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700"
                    >
                        {showClientBreakdown ? 'Sakrij' : 'Prikaži'} detalje
                        <ChevronDown size={16} className={`transition-transform ${showClientBreakdown ? 'rotate-180' : ''}`} />
                    </button>
                </div>
                {showClientBreakdown && (
                    <div className="p-5 space-y-4">
                        {getWasteByClientBreakdown().length === 0 ? (
                            <p className="text-slate-500 text-center py-8">Nema podataka o težini</p>
                        ) : (
                            getWasteByClientBreakdown().map((clientData, idx) => (
                                <div key={idx} className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-emerald-200">
                                                {clientData.client.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-lg">{clientData.client}</h4>
                                                <p className="text-sm text-slate-500">{clientData.byType.length} vrsta otpada</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-3xl font-bold text-emerald-600">{formatWeight(clientData.total)}</span>
                                            <p className="text-xs text-slate-400">ukupno</p>
                                        </div>
                                    </div>
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {clientData.byType.map((typeData, typeIdx) => {
                                            const color = getColorForType(typeData.type);
                                            return (
                                                <div key={typeIdx} className={`flex items-center justify-between ${color.bg} rounded-lg px-3 py-2.5 border`} style={{ borderColor: `${color.hex}30` }}>
                                                    <span className={`text-sm ${color.text} truncate mr-2 font-medium`}>{typeData.type}</span>
                                                    <span className={`text-sm font-bold ${color.text} whitespace-nowrap`}>{formatWeight(typeData.weight)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Report Filter Modal */}
            {showReportModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b bg-gradient-to-r from-emerald-500 to-emerald-600">
                            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                {reportMode === 'print' ? <Printer size={24} /> : <FileSpreadsheet size={24} />}
                                {reportMode === 'print' ? 'Štampaj izveštaj' : 'Izvezi u Excel'}
                            </h3>
                            <p className="text-emerald-100 text-sm mt-1">Izaberite filtere za izveštaj</p>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Period */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Period</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">Od</label>
                                        <input
                                            type="date"
                                            value={reportDateFrom}
                                            onChange={(e) => setReportDateFrom(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-emerald-500 outline-none text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">Do</label>
                                        <input
                                            type="date"
                                            value={reportDateTo}
                                            onChange={(e) => setReportDateTo(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-emerald-500 outline-none text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Klijent */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Klijent</label>
                                <select
                                    value={reportClient}
                                    onChange={(e) => setReportClient(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:border-emerald-500 outline-none text-sm bg-white"
                                >
                                    <option value="all">Svi klijenti</option>
                                    {uniqueClients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Vrsta otpada */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Vrsta otpada</label>
                                <select
                                    value={reportWasteType}
                                    onChange={(e) => setReportWasteType(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:border-emerald-500 outline-none text-sm bg-white"
                                >
                                    <option value="all">Sve vrste</option>
                                    {wasteTypes?.map(wt => (
                                        <option key={wt.id} value={wt.id}>{wt.icon} {wt.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Preview */}
                            <div className="bg-slate-50 rounded-xl p-4 border">
                                <p className="text-xs text-slate-500 mb-2">Pregled podataka:</p>
                                <div className="flex items-center gap-4">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-emerald-600">{getReportData().length}</p>
                                        <p className="text-xs text-slate-500">zahteva</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-blue-600">
                                            {formatWeight(getReportData().reduce((sum, r) => {
                                                if (!r.weight) return sum;
                                                return sum + (r.weight_unit === 't' ? r.weight * 1000 : r.weight);
                                            }, 0))}
                                        </p>
                                        <p className="text-xs text-slate-500">ukupno</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t bg-slate-50 flex gap-3">
                            <button
                                onClick={() => setShowReportModal(false)}
                                className="flex-1 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-medium transition-colors"
                            >
                                Otkaži
                            </button>
                            <button
                                onClick={reportMode === 'print' ? handlePrint : handleExportExcel}
                                disabled={getReportData().length === 0}
                                className={`flex-1 px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${
                                    reportMode === 'print'
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                        : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}
                            >
                                {reportMode === 'print' ? <Printer size={18} /> : <FileSpreadsheet size={18} />}
                                {reportMode === 'print' ? 'Štampaj' : 'Izvezi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsPage;
