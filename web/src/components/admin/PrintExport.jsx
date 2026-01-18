import { useState, useEffect } from 'react';
import { Printer, Download, FileSpreadsheet, Search, ArrowUpDown, ArrowUp, ArrowDown, Users, Truck, History, FileText } from 'lucide-react';
import { FillLevelBar, CountdownTimer, RecycleLoader } from '../common';
import { getRemainingTime } from '../../utils/timeUtils';

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
    const [isExporting, setIsExporting] = useState(false);

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

    const handleExportExcel = async () => {
        if (isExporting || filteredData.length === 0) return;
        setIsExporting(true);

        try {
            // Dynamic import ExcelJS
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'EcoMountainTracking';
            workbook.created = new Date();

            const fields = selectedFields[dataType];
            const sheetName = dataType === 'clients' ? 'Klijenti' : dataType === 'requests' ? 'Aktivni zahtevi' : 'Istorija';
            const worksheet = workbook.addWorksheet(sheetName);

            // Define columns based on dataType and selected fields
            const columns = [];
            if (dataType === 'clients') {
                if (fields.name) columns.push({ header: 'Ime', key: 'name', width: 25 });
                if (fields.phone) columns.push({ header: 'Telefon', key: 'phone', width: 18 });
                if (fields.address) columns.push({ header: 'Adresa', key: 'address', width: 35 });
                if (fields.equipment) columns.push({ header: 'Oprema', key: 'equipment', width: 12 });
            } else if (dataType === 'requests') {
                if (fields.client) columns.push({ header: 'Klijent', key: 'client', width: 25 });
                if (fields.type) columns.push({ header: 'Tip otpada', key: 'type', width: 18 });
                if (fields.urgency) columns.push({ header: 'Preostalo', key: 'urgency', width: 15 });
                if (fields.date) columns.push({ header: 'Datum', key: 'date', width: 14 });
                if (fields.fillLevel) columns.push({ header: 'Popunjenost', key: 'fillLevel', width: 14 });
                if (fields.note) columns.push({ header: 'Napomena', key: 'note', width: 30 });
            } else {
                if (fields.client) columns.push({ header: 'Klijent', key: 'client', width: 25 });
                if (fields.type) columns.push({ header: 'Tip otpada', key: 'type', width: 18 });
                if (fields.created) columns.push({ header: 'Podneto', key: 'created', width: 14 });
                if (fields.processed) columns.push({ header: 'Obrađeno', key: 'processed', width: 14 });
            }
            worksheet.columns = columns;

            // Style header row
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF059669' } // Emerald-600
            };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
            headerRow.height = 24;

            // Add data rows
            filteredData.forEach((item, index) => {
                const rowData = {};
                if (dataType === 'clients') {
                    if (fields.name) rowData.name = item.name || '';
                    if (fields.phone) rowData.phone = item.phone || '';
                    if (fields.address) rowData.address = item.address || '';
                    if (fields.equipment) rowData.equipment = `${item.equipment_types?.length || 0} kom`;
                } else if (dataType === 'requests') {
                    if (fields.client) rowData.client = item.client_name || '';
                    if (fields.type) rowData.type = item.waste_label || '';
                    if (fields.urgency) {
                        const remaining = getRemainingTime(item.created_at, item.urgency);
                        rowData.urgency = remaining.text;
                    }
                    if (fields.date) rowData.date = new Date(item.created_at).toLocaleDateString('sr-RS');
                    if (fields.fillLevel) rowData.fillLevel = `${item.fill_level}%`;
                    if (fields.note) rowData.note = item.note || '';
                } else {
                    if (fields.client) rowData.client = item.client_name || '';
                    if (fields.type) rowData.type = item.waste_label || '';
                    if (fields.created) rowData.created = new Date(item.created_at).toLocaleDateString('sr-RS');
                    if (fields.processed) rowData.processed = new Date(item.processed_at).toLocaleDateString('sr-RS');
                }

                const row = worksheet.addRow(rowData);
                row.alignment = { vertical: 'middle' };

                // Alternate row colors
                if (index % 2 === 1) {
                    row.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF8FAFC' } // Slate-50
                    };
                }
            });

            // Add borders to all cells
            worksheet.eachRow((row, rowNum) => {
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                    };
                });
            });

            // Add footer with metadata
            const footerRow = worksheet.addRow([]);
            const metaRow = worksheet.addRow([`Generisano: ${new Date().toLocaleString('sr-RS')} | Ukupno: ${filteredData.length} stavki`]);
            metaRow.font = { italic: true, color: { argb: 'FF94A3B8' } };

            // Generate and download file
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `ecoplanina_${dataType}_${new Date().toISOString().split('T')[0]}.xlsx`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Excel export error:', error);
            alert('Greška pri eksportovanju. Pokušajte ponovo.');
        } finally {
            setIsExporting(false);
        }
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
                            disabled={filteredData.length === 0 || isExporting}
                            className="px-4 py-2 bg-green-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-green-700 disabled:opacity-50"
                        >
                            {isExporting ? <RecycleLoader size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
                            <span className="hidden sm:inline">{isExporting ? 'Eksportovanje...' : 'Excel'}</span>
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
                                            {fields.urgency && (
                                                <td className="px-4 py-3">
                                                    <CountdownTimer createdAt={item.created_at} urgency={item.urgency} />
                                                </td>
                                            )}
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
