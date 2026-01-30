import { useState, useMemo } from 'react';
import { BarChart3, Scale, Truck, CheckCircle2, Recycle, Clock, Calendar, Users, Filter, ChevronDown, X, Printer, FileSpreadsheet } from 'lucide-react';
import { RecycleLoader } from '../common';

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
// Helper: get available months from processed requests
const getAvailableMonths = (requests) => {
    if (!requests || requests.length === 0) return [];
    const months = new Set();
    requests.forEach(r => {
        if (r.processed_at) {
            const d = new Date(r.processed_at);
            months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
    });
    return Array.from(months).sort().reverse(); // Most recent first
};

// Month names in Serbian
const MONTH_NAMES = ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'];

export const AnalyticsPage = ({ processedRequests, clients, wasteTypes, drivers = [], pickupRequests = [], regions = [], userRole = null, supervisorRegionIds = [] }) => {
    const [dateRange, setDateRange] = useState('month');
    const [selectedMonth, setSelectedMonth] = useState(''); // Format: "2026-01" for specific month
    const [selectedWasteType, setSelectedWasteType] = useState('all');
    const [selectedClient, setSelectedClient] = useState('all');
    const [selectedRegion, setSelectedRegion] = useState('all');

    // Check if user is supervisor
    const isSupervisor = userRole === 'supervisor';

    // For supervisor: filter regions to only show their assigned regions
    const visibleRegions = useMemo(() => {
        if (!isSupervisor || !supervisorRegionIds.length) {
            return regions;
        }
        return regions.filter(r => supervisorRegionIds.includes(r.id));
    }, [regions, isSupervisor, supervisorRegionIds]);

    // For supervisor: filter processed requests to only their regions
    const visibleProcessedRequests = useMemo(() => {
        if (!isSupervisor || !supervisorRegionIds.length) {
            return processedRequests;
        }
        return (processedRequests || []).filter(r =>
            r.region_id && supervisorRegionIds.includes(r.region_id)
        );
    }, [processedRequests, isSupervisor, supervisorRegionIds]);

    // For supervisor: filter pickup requests to only their regions
    const visiblePickupRequests = useMemo(() => {
        if (!isSupervisor || !supervisorRegionIds.length) {
            return pickupRequests;
        }
        return (pickupRequests || []).filter(r =>
            r.region_id && supervisorRegionIds.includes(r.region_id)
        );
    }, [pickupRequests, isSupervisor, supervisorRegionIds]);

    // Available months for dropdown (use filtered requests for supervisor)
    const availableMonths = useMemo(() => getAvailableMonths(visibleProcessedRequests), [visibleProcessedRequests]);
    const [showClientBreakdown, setShowClientBreakdown] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportMode, setReportMode] = useState('print'); // 'print' or 'excel'
    const [reportDateFrom, setReportDateFrom] = useState('');
    const [reportDateTo, setReportDateTo] = useState('');
    const [reportClient, setReportClient] = useState('all');
    const [reportWasteType, setReportWasteType] = useState('all');
    const [isExporting, setIsExporting] = useState(false);

    // Excel sheet selection (all enabled by default)
    const [excelSheets, setExcelSheets] = useState({
        sumarno: true,
        poVrsti: true,
        poKlijentu: true,
        dnevniTrend: true,
        kreiraниVsObradeni: true,
        detaljno: true,
        sviZahtevi: true,
        grafici: true,
        vozaci: true,
    });

    const toggleExcelSheet = (key) => {
        setExcelSheets(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const EXCEL_SHEET_OPTIONS = [
        { key: 'sumarno', label: 'Sumarno', icon: '📊' },
        { key: 'poVrsti', label: 'Po vrsti otpada', icon: '♻️' },
        { key: 'poKlijentu', label: 'Po klijentu', icon: '👥' },
        { key: 'dnevniTrend', label: 'Dnevni trend', icon: '📈' },
        { key: 'kreiraниVsObradeni', label: 'Kreirani vs Obrađeni', icon: '⚖️' },
        { key: 'detaljno', label: 'Detaljan pregled', icon: '📋' },
        { key: 'sviZahtevi', label: 'Svi zahtevi', icon: '📝' },
        { key: 'grafici', label: 'Grafici (slike)', icon: '🎨' },
        { key: 'vozaci', label: 'Vozači', icon: '🚚' },
    ];

    const getFilteredRequests = () => {
        if (!visibleProcessedRequests) return [];
        let filtered = visibleProcessedRequests;

        // Ako je odabran specifičan mesec, filtriraj po njemu
        if (selectedMonth) {
            const [year, month] = selectedMonth.split('-').map(Number);
            filtered = filtered.filter(r => {
                if (!r.processed_at) return false;
                const d = new Date(r.processed_at);
                return d.getFullYear() === year && d.getMonth() + 1 === month;
            });
        } else {
            // Inače koristi relativni period (week/month/year/all)
            const now = new Date();
            let startDate = null;

            switch (dateRange) {
                case 'week':
                    startDate = new Date(new Date().setDate(now.getDate() - 7));
                    break;
                case 'month':
                    startDate = new Date(new Date().setMonth(now.getMonth() - 1));
                    break;
                case 'year':
                    startDate = new Date(new Date().setFullYear(now.getFullYear() - 1));
                    break;
                default:
                    startDate = null;
            }

            if (startDate) {
                filtered = filtered.filter(r => new Date(r.processed_at) >= startDate);
            }
        }

        if (selectedWasteType !== 'all') {
            filtered = filtered.filter(r => r.waste_type === selectedWasteType);
        }
        if (selectedClient !== 'all') {
            filtered = filtered.filter(r => r.client_id === selectedClient || r.client_name === selectedClient);
        }
        if (selectedRegion !== 'all') {
            filtered = filtered.filter(r => r.region_id === selectedRegion);
        }
        return filtered;
    };

    // Get unique clients from processed requests (filtered for supervisor)
    const uniqueClients = useMemo(() => {
        if (!visibleProcessedRequests) return [];
        const clientMap = new Map();
        visibleProcessedRequests.forEach(r => {
            if (r.client_id && r.client_name) {
                clientMap.set(r.client_id, r.client_name);
            }
        });
        return Array.from(clientMap, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'sr'));
    }, [visibleProcessedRequests]);

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

    // Uporedni dijagram: Kreirani vs Obrađeni zahtevi po danu
    const getCreatedVsProcessedByDate = () => {
        const now = new Date();
        let startDate = null;

        switch (dateRange) {
            case 'week':
                startDate = new Date(new Date().setDate(now.getDate() - 7));
                break;
            case 'month':
                startDate = new Date(new Date().setMonth(now.getMonth() - 1));
                break;
            case 'year':
                startDate = new Date(new Date().setFullYear(now.getFullYear() - 1));
                break;
            default:
                startDate = null;
        }

        const byDate = {};
        const countedRequestIds = new Set();

        // Kreirani zahtevi iz aktivnih pickup_requests (filtered for supervisor)
        visiblePickupRequests.forEach(r => {
            if (!r.created_at) return;
            const dateObj = new Date(r.created_at);
            if (startDate && dateObj < startDate) return;
            const dateKey = dateObj.toISOString().split('T')[0];
            const dateLabel = dateObj.toLocaleDateString('sr-RS', { day: 'numeric', month: 'numeric' });
            if (!byDate[dateKey]) byDate[dateKey] = { dateKey, date: dateLabel, created: 0, processed: 0 };
            byDate[dateKey].created++;
            if (r.id) countedRequestIds.add(r.id);
        });

        // Kreirani zahtevi iz processed_requests (koji su već obrađeni) - filtered for supervisor
        (visibleProcessedRequests || []).forEach(r => {
            if (!r.created_at) return;
            // Izbegni duplikate ako imamo original_request_id
            if (r.original_request_id && countedRequestIds.has(r.original_request_id)) return;
            const dateObj = new Date(r.created_at);
            if (startDate && dateObj < startDate) return;
            const dateKey = dateObj.toISOString().split('T')[0];
            const dateLabel = dateObj.toLocaleDateString('sr-RS', { day: 'numeric', month: 'numeric' });
            if (!byDate[dateKey]) byDate[dateKey] = { dateKey, date: dateLabel, created: 0, processed: 0 };
            byDate[dateKey].created++;
        });

        // Obrađeni zahtevi (processed_requests) - filtered for supervisor
        (visibleProcessedRequests || []).forEach(r => {
            if (!r.processed_at) return;
            const dateObj = new Date(r.processed_at);
            if (startDate && dateObj < startDate) return;
            const dateKey = dateObj.toISOString().split('T')[0];
            const dateLabel = dateObj.toLocaleDateString('sr-RS', { day: 'numeric', month: 'numeric' });
            if (!byDate[dateKey]) byDate[dateKey] = { dateKey, date: dateLabel, created: 0, processed: 0 };
            byDate[dateKey].processed++;
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
    const createdVsProcessed = getCreatedVsProcessedByDate();
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

    const formatWeight = (kg, forceUnit = null) => {
        // Ako je forsirano kg ili t, koristi to
        if (forceUnit === 'kg') {
            return `${kg.toFixed(1)} kg`;
        }
        if (forceUnit === 't') {
            return `${(kg / 1000).toFixed(3)} t`;
        }
        // Automatski izbor: tone za >= 1000kg, inače kg
        if (kg >= 1000) {
            return `${(kg / 1000).toFixed(2)} t`;
        }
        if (kg >= 100) {
            return `${kg.toFixed(0)} kg`; // Bez decimala za veće vrednosti
        }
        if (kg >= 10) {
            return `${kg.toFixed(1)} kg`; // Jedna decimala
        }
        return `${kg.toFixed(2)} kg`; // Dve decimale za male vrednosti
    };

    const maxWeightByType = Math.max(...weightByType.map(w => w.weight), 1);
    const maxWeightByClient = Math.max(...weightByClient.map(w => w.weight), 1);
    const maxRequestsByDate = Math.max(...requestsByDate.map(r => r.count), 1);
    const maxWeightByDate = Math.max(...weightByDate.map(w => w.weight), 1);

    // Mapa za konzistentne boje po vrsti otpada (filtered for supervisor)
    const wasteTypeColorMap = useMemo(() => {
        const map = {};
        const allTypes = new Set();
        visibleProcessedRequests?.forEach(r => {
            const label = r.waste_label || r.waste_type;
            if (label) allTypes.add(label);
        });
        Array.from(allTypes).sort().forEach((type, idx) => {
            map[type] = WASTE_TYPE_COLORS[idx % WASTE_TYPE_COLORS.length];
        });
        return map;
    }, [visibleProcessedRequests]);

    const getColorForType = (type) => wasteTypeColorMap[type] || WASTE_TYPE_COLORS[0];

    // Funkcija za filtriranje podataka za izveštaj (uses filtered data for supervisor)
    const getReportData = () => {
        let data = visibleProcessedRequests || [];

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

    const handleExportExcel = async () => {
        setIsExporting(true);
        try {
            const data = getReportData();

            // Build filename with filters
            const fileNameParts = ['izvestaj'];
            if (reportClient !== 'all') {
                const clientName = uniqueClients.find(c => c.id === reportClient)?.name || 'klijent';
                fileNameParts.push(clientName.replace(/\s/g, '_'));
            }
            if (reportWasteType !== 'all') {
                const typeName = wasteTypes?.find(w => w.id === reportWasteType)?.name || 'tip';
                fileNameParts.push(typeName.replace(/\s/g, '_'));
            }

            // Dynamic import to reduce initial bundle size
            const { exportToExcel } = await import('../../utils/excelExport');

            await exportToExcel({
                data,
                filters: {
                    dateFrom: reportDateFrom,
                    dateTo: reportDateTo,
                    client: reportClient,
                    wasteType: reportWasteType
                },
                wasteTypes,
                clients: uniqueClients,
                drivers,
                pickupRequests,
                fileName: fileNameParts.join('_'),
                sheets: excelSheets
            });

            setShowReportModal(false);
        } catch (error) {
            console.error('Excel export error:', error);
            alert('Greška pri exportu Excel fajla');
        } finally {
            setIsExporting(false);
        }
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
                        {/* Period dropdown */}
                        <select
                            value={selectedMonth ? '' : dateRange}
                            onChange={(e) => {
                                setDateRange(e.target.value);
                                setSelectedMonth(''); // Očisti mesec kada se bira period
                            }}
                            className={`px-4 py-2 border rounded-xl text-sm focus:border-emerald-500 outline-none bg-white ${selectedMonth ? 'border-slate-200 text-slate-400' : 'border-slate-200'}`}
                        >
                            <option value="week">Poslednjih 7 dana</option>
                            <option value="month">Poslednjih 30 dana</option>
                            <option value="year">Poslednja godina</option>
                            <option value="all">Sve vreme</option>
                        </select>
                        {/* Month selector dropdown */}
                        {availableMonths.length > 0 && (
                            <select
                                value={selectedMonth}
                                onChange={(e) => {
                                    setSelectedMonth(e.target.value);
                                    // dateRange ostaje ali se ne primenjuje dok je selectedMonth aktivan
                                }}
                                className={`px-4 py-2 border rounded-xl text-sm focus:border-emerald-500 outline-none bg-white ${selectedMonth ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}
                            >
                                <option value="">-- Izaberi mesec --</option>
                                {availableMonths.map(m => {
                                    const [year, month] = m.split('-');
                                    const monthName = MONTH_NAMES[parseInt(month) - 1];
                                    return (
                                        <option key={m} value={m}>{monthName} {year}</option>
                                    );
                                })}
                            </select>
                        )}
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
                        {visibleRegions.length > 0 && (
                            <select
                                value={selectedRegion}
                                onChange={(e) => setSelectedRegion(e.target.value)}
                                className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-emerald-500 outline-none bg-white"
                            >
                                <option value="all">{isSupervisor ? 'Moje filijale' : 'Sve filijale'}</option>
                                {visibleRegions.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        )}
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
                {(selectedWasteType !== 'all' || selectedClient !== 'all' || selectedMonth || selectedRegion !== 'all') && (
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                        <span className="text-sm text-slate-500">Aktivni filteri:</span>
                        {selectedMonth && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                                <Calendar size={14} />
                                {MONTH_NAMES[parseInt(selectedMonth.split('-')[1]) - 1]} {selectedMonth.split('-')[0]}
                                <button onClick={() => setSelectedMonth('')} className="hover:text-purple-900">
                                    <X size={14} />
                                </button>
                            </span>
                        )}
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
                        {selectedRegion !== 'all' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                                {visibleRegions.find(r => r.id === selectedRegion)?.name || selectedRegion}
                                <button onClick={() => setSelectedRegion('all')} className="hover:text-orange-900">
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

            {/* Created vs Processed Comparison Chart */}
            {createdVsProcessed.length > 0 && (
                <div className="bg-white rounded-2xl border p-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div>
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <BarChart3 className="text-indigo-600" size={20} />
                                Kreirani vs Obrađeni zahtevi
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">Uporedni pregled broja zahteva po danu</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded bg-indigo-500" />
                                <span className="text-slate-600">Kreirani</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded bg-emerald-500" />
                                <span className="text-slate-600">Obrađeni</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex">
                        {/* Y-axis */}
                        <div className="flex flex-col justify-between pr-2 text-right w-10" style={{ height: '180px' }}>
                            {(() => {
                                const maxVal = Math.max(...createdVsProcessed.map(d => Math.max(d.created, d.processed)), 1);
                                return (
                                    <>
                                        <span className="text-[10px] text-slate-500">{maxVal}</span>
                                        <span className="text-[10px] text-slate-500">{Math.round(maxVal / 2)}</span>
                                        <span className="text-[10px] text-slate-500">0</span>
                                    </>
                                );
                            })()}
                        </div>
                        {/* Chart */}
                        <div className="flex-1 flex items-end justify-between gap-2 border-l border-slate-200 pl-2" style={{ height: '180px' }}>
                            {createdVsProcessed.map((item, idx) => {
                                const maxVal = Math.max(...createdVsProcessed.map(d => Math.max(d.created, d.processed)), 1);
                                const createdHeight = Math.max((item.created / maxVal) * 160, item.created > 0 ? 4 : 0);
                                const processedHeight = Math.max((item.processed / maxVal) * 160, item.processed > 0 ? 4 : 0);
                                return (
                                    <div key={idx} className="flex-1 flex items-end justify-center gap-0.5 group" style={{ height: '180px' }}>
                                        {/* Kreirani */}
                                        <div
                                            className="w-[45%] bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t transition-all duration-300 cursor-pointer hover:from-indigo-500 hover:to-indigo-300 relative"
                                            style={{ height: `${createdHeight}px` }}
                                            title={`Kreirani: ${item.created}`}
                                        >
                                            {item.created > 0 && (
                                                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-indigo-800 text-white text-[9px] px-1 py-0.5 rounded whitespace-nowrap z-10">
                                                    {item.created}
                                                </div>
                                            )}
                                        </div>
                                        {/* Obrađeni */}
                                        <div
                                            className="w-[45%] bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t transition-all duration-300 cursor-pointer hover:from-emerald-500 hover:to-emerald-300 relative"
                                            style={{ height: `${processedHeight}px` }}
                                            title={`Obrađeni: ${item.processed}`}
                                        >
                                            {item.processed > 0 && (
                                                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-emerald-800 text-white text-[9px] px-1 py-0.5 rounded whitespace-nowrap z-10">
                                                    {item.processed}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {/* X-axis labels */}
                    <div className="flex ml-10 mt-2">
                        {createdVsProcessed.map((item, idx) => (
                            <span key={idx} className="flex-1 text-[10px] text-slate-400 text-center truncate">
                                {item.date}
                            </span>
                        ))}
                    </div>
                    {/* Summary stats */}
                    <div className="flex justify-center gap-8 mt-4 pt-4 border-t border-slate-100">
                        <div className="text-center">
                            <span className="text-lg font-bold text-indigo-600">{createdVsProcessed.reduce((sum, d) => sum + d.created, 0)}</span>
                            <p className="text-[10px] text-slate-500">ukupno kreirano</p>
                        </div>
                        <div className="text-center">
                            <span className="text-lg font-bold text-emerald-600">{createdVsProcessed.reduce((sum, d) => sum + d.processed, 0)}</span>
                            <p className="text-[10px] text-slate-500">ukupno obrađeno</p>
                        </div>
                        <div className="text-center">
                            {(() => {
                                const created = createdVsProcessed.reduce((sum, d) => sum + d.created, 0);
                                const processed = createdVsProcessed.reduce((sum, d) => sum + d.processed, 0);
                                const diff = created - processed;
                                return (
                                    <>
                                        <span className={`text-lg font-bold ${diff > 0 ? 'text-amber-600' : diff < 0 ? 'text-green-600' : 'text-slate-600'}`}>
                                            {diff > 0 ? '+' : ''}{diff}
                                        </span>
                                        <p className="text-[10px] text-slate-500">razlika</p>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

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
                        <div className="flex">
                            {/* Y-axis */}
                            <div className="flex flex-col justify-between pr-2 text-right w-10" style={{ height: '160px' }}>
                                <span className="text-[10px] text-slate-500">{maxRequestsByDate}</span>
                                <span className="text-[10px] text-slate-500">{Math.round(maxRequestsByDate / 2)}</span>
                                <span className="text-[10px] text-slate-500">0</span>
                            </div>
                            {/* Chart */}
                            <div className="flex-1 flex items-end justify-between gap-1 border-l border-slate-200 pl-1" style={{ height: '160px' }}>
                                {requestsByDate.map((item, idx) => {
                                    const barHeight = Math.max((item.count / maxRequestsByDate) * 160, 4);
                                    return (
                                        <div key={idx} className="flex-1 flex flex-col items-center justify-end group" style={{ height: '160px' }}>
                                            <div
                                                className="w-full bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-lg transition-all duration-500 cursor-pointer hover:from-amber-400 hover:to-amber-300 relative"
                                                style={{ height: `${barHeight}px` }}
                                                title={`${item.date}: ${item.count} zahteva`}
                                            >
                                                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                                                    {item.count}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {/* X-axis labels */}
                    <div className="flex ml-10 mt-1">
                        {requestsByDate.map((item, idx) => (
                            <span key={idx} className="flex-1 text-[10px] text-slate-400 text-center truncate">
                                {item.date}
                            </span>
                        ))}
                    </div>
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
                        <div className="flex">
                            {/* Y-axis */}
                            <div className="flex flex-col justify-between pr-2 text-right w-14" style={{ height: '160px' }}>
                                <span className="text-[10px] text-slate-500">{formatWeight(maxWeightByDate)}</span>
                                <span className="text-[10px] text-slate-500">{formatWeight(maxWeightByDate / 2)}</span>
                                <span className="text-[10px] text-slate-500">0</span>
                            </div>
                            {/* Chart */}
                            <div className="flex-1 flex items-end justify-between gap-1 border-l border-slate-200 pl-1" style={{ height: '160px' }}>
                                {weightByDate.map((item, idx) => {
                                    const barHeight = Math.max((item.weight / maxWeightByDate) * 160, 4);
                                    return (
                                        <div key={idx} className="flex-1 flex flex-col items-center justify-end group" style={{ height: '160px' }}>
                                            <div
                                                className="w-full bg-gradient-to-t from-purple-500 to-purple-400 rounded-t-lg transition-all duration-500 cursor-pointer hover:from-purple-400 hover:to-purple-300 relative"
                                                style={{ height: `${barHeight}px` }}
                                                title={`${item.date}: ${formatWeight(item.weight)}`}
                                            >
                                                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                                                    {formatWeight(item.weight)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {/* X-axis labels */}
                    <div className="flex ml-14 mt-1">
                        {weightByDate.map((item, idx) => (
                            <span key={idx} className="flex-1 text-[10px] text-slate-400 text-center truncate">
                                {item.date}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Large Multi-Line Chart - Weight by Waste Type over Time */}
            <div className="bg-white rounded-2xl border p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                    <div>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <BarChart3 className="text-emerald-600" size={20} />
                            Trend težine po vrstama otpada
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Dnevni pregled težine za svaku vrstu</p>
                    </div>
                    {/* Legend */}
                    <div className="flex flex-wrap gap-3 text-xs">
                        {weightByType.slice(0, 5).map((item, idx) => {
                            const color = getColorForType(item.type);
                            return (
                                <div key={idx} className="flex items-center gap-1.5">
                                    <span className="w-3 h-0.5 rounded" style={{ backgroundColor: color.hex }} />
                                    <span className="text-slate-600">{item.type}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <WasteTypeLineChart
                    requests={filteredRequests}
                    wasteTypeColorMap={wasteTypeColorMap}
                    formatWeight={formatWeight}
                />
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

            {/* Report Filter Modal - wider on desktop */}
            {showReportModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className={`bg-white rounded-2xl shadow-2xl w-full overflow-hidden ${reportMode === 'excel' ? 'max-w-3xl' : 'max-w-lg'}`}>
                        <div className="px-6 py-4 border-b bg-gradient-to-r from-emerald-500 to-emerald-600">
                            <h3 className="text-lg font-bold text-white flex items-center gap-3">
                                {reportMode === 'print' ? <Printer size={22} /> : <FileSpreadsheet size={22} />}
                                {reportMode === 'print' ? 'Štampaj izveštaj' : 'Izvezi u Excel'}
                            </h3>
                            <p className="text-emerald-100 text-sm">Izaberite filtere za izveštaj</p>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Filters row - horizontal on desktop */}
                            <div className={`grid gap-4 ${reportMode === 'excel' ? 'md:grid-cols-4' : 'md:grid-cols-2'}`}>
                                {/* Period Od */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Od</label>
                                    <input
                                        type="date"
                                        value={reportDateFrom}
                                        onChange={(e) => setReportDateFrom(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-emerald-500 outline-none text-sm"
                                    />
                                </div>
                                {/* Period Do */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Do</label>
                                    <input
                                        type="date"
                                        value={reportDateTo}
                                        onChange={(e) => setReportDateTo(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-emerald-500 outline-none text-sm"
                                    />
                                </div>
                                {/* Klijent */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Klijent</label>
                                    <select
                                        value={reportClient}
                                        onChange={(e) => setReportClient(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-emerald-500 outline-none text-sm bg-white"
                                    >
                                        <option value="all">Svi klijenti</option>
                                        {uniqueClients.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                {/* Vrsta otpada */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Vrsta otpada</label>
                                    <select
                                        value={reportWasteType}
                                        onChange={(e) => setReportWasteType(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-emerald-500 outline-none text-sm bg-white"
                                    >
                                        <option value="all">Sve vrste</option>
                                        {wasteTypes?.map(wt => (
                                            <option key={wt.id} value={wt.id}>{wt.icon} {wt.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Sheet selection - only for Excel, horizontal grid */}
                            {reportMode === 'excel' && (
                                <div className="pt-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-medium text-slate-600">Sheet-ovi za export</label>
                                        <span className="text-xs text-slate-400">
                                            {Object.values(excelSheets).filter(Boolean).length}/{EXCEL_SHEET_OPTIONS.length} izabrano
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {EXCEL_SHEET_OPTIONS.map(sheet => (
                                            <label
                                                key={sheet.key}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${excelSheets[sheet.key]
                                                    ? 'bg-emerald-50 border-emerald-300'
                                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={excelSheets[sheet.key]}
                                                    onChange={() => toggleExcelSheet(sheet.key)}
                                                    className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                />
                                                <span>{sheet.icon}</span>
                                                <span className="text-slate-700 truncate">{sheet.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer with preview and buttons */}
                        <div className="px-5 py-4 border-t bg-slate-50 flex items-center gap-4">
                            {/* Preview */}
                            <div className="flex items-center gap-4 mr-auto">
                                <div className="text-center">
                                    <p className="text-xl font-bold text-emerald-600">{getReportData().length}</p>
                                    <p className="text-[10px] text-slate-500">zahteva</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-bold text-blue-600">
                                        {formatWeight(getReportData().reduce((sum, r) => {
                                            if (!r.weight) return sum;
                                            return sum + (r.weight_unit === 't' ? r.weight * 1000 : r.weight);
                                        }, 0))}
                                    </p>
                                    <p className="text-[10px] text-slate-500">ukupno</p>
                                </div>
                            </div>
                            {/* Buttons */}
                            <button
                                onClick={() => setShowReportModal(false)}
                                disabled={isExporting}
                                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-medium transition-colors disabled:opacity-50"
                            >
                                Otkaži
                            </button>
                            <button
                                onClick={reportMode === 'print' ? handlePrint : handleExportExcel}
                                disabled={getReportData().length === 0 || isExporting}
                                className={`px-5 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors disabled:opacity-50 ${reportMode === 'print'
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                    : 'bg-green-600 hover:bg-green-700 text-white'
                                    }`}
                            >
                                {isExporting ? (
                                    <>
                                        <RecycleLoader size={18} />
                                        Generisanje...
                                    </>
                                ) : (
                                    <>
                                        {reportMode === 'print' ? <Printer size={18} /> : <FileSpreadsheet size={18} />}
                                        {reportMode === 'print' ? 'Štampaj' : 'Izvezi'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Multi-line chart showing weight trends by waste type over time
 * SVG-based for better control and no external dependencies
 */
const WasteTypeLineChart = ({ requests, wasteTypeColorMap, formatWeight }) => {
    // Prepare data: group by date and waste type
    const chartData = useMemo(() => {
        const byDateAndType = {};
        const allTypes = new Set();
        const allDates = new Set();

        requests.forEach(r => {
            if (!r.weight || !r.processed_at) return;
            const dateObj = new Date(r.processed_at);
            const dateKey = dateObj.toISOString().split('T')[0];
            const typeLabel = r.waste_label || r.waste_type || 'Nepoznato';
            const weightKg = r.weight_unit === 't' ? r.weight * 1000 : r.weight;

            allTypes.add(typeLabel);
            allDates.add(dateKey);

            if (!byDateAndType[dateKey]) byDateAndType[dateKey] = {};
            byDateAndType[dateKey][typeLabel] = (byDateAndType[dateKey][typeLabel] || 0) + weightKg;
        });

        // Sort dates and get last 14 days
        const sortedDates = Array.from(allDates).sort().slice(-14);
        const sortedTypes = Array.from(allTypes);

        // Build series for each type
        const series = sortedTypes.map(type => ({
            type,
            color: wasteTypeColorMap[type]?.hex || '#888',
            data: sortedDates.map(date => ({
                date,
                dateLabel: new Date(date).toLocaleDateString('sr-RS', { day: 'numeric', month: 'numeric' }),
                value: byDateAndType[date]?.[type] || 0
            }))
        }));

        // Calculate max value across all series
        const maxValue = Math.max(
            ...series.flatMap(s => s.data.map(d => d.value)),
            1
        ) * 1.1;

        return { series, dates: sortedDates, maxValue };
    }, [requests, wasteTypeColorMap]);

    const { series, dates, maxValue } = chartData;

    if (dates.length === 0 || series.length === 0) {
        return (
            <div className="h-72 flex items-center justify-center text-slate-500 text-sm">
                Nema dovoljno podataka za prikaz trenda
            </div>
        );
    }

    // SVG dimensions
    const width = 900;
    const height = 300;
    const padding = { top: 20, right: 20, bottom: 50, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Scale functions
    const getX = (i) => padding.left + (i / Math.max(dates.length - 1, 1)) * chartWidth;
    const getY = (val) => padding.top + chartHeight - (val / maxValue) * chartHeight;

    // Y-axis ticks
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => maxValue * t);

    return (
        <div className="relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-72" preserveAspectRatio="xMidYMid meet">
                {/* Grid lines */}
                {yTicks.map((tick, i) => (
                    <g key={i}>
                        <line
                            x1={padding.left}
                            y1={getY(tick)}
                            x2={width - padding.right}
                            y2={getY(tick)}
                            stroke="#e2e8f0"
                            strokeDasharray="4"
                        />
                        <text
                            x={padding.left - 10}
                            y={getY(tick) + 4}
                            textAnchor="end"
                            className="text-[10px] fill-slate-500"
                        >
                            {formatWeight(tick)}
                        </text>
                    </g>
                ))}

                {/* Area fills with gradients */}
                <defs>
                    {series.map((s, idx) => (
                        <linearGradient key={idx} id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={s.color} stopOpacity="0.3" />
                            <stop offset="100%" stopColor={s.color} stopOpacity="0.05" />
                        </linearGradient>
                    ))}
                </defs>

                {/* Area under each line */}
                {series.map((s, idx) => {
                    const pathData = s.data.map((d, i) => `${i === 0 ? 'M' : 'L'}${getX(i)},${getY(d.value)}`).join(' ');
                    const areaPath = `${pathData} L${getX(s.data.length - 1)},${getY(0)} L${getX(0)},${getY(0)} Z`;
                    return (
                        <path
                            key={`area-${idx}`}
                            d={areaPath}
                            fill={`url(#grad-${idx})`}
                        />
                    );
                })}

                {/* Lines */}
                {series.map((s, idx) => {
                    const pathData = s.data.map((d, i) => `${i === 0 ? 'M' : 'L'}${getX(i)},${getY(d.value)}`).join(' ');
                    return (
                        <path
                            key={`line-${idx}`}
                            d={pathData}
                            fill="none"
                            stroke={s.color}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    );
                })}

                {/* Data points */}
                {series.map((s, sIdx) => (
                    s.data.map((d, i) => (
                        <g key={`point-${sIdx}-${i}`} className="group">
                            <circle
                                cx={getX(i)}
                                cy={getY(d.value)}
                                r="4"
                                fill="white"
                                stroke={s.color}
                                strokeWidth="2"
                                className="cursor-pointer hover:r-6 transition-all"
                            />
                            {/* Tooltip on hover */}
                            <title>{`${s.type}: ${formatWeight(d.value)} (${d.dateLabel})`}</title>
                        </g>
                    ))
                ))}

                {/* X-axis labels */}
                {dates.map((date, i) => {
                    const label = new Date(date).toLocaleDateString('sr-RS', { day: 'numeric', month: 'numeric' });
                    // Show every label if <= 7, otherwise every other
                    if (dates.length > 7 && i % 2 !== 0 && i !== dates.length - 1) return null;
                    return (
                        <text
                            key={i}
                            x={getX(i)}
                            y={height - 15}
                            textAnchor="middle"
                            className="text-[10px] fill-slate-500"
                        >
                            {label}
                        </text>
                    );
                })}

                {/* X-axis line */}
                <line
                    x1={padding.left}
                    y1={height - padding.bottom}
                    x2={width - padding.right}
                    y2={height - padding.bottom}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                />

                {/* Y-axis line */}
                <line
                    x1={padding.left}
                    y1={padding.top}
                    x2={padding.left}
                    y2={height - padding.bottom}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                />
            </svg>

            {/* Interactive Legend */}
            <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
                {series.map((s, idx) => {
                    const total = s.data.reduce((sum, d) => sum + d.value, 0);
                    return (
                        <div
                            key={idx}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-default"
                        >
                            <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: s.color }}
                            />
                            <span className="font-medium text-slate-700">{s.type}</span>
                            <span className="text-slate-500">({formatWeight(total)})</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AnalyticsPage;
