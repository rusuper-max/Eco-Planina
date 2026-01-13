import { useState, useEffect } from 'react';
import { Printer, Download, FileSpreadsheet, Search, ArrowUpDown, ArrowUp, ArrowDown, Users, Truck, History, FileText } from 'lucide-react';
import { FillLevelBar } from '../common';

// Helper function for calculating remaining time
const getRemainingTime = (createdAt, urgency) => {
    const hours = urgency === '24h' ? 24 : urgency === '48h' ? 48 : 72;
    const deadline = new Date(new Date(createdAt).getTime() + hours * 60 * 60 * 1000);
    const diff = deadline - new Date();
    if (diff <= 0) return { text: '00:00:00', color: 'text-red-600', bg: 'bg-red-100', ms: diff };
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    const text = h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
    if (h < 6) return { text, color: 'text-red-600', bg: 'bg-red-100', ms: diff };
    if (h < 24) return { text, color: 'text-amber-600', bg: 'bg-amber-100', ms: diff };
    return { text, color: 'text-emerald-600', bg: 'bg-emerald-100', ms: diff };
};

// Default waste types
const WASTE_TYPES = [
    { id: 'cardboard', label: 'Karton', icon: '📦' },
    { id: 'plastic', label: 'Plastika', icon: '♻️' },
    { id: 'glass', label: 'Staklo', icon: '🍾' },
];

export const PrintExport = ({ clients, requests, processedRequests, wasteTypes = WASTE_TYPES, onClientClick }) => {
    const [dataType, setDataType] = useState('clients'); // clients, requests, history
    const [selectedFields, setSelectedFields] = useState({
        clients: { name: true, phone: true, address: true, equipment: false },
        requests: { client: true, type: true, urgency: true, date: true, fillLevel: false, note: false },
        history: { client: true, type: true, created: true, processed: true }
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredData, setFilteredData] = useState([]);
    const [sortBy, setSortBy] = useState('name'); // name, remaining, date, processed
    const [sortDir, setSortDir] = useState('asc');

    // Reset sort when changing data type
    useEffect(() => {
        setSortBy('name');
        setSortDir('asc');
    }, [dataType]);

    useEffect(() => {
        let data = [];
        const query = searchQuery.toLowerCase();

        if (dataType === 'clients') {
            data = (clients || []).filter(c =>
                !query || c.name?.toLowerCase().includes(query) || c.phone?.includes(query) || c.address?.toLowerCase().includes(query)
            );
        } else if (dataType === 'requests') {
            data = (requests || []).filter(r =>
                !query || r.client_name?.toLowerCase().includes(query) || r.waste_label?.toLowerCase().includes(query)
            );
        } else if (dataType === 'history') {
            data = (processedRequests || []).filter(r =>
                !query || r.client_name?.toLowerCase().includes(query) || r.waste_label?.toLowerCase().includes(query)
            );
        }

        // Sort data
        data = [...data].sort((a, b) => {
            let comparison = 0;
            if (dataType === 'clients') {
                if (sortBy === 'name') comparison = (a.name || '').localeCompare(b.name || '');
            } else if (dataType === 'requests') {
                if (sortBy === 'name') comparison = (a.client_name || '').localeCompare(b.client_name || '');
                else if (sortBy === 'remaining') comparison = getRemainingTime(a.created_at, a.urgency).ms - getRemainingTime(b.created_at, b.urgency).ms;
                else if (sortBy === 'date') comparison = new Date(a.created_at) - new Date(b.created_at);
            } else if (dataType === 'history') {
                if (sortBy === 'name') comparison = (a.client_name || '').localeCompare(b.client_name || '');
                else if (sortBy === 'date') comparison = new Date(a.created_at) - new Date(b.created_at);
                else if (sortBy === 'processed') comparison = new Date(a.processed_at) - new Date(b.processed_at);
            }
            return sortDir === 'asc' ? comparison : -comparison;
        });

        setFilteredData(data);
    }, [dataType, clients, requests, processedRequests, searchQuery, sortBy, sortDir]);

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortDir('asc');
        }
    };

    const toggleField = (type, field) => {
        setSelectedFields(prev => ({
            ...prev,
            [type]: { ...prev[type], [field]: !prev[type][field] }
        }));
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        const fields = selectedFields[dataType];

        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>EcoMountainTracking - Štampa</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #059669; margin-bottom: 5px; }
                    .subtitle { color: #64748b; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
                    th { background: #f1f5f9; font-weight: 600; }
                    tr:nth-child(even) { background: #f8fafc; }
                    .footer { margin-top: 20px; color: #94a3b8; font-size: 12px; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                <h1>EcoMountainTracking</h1>
                <p class="subtitle">${dataType === 'clients' ? 'Lista klijenata' : dataType === 'requests' ? 'Aktivni zahtevi' : 'Istorija zahteva'} - ${new Date().toLocaleDateString('sr-RS')}</p>
                <table>
                    <thead><tr>
        `;

        // Headers
        if (dataType === 'clients') {
            if (fields.name) html += '<th>Ime</th>';
            if (fields.phone) html += '<th>Telefon</th>';
            if (fields.address) html += '<th>Adresa</th>';
            if (fields.equipment) html += '<th>Oprema</th>';
        } else if (dataType === 'requests') {
            if (fields.client) html += '<th>Klijent</th>';
            if (fields.type) html += '<th>Tip</th>';
            if (fields.urgency) html += '<th>Preostalo</th>';
            if (fields.date) html += '<th>Datum</th>';
            if (fields.fillLevel) html += '<th>Popunjenost</th>';
            if (fields.note) html += '<th>Napomena</th>';
        } else {
            if (fields.client) html += '<th>Klijent</th>';
            if (fields.type) html += '<th>Tip</th>';
            if (fields.created) html += '<th>Podneto</th>';
            if (fields.processed) html += '<th>Obrađeno</th>';
        }

        html += '</tr></thead><tbody>';

        // Rows
        filteredData.forEach(item => {
            html += '<tr>';
            if (dataType === 'clients') {
                if (fields.name) html += `<td>${item.name || '-'}</td>`;
                if (fields.phone) html += `<td>${item.phone || '-'}</td>`;
                if (fields.address) html += `<td>${item.address || '-'}</td>`;
                if (fields.equipment) html += `<td>${item.equipment_types?.length || 0} kom</td>`;
            } else if (dataType === 'requests') {
                if (fields.client) html += `<td>${item.client_name || '-'}</td>`;
                if (fields.type) html += `<td>${item.waste_label || '-'}</td>`;
                if (fields.urgency) {
                    const remaining = getRemainingTime(item.created_at, item.urgency);
                    html += `<td>${remaining.text}</td>`;
                }
                if (fields.date) html += `<td>${new Date(item.created_at).toLocaleDateString('sr-RS')}</td>`;
                if (fields.fillLevel) html += `<td>${item.fill_level}%</td>`;
                if (fields.note) html += `<td>${item.note || '-'}</td>`;
            } else {
                if (fields.client) html += `<td>${item.client_name || '-'}</td>`;
                if (fields.type) html += `<td>${item.waste_label || '-'}</td>`;
                if (fields.created) html += `<td>${new Date(item.created_at).toLocaleDateString('sr-RS')}</td>`;
                if (fields.processed) html += `<td>${new Date(item.processed_at).toLocaleDateString('sr-RS')}</td>`;
            }
            html += '</tr>';
        });

        html += `
                    </tbody>
                </table>
                <p class="footer">Generisano: ${new Date().toLocaleString('sr-RS')} | Ukupno: ${filteredData.length} stavki</p>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
    };

    const handleExportExcel = () => {
        const fields = selectedFields[dataType];
        let csv = '\uFEFF'; // BOM for UTF-8

        // Headers
        const headers = [];
        if (dataType === 'clients') {
            if (fields.name) headers.push('Ime');
            if (fields.phone) headers.push('Telefon');
            if (fields.address) headers.push('Adresa');
            if (fields.equipment) headers.push('Oprema');
        } else if (dataType === 'requests') {
            if (fields.client) headers.push('Klijent');
            if (fields.type) headers.push('Tip');
            if (fields.urgency) headers.push('Preostalo');
            if (fields.date) headers.push('Datum');
            if (fields.fillLevel) headers.push('Popunjenost');
            if (fields.note) headers.push('Napomena');
        } else {
            if (fields.client) headers.push('Klijent');
            if (fields.type) headers.push('Tip');
            if (fields.created) headers.push('Podneto');
            if (fields.processed) headers.push('Obrađeno');
        }
        csv += headers.join(';') + '\n';

        // Rows
        filteredData.forEach(item => {
            const row = [];
            if (dataType === 'clients') {
                if (fields.name) row.push(item.name || '');
                if (fields.phone) row.push(`="${item.phone || ''}"`); // Force text format to prevent scientific notation
                if (fields.address) row.push(`"${(item.address || '').replace(/"/g, '""')}"`);
                if (fields.equipment) row.push(`${item.equipment_types?.length || 0} kom`);
            } else if (dataType === 'requests') {
                if (fields.client) row.push(item.client_name || '');
                if (fields.type) row.push(item.waste_label || '');
                if (fields.urgency) {
                    const remaining = getRemainingTime(item.created_at, item.urgency);
                    row.push(remaining.text);
                }
                if (fields.date) row.push(new Date(item.created_at).toLocaleDateString('sr-RS'));
                if (fields.fillLevel) row.push(`${item.fill_level}%`);
                if (fields.note) row.push(`"${(item.note || '').replace(/"/g, '""')}"`);
            } else {
                if (fields.client) row.push(item.client_name || '');
                if (fields.type) row.push(item.waste_label || '');
                if (fields.created) row.push(new Date(item.created_at).toLocaleDateString('sr-RS'));
                if (fields.processed) row.push(new Date(item.processed_at).toLocaleDateString('sr-RS'));
            }
            csv += row.join(';') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ecoplanina_${dataType}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const fields = selectedFields[dataType];
    const fieldLabels = {
        clients: { name: 'Ime', phone: 'Telefon', address: 'Adresa', equipment: 'Oprema' },
        requests: { client: 'Klijent', type: 'Tip', urgency: 'Preostalo', date: 'Datum', fillLevel: 'Popunjenost', note: 'Napomena' },
        history: { client: 'Klijent', type: 'Tip', created: 'Podneto', processed: 'Obrađeno' }
    };

    return (
        <div className="space-y-6">
            {/* Data Type Selection */}
            <div className="bg-white rounded-2xl border p-6">
                <h3 className="font-bold text-slate-800 mb-4">Izaberi podatke za štampu/export</h3>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => setDataType('clients')}
                        className={`px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 ${dataType === 'clients' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                        <Users size={18} />
                        Klijenti ({clients?.length || 0})
                    </button>
                    <button
                        onClick={() => setDataType('requests')}
                        className={`px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 ${dataType === 'requests' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                        <Truck size={18} />
                        Aktivni zahtevi ({requests?.length || 0})
                    </button>
                    <button
                        onClick={() => setDataType('history')}
                        className={`px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 ${dataType === 'history' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                        <History size={18} />
                        Istorija ({processedRequests?.length || 0})
                    </button>
                </div>
            </div>

            {/* Search & Field Selection */}
            <div className="bg-white rounded-2xl border p-6">
                <div className="flex flex-wrap gap-4 mb-4">
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
                </div>

                <h4 className="font-medium text-slate-700 mb-3">Izaberi kolone za prikaz:</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                    {Object.entries(fields).map(([field, isChecked]) => (
                        <label
                            key={field}
                            className={`px-3 py-2 rounded-lg border cursor-pointer transition-all ${isChecked ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'}`}
                        >
                            <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleField(dataType, field)}
                                className="sr-only"
                            />
                            <span className="text-sm font-medium">{fieldLabels[dataType][field]}</span>
                        </label>
                    ))}
                </div>

                <div className="flex items-center gap-4 mt-4">
                    <span className="text-sm text-slate-500">Filtrirano: {filteredData.length} stavki</span>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">Sortiraj:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        >
                            <option value="name">Po imenu</option>
                            {dataType === 'requests' && <option value="remaining">Po preostalom vremenu</option>}
                            {(dataType === 'requests' || dataType === 'history') && <option value="date">Po datumu kreiranja</option>}
                            {dataType === 'history' && <option value="processed">Po datumu obrade</option>}
                        </select>
                        <button
                            onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
                            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50"
                            title={sortDir === 'asc' ? 'Rastuće' : 'Opadajuće'}
                        >
                            {sortDir === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview */}
            <div className="bg-white rounded-2xl border overflow-hidden">
                <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Pregled ({filteredData.length})</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={handleExportExcel}
                            disabled={filteredData.length === 0}
                            className="px-4 py-2 bg-green-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-green-700 disabled:opacity-50"
                        >
                            <FileSpreadsheet size={18} />
                            <span className="hidden sm:inline">Excel/CSV</span>
                        </button>
                        <button
                            onClick={handlePrint}
                            disabled={filteredData.length === 0}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Printer size={18} />
                            <span className="hidden sm:inline">Štampaj</span>
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 border-b sticky top-0">
                            <tr>
                                {dataType === 'clients' && (
                                    <>
                                        {fields.name && <th className="px-4 py-3 text-left">Ime</th>}
                                        {fields.phone && <th className="px-4 py-3 text-left">Telefon</th>}
                                        {fields.address && <th className="px-4 py-3 text-left">Adresa</th>}
                                        {fields.equipment && <th className="px-4 py-3 text-left">Oprema</th>}
                                    </>
                                )}
                                {dataType === 'requests' && (
                                    <>
                                        {fields.client && <th className="px-4 py-3 text-left">Klijent</th>}
                                        {fields.type && <th className="px-4 py-3 text-left">Tip</th>}
                                        {fields.urgency && <th className="px-4 py-3 text-left">Preostalo</th>}
                                        {fields.date && <th className="px-4 py-3 text-left">Datum</th>}
                                        {fields.fillLevel && <th className="px-4 py-3 text-left">%</th>}
                                        {fields.note && <th className="px-4 py-3 text-left">Napomena</th>}
                                    </>
                                )}
                                {dataType === 'history' && (
                                    <>
                                        {fields.client && <th className="px-4 py-3 text-left">Klijent</th>}
                                        {fields.type && <th className="px-4 py-3 text-left">Tip</th>}
                                        {fields.created && <th className="px-4 py-3 text-left">Podneto</th>}
                                        {fields.processed && <th className="px-4 py-3 text-left">Obrađeno</th>}
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredData.slice(0, 50).map((item, idx) => (
                                <tr key={item.id || idx} className="hover:bg-slate-50">
                                    {dataType === 'clients' && (
                                        <>
                                            {fields.name && <td className="px-4 py-3"><button onClick={() => onClientClick?.(item.id)} className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left">{item.name}</button></td>}
                                            {fields.phone && <td className="px-4 py-3 text-slate-600">{item.phone}</td>}
                                            {fields.address && <td className="px-4 py-3 text-slate-600">{item.address || '-'}</td>}
                                            {fields.equipment && <td className="px-4 py-3 text-slate-600">{item.equipment_types?.length || 0} kom</td>}
                                        </>
                                    )}
                                    {dataType === 'requests' && (
                                        <>
                                            {fields.client && <td className="px-4 py-3"><button onClick={() => onClientClick?.(item.user_id)} className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left">{item.client_name}</button></td>}
                                            {fields.type && <td className="px-4 py-3">{item.waste_label}</td>}
                                            {fields.urgency && (() => {
                                                const remaining = getRemainingTime(item.created_at, item.urgency);
                                                return <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-medium rounded-full ${remaining.bg} ${remaining.color}`}>{remaining.text}</span></td>;
                                            })()}
                                            {fields.date && <td className="px-4 py-3 text-slate-600">{new Date(item.created_at).toLocaleDateString('sr-RS')}</td>}
                                            {fields.fillLevel && <td className="px-4 py-3"><FillLevelBar fillLevel={item.fill_level} /></td>}
                                            {fields.note && <td className="px-4 py-3 text-slate-600 max-w-32 truncate">{item.note || '-'}</td>}
                                        </>
                                    )}
                                    {dataType === 'history' && (
                                        <>
                                            {fields.client && <td className="px-4 py-3 font-medium">{item.client_name}</td>}
                                            {fields.type && <td className="px-4 py-3">{item.waste_label}</td>}
                                            {fields.created && <td className="px-4 py-3 text-slate-600">{new Date(item.created_at).toLocaleDateString('sr-RS')}</td>}
                                            {fields.processed && <td className="px-4 py-3 text-emerald-600">{new Date(item.processed_at).toLocaleDateString('sr-RS')}</td>}
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredData.length === 0 && (
                        <div className="p-8 text-center text-slate-500">
                            <FileText size={32} className="mx-auto mb-2 text-slate-300" />
                            <p>Nema podataka za prikaz</p>
                        </div>
                    )}
                    {filteredData.length > 50 && (
                        <div className="p-3 text-center text-sm text-slate-500 bg-slate-50 border-t">
                            Prikazano prvih 50 od {filteredData.length} stavki. Sve stavke će biti uključene u štampu/export.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
