import ExcelJS from 'exceljs';

// Color palette matching the web charts (hex without alpha for canvas)
const CHART_COLORS = [
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#F43F5E', // Rose
    '#06B6D4', // Cyan
    '#F97316', // Orange
    '#6366F1', // Indigo
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#84CC16', // Lime
    '#EF4444', // Red
];

// Color palette for Excel cells (ARGB format)
const WASTE_TYPE_COLORS = [
    'FF3B82F6', // Blue
    'FF10B981', // Emerald
    'FFF59E0B', // Amber
    'FF8B5CF6', // Purple
    'FFF43F5E', // Rose
    'FF06B6D4', // Cyan
    'FFF97316', // Orange
    'FF6366F1', // Indigo
    'FFEC4899', // Pink
    'FF14B8A6', // Teal
    'FF84CC16', // Lime
    'FFEF4444', // Red
];

/**
 * Export analytics data to a professional Excel file with multiple sheets and charts
 */
export const exportToExcel = async ({
    data,
    filters,
    wasteTypes,
    clients,
    fileName = 'izvestaj',
    sheets = {}
}) => {
    // Default all sheets to enabled if not specified
    const enabledSheets = {
        sumarno: sheets.sumarno !== false,
        poVrsti: sheets.poVrsti !== false,
        poKlijentu: sheets.poKlijentu !== false,
        dnevniTrend: sheets.dnevniTrend !== false,
        detaljno: sheets.detaljno !== false,
        sviZahtevi: sheets.sviZahtevi !== false,
        grafici: sheets.grafici !== false,
    };

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EcoMountainTracking';
    workbook.created = new Date();

    // Get waste type color by index
    const getTypeColor = (index) => WASTE_TYPE_COLORS[index % WASTE_TYPE_COLORS.length];

    // ===== PREPARE ALL AGGREGATED DATA =====
    const totalWeight = data.reduce((sum, r) => {
        if (!r.weight) return sum;
        return sum + (r.weight_unit === 't' ? r.weight * 1000 : r.weight);
    }, 0);
    const totalRequests = data.filter(r => r.weight).length;

    // Group by type
    const byType = {};
    data.forEach(r => {
        if (!r.weight) return;
        const type = r.waste_label || r.waste_type || 'Nepoznato';
        const weightKg = r.weight_unit === 't' ? r.weight * 1000 : r.weight;
        if (!byType[type]) byType[type] = { weight: 0, count: 0 };
        byType[type].weight += weightKg;
        byType[type].count++;
    });

    const typeRows = Object.entries(byType)
        .sort((a, b) => b[1].weight - a[1].weight)
        .map(([type, stats], idx) => ({
            type,
            weightKg: stats.weight,
            weightT: stats.weight / 1000,
            count: stats.count,
            percent: totalWeight > 0 ? (stats.weight / totalWeight) * 100 : 0,
            color: getTypeColor(idx)
        }));

    // Group by client
    const byClient = {};
    data.forEach(r => {
        if (!r.weight) return;
        const client = r.client_name || 'Nepoznat';
        const weightKg = r.weight_unit === 't' ? r.weight * 1000 : r.weight;
        if (!byClient[client]) byClient[client] = { weight: 0, count: 0 };
        byClient[client].weight += weightKg;
        byClient[client].count++;
    });

    const clientRows = Object.entries(byClient)
        .sort((a, b) => b[1].weight - a[1].weight)
        .map(([client, stats]) => ({
            client,
            weightKg: stats.weight,
            weightT: stats.weight / 1000,
            count: stats.count,
            percent: totalWeight > 0 ? (stats.weight / totalWeight) * 100 : 0
        }));

    // Group by date and type (for trend)
    const dailyData = {};
    const allTypes = new Set();
    const allDates = new Set();

    data.forEach(r => {
        if (!r.weight || !r.processed_at) return;
        const dateKey = new Date(r.processed_at).toISOString().split('T')[0];
        const type = r.waste_label || r.waste_type || 'Nepoznato';
        const weightKg = r.weight_unit === 't' ? r.weight * 1000 : r.weight;

        allTypes.add(type);
        allDates.add(dateKey);

        if (!dailyData[dateKey]) dailyData[dateKey] = {};
        dailyData[dateKey][type] = (dailyData[dateKey][type] || 0) + weightKg;
    });

    const sortedTypes = Array.from(allTypes).sort();
    const sortedDates = Array.from(allDates).sort();

    // Group by client and type (for detailed view)
    const detailed = {};
    data.forEach(r => {
        if (!r.weight) return;
        const client = r.client_name || 'Nepoznat';
        const type = r.waste_label || r.waste_type || 'Nepoznato';
        const key = `${client}|||${type}`;
        const weightKg = r.weight_unit === 't' ? r.weight * 1000 : r.weight;
        if (!detailed[key]) detailed[key] = { client, type, weight: 0, count: 0 };
        detailed[key].weight += weightKg;
        detailed[key].count++;
    });

    const detailRows = Object.values(detailed)
        .sort((a, b) => a.client.localeCompare(b.client, 'sr') || b.weight - a.weight);

    // Sorted data for list
    const sortedData = data
        .filter(r => r.weight)
        .sort((a, b) => new Date(b.processed_at) - new Date(a.processed_at));

    // ===== SHEET 1: SUMARNO (Summary) =====
    if (enabledSheets.sumarno) {
        const summarySheet = workbook.addWorksheet('Sumarno', {
            properties: { tabColor: { argb: 'FF10B981' } }
        });

        summarySheet.mergeCells('A1:D1');
        summarySheet.getCell('A1').value = 'EcoMountainTracking - Izvestaj Analitike';
        summarySheet.getCell('A1').font = { bold: true, size: 18, color: { argb: 'FF10B981' } };
        summarySheet.getCell('A1').alignment = { horizontal: 'center' };

        summarySheet.mergeCells('A2:D2');
        summarySheet.getCell('A2').value = `Generisano: ${new Date().toLocaleString('sr-RS')}`;
        summarySheet.getCell('A2').font = { italic: true, color: { argb: 'FF64748B' } };
        summarySheet.getCell('A2').alignment = { horizontal: 'center' };

        let filterText = [];
        if (filters.dateFrom || filters.dateTo) {
            filterText.push(`Period: ${filters.dateFrom || 'pocetak'} - ${filters.dateTo || 'danas'}`);
        }
        if (filters.client && filters.client !== 'all') {
            const clientName = clients?.find(c => c.id === filters.client)?.name || filters.client;
            filterText.push(`Klijent: ${clientName}`);
        }
        if (filters.wasteType && filters.wasteType !== 'all') {
            const typeName = wasteTypes?.find(w => w.id === filters.wasteType)?.name || filters.wasteType;
            filterText.push(`Vrsta: ${typeName}`);
        }
        if (filterText.length > 0) {
            summarySheet.mergeCells('A3:D3');
            summarySheet.getCell('A3').value = `Filteri: ${filterText.join(' | ')}`;
            summarySheet.getCell('A3').font = { italic: true, size: 10, color: { argb: 'FF94A3B8' } };
            summarySheet.getCell('A3').alignment = { horizontal: 'center' };
        }

        summarySheet.getCell('A5').value = 'SUMARNI PODACI';
        summarySheet.getCell('A5').font = { bold: true, size: 14 };

        const summaryData = [
            ['Ukupna tezina', formatWeight(totalWeight)],
            ['Ukupna tezina (kg)', `${totalWeight.toFixed(1)} kg`],
            ['Ukupna tezina (t)', `${(totalWeight / 1000).toFixed(3)} t`],
            ['Broj zahteva', totalRequests],
            ['Broj klijenata', new Set(data.map(r => r.client_id)).size],
            ['Broj vrsta otpada', new Set(data.map(r => r.waste_type || r.waste_label)).size],
        ];

        summaryData.forEach((row, idx) => {
            summarySheet.getCell(`A${7 + idx}`).value = row[0];
            summarySheet.getCell(`A${7 + idx}`).font = { color: { argb: 'FF64748B' } };
            summarySheet.getCell(`B${7 + idx}`).value = row[1];
            summarySheet.getCell(`B${7 + idx}`).font = { bold: true };
        });

        summarySheet.columns = [
            { width: 25 },
            { width: 20 },
            { width: 15 },
            { width: 15 },
        ];
    }

    // ===== SHEET 2: PO VRSTI OTPADA =====
    if (enabledSheets.poVrsti) {
        const byTypeSheet = workbook.addWorksheet('Po vrsti otpada', {
            properties: { tabColor: { argb: 'FF3B82F6' } }
        });

        byTypeSheet.mergeCells('A1:E1');
        byTypeSheet.getCell('A1').value = 'Tezina po vrsti otpada';
        byTypeSheet.getCell('A1').font = { bold: true, size: 16 };

        const typeHeaders = ['Vrsta otpada', 'Tezina (kg)', 'Tezina (t)', 'Broj zahteva', 'Procenat'];
        typeHeaders.forEach((h, idx) => {
            const cell = byTypeSheet.getCell(3, idx + 1);
            cell.value = h;
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
            cell.alignment = { horizontal: 'center' };
        });

        typeRows.forEach((row, idx) => {
            const rowNum = 4 + idx;
            byTypeSheet.getCell(rowNum, 1).value = row.type;
            byTypeSheet.getCell(rowNum, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: row.color.replace('FF', '33') } };
            byTypeSheet.getCell(rowNum, 2).value = parseFloat(row.weightKg.toFixed(1));
            byTypeSheet.getCell(rowNum, 2).numFmt = '#,##0.0';
            byTypeSheet.getCell(rowNum, 3).value = parseFloat(row.weightT.toFixed(3));
            byTypeSheet.getCell(rowNum, 3).numFmt = '#,##0.000';
            byTypeSheet.getCell(rowNum, 4).value = row.count;
            byTypeSheet.getCell(rowNum, 5).value = row.percent / 100;
            byTypeSheet.getCell(rowNum, 5).numFmt = '0.0%';
        });

        const typeTotalRow = 4 + typeRows.length;
        byTypeSheet.getCell(typeTotalRow, 1).value = 'UKUPNO';
        byTypeSheet.getCell(typeTotalRow, 1).font = { bold: true };
        byTypeSheet.getCell(typeTotalRow, 2).value = parseFloat(totalWeight.toFixed(1));
        byTypeSheet.getCell(typeTotalRow, 2).font = { bold: true };
        byTypeSheet.getCell(typeTotalRow, 2).numFmt = '#,##0.0';
        byTypeSheet.getCell(typeTotalRow, 3).value = parseFloat((totalWeight / 1000).toFixed(3));
        byTypeSheet.getCell(typeTotalRow, 3).font = { bold: true };
        byTypeSheet.getCell(typeTotalRow, 3).numFmt = '#,##0.000';
        byTypeSheet.getCell(typeTotalRow, 4).value = totalRequests;
        byTypeSheet.getCell(typeTotalRow, 4).font = { bold: true };
        byTypeSheet.getCell(typeTotalRow, 5).value = 1;
        byTypeSheet.getCell(typeTotalRow, 5).numFmt = '0%';
        byTypeSheet.getCell(typeTotalRow, 5).font = { bold: true };

        byTypeSheet.columns = [
            { width: 25 },
            { width: 15 },
            { width: 15 },
            { width: 15 },
            { width: 12 },
        ];
    }

    // ===== SHEET 3: PO KLIJENTU =====
    if (enabledSheets.poKlijentu) {
        const byClientSheet = workbook.addWorksheet('Po klijentu', {
            properties: { tabColor: { argb: 'FF8B5CF6' } }
        });

        byClientSheet.mergeCells('A1:E1');
        byClientSheet.getCell('A1').value = 'Tezina po klijentu';
        byClientSheet.getCell('A1').font = { bold: true, size: 16 };

        const clientHeaders = ['Klijent', 'Tezina (kg)', 'Tezina (t)', 'Broj zahteva', 'Procenat'];
        clientHeaders.forEach((h, idx) => {
            const cell = byClientSheet.getCell(3, idx + 1);
            cell.value = h;
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5CF6' } };
            cell.alignment = { horizontal: 'center' };
        });

        clientRows.forEach((row, idx) => {
            const rowNum = 4 + idx;
            byClientSheet.getCell(rowNum, 1).value = row.client;
            byClientSheet.getCell(rowNum, 2).value = parseFloat(row.weightKg.toFixed(1));
            byClientSheet.getCell(rowNum, 2).numFmt = '#,##0.0';
            byClientSheet.getCell(rowNum, 3).value = parseFloat(row.weightT.toFixed(3));
            byClientSheet.getCell(rowNum, 3).numFmt = '#,##0.000';
            byClientSheet.getCell(rowNum, 4).value = row.count;
            byClientSheet.getCell(rowNum, 5).value = row.percent / 100;
            byClientSheet.getCell(rowNum, 5).numFmt = '0.0%';
        });

        const clientTotalRow = 4 + clientRows.length;
        byClientSheet.getCell(clientTotalRow, 1).value = 'UKUPNO';
        byClientSheet.getCell(clientTotalRow, 1).font = { bold: true };
        byClientSheet.getCell(clientTotalRow, 2).value = parseFloat(totalWeight.toFixed(1));
        byClientSheet.getCell(clientTotalRow, 2).font = { bold: true };
        byClientSheet.getCell(clientTotalRow, 2).numFmt = '#,##0.0';
        byClientSheet.getCell(clientTotalRow, 3).value = parseFloat((totalWeight / 1000).toFixed(3));
        byClientSheet.getCell(clientTotalRow, 3).font = { bold: true };
        byClientSheet.getCell(clientTotalRow, 3).numFmt = '#,##0.000';
        byClientSheet.getCell(clientTotalRow, 4).value = totalRequests;
        byClientSheet.getCell(clientTotalRow, 4).font = { bold: true };

        byClientSheet.columns = [
            { width: 30 },
            { width: 15 },
            { width: 15 },
            { width: 15 },
            { width: 12 },
        ];
    }

    // ===== SHEET 4: DNEVNI TREND =====
    if (enabledSheets.dnevniTrend) {
        const trendSheet = workbook.addWorksheet('Dnevni trend', {
            properties: { tabColor: { argb: 'FFF59E0B' } }
        });

        trendSheet.mergeCells('A1:' + String.fromCharCode(65 + sortedTypes.length + 1) + '1');
        trendSheet.getCell('A1').value = 'Dnevni trend po vrstama otpada';
        trendSheet.getCell('A1').font = { bold: true, size: 16 };

        const trendHeaders = ['Datum', ...sortedTypes.map(t => `${t} (kg)`), 'Ukupno (kg)'];
        trendHeaders.forEach((h, idx) => {
            const cell = trendSheet.getCell(3, idx + 1);
            cell.value = h;
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx === 0 ? 'FF64748B' : idx === trendHeaders.length - 1 ? 'FF10B981' : getTypeColor(idx - 1) } };
            cell.alignment = { horizontal: 'center' };
        });

        sortedDates.forEach((date, idx) => {
            const rowNum = 4 + idx;
            const formattedDate = new Date(date).toLocaleDateString('sr-RS');
            let rowTotal = 0;

            trendSheet.getCell(rowNum, 1).value = formattedDate;

            sortedTypes.forEach((type, typeIdx) => {
                const val = dailyData[date]?.[type] || 0;
                rowTotal += val;
                trendSheet.getCell(rowNum, typeIdx + 2).value = val > 0 ? parseFloat(val.toFixed(1)) : 0;
                trendSheet.getCell(rowNum, typeIdx + 2).numFmt = '#,##0.0';
            });

            trendSheet.getCell(rowNum, sortedTypes.length + 2).value = parseFloat(rowTotal.toFixed(1));
            trendSheet.getCell(rowNum, sortedTypes.length + 2).numFmt = '#,##0.0';
            trendSheet.getCell(rowNum, sortedTypes.length + 2).font = { bold: true };
        });

        trendSheet.columns = [
            { width: 15 },
            ...sortedTypes.map(() => ({ width: 15 })),
            { width: 15 },
        ];
    }

    // ===== SHEET 5: DETALJAN PREGLED =====
    if (enabledSheets.detaljno) {
        const detailSheet = workbook.addWorksheet('Detaljan pregled', {
            properties: { tabColor: { argb: 'FF06B6D4' } }
        });

        detailSheet.mergeCells('A1:E1');
        detailSheet.getCell('A1').value = 'Detaljan pregled po klijentu i vrsti';
        detailSheet.getCell('A1').font = { bold: true, size: 16 };

        const detailHeaders = ['Klijent', 'Vrsta otpada', 'Tezina (kg)', 'Tezina (t)', 'Broj zahteva'];
        detailHeaders.forEach((h, idx) => {
            const cell = detailSheet.getCell(3, idx + 1);
            cell.value = h;
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF06B6D4' } };
            cell.alignment = { horizontal: 'center' };
        });

        let currentClient = '';
        detailRows.forEach((row, idx) => {
            const rowNum = 4 + idx;

            if (row.client !== currentClient) {
                currentClient = row.client;
                detailSheet.getCell(rowNum, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
            }

            detailSheet.getCell(rowNum, 1).value = row.client;
            detailSheet.getCell(rowNum, 2).value = row.type;
            detailSheet.getCell(rowNum, 3).value = parseFloat(row.weight.toFixed(1));
            detailSheet.getCell(rowNum, 3).numFmt = '#,##0.0';
            detailSheet.getCell(rowNum, 4).value = parseFloat((row.weight / 1000).toFixed(3));
            detailSheet.getCell(rowNum, 4).numFmt = '#,##0.000';
            detailSheet.getCell(rowNum, 5).value = row.count;
        });

        detailSheet.columns = [
            { width: 30 },
            { width: 20 },
            { width: 15 },
            { width: 15 },
            { width: 15 },
        ];
    }

    // ===== SHEET 6: LISTA ZAHTEVA =====
    if (enabledSheets.sviZahtevi) {
        const listSheet = workbook.addWorksheet('Svi zahtevi', {
            properties: { tabColor: { argb: 'FF64748B' } }
        });

        listSheet.mergeCells('A1:E1');
        listSheet.getCell('A1').value = 'Kompletna lista obradjenih zahteva';
        listSheet.getCell('A1').font = { bold: true, size: 16 };

        const listHeaders = ['Datum', 'Klijent', 'Vrsta otpada', 'Tezina (kg)', 'Tezina (t)'];
        listHeaders.forEach((h, idx) => {
            const cell = listSheet.getCell(3, idx + 1);
            cell.value = h;
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF64748B' } };
            cell.alignment = { horizontal: 'center' };
        });

        sortedData.forEach((r, idx) => {
            const rowNum = 4 + idx;
            const date = new Date(r.processed_at).toLocaleDateString('sr-RS');
            const weightKg = r.weight_unit === 't' ? r.weight * 1000 : r.weight;

            listSheet.getCell(rowNum, 1).value = date;
            listSheet.getCell(rowNum, 2).value = r.client_name || 'Nepoznat';
            listSheet.getCell(rowNum, 3).value = r.waste_label || r.waste_type || 'Nepoznato';
            listSheet.getCell(rowNum, 4).value = parseFloat(weightKg.toFixed(1));
            listSheet.getCell(rowNum, 4).numFmt = '#,##0.0';
            listSheet.getCell(rowNum, 5).value = parseFloat((weightKg / 1000).toFixed(3));
            listSheet.getCell(rowNum, 5).numFmt = '#,##0.000';

            if (idx % 2 === 1) {
                for (let col = 1; col <= 5; col++) {
                    listSheet.getCell(rowNum, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                }
            }
        });

        listSheet.columns = [
            { width: 15 },
            { width: 30 },
            { width: 20 },
            { width: 15 },
            { width: 15 },
        ];
    }

    // ===== SHEET 7: GRAFICI (Chart Images) =====
    if (enabledSheets.grafici) {
        const imageSheet = workbook.addWorksheet('Grafici', {
            properties: { tabColor: { argb: 'FF10B981' } }
        });

        imageSheet.mergeCells('A1:L1');
        imageSheet.getCell('A1').value = 'Vizuelni dijagrami - Analitika';
        imageSheet.getCell('A1').font = { bold: true, size: 20, color: { argb: 'FF10B981' } };
        imageSheet.getCell('A1').alignment = { horizontal: 'center' };

        // Generate PIE CHART image
        const pieChartBase64 = generatePieChart(typeRows.slice(0, 8), totalWeight);
        if (pieChartBase64) {
            const pieImageId = workbook.addImage({
                base64: pieChartBase64,
                extension: 'png',
            });
            imageSheet.addImage(pieImageId, {
                tl: { col: 0, row: 2 },
                ext: { width: 500, height: 350 }
            });
        }

        imageSheet.getCell('A20').value = 'Tezina po vrsti otpada';
        imageSheet.getCell('A20').font = { bold: true, size: 12 };

        // Generate BAR CHART image
        const barChartBase64 = generateBarChart(clientRows.slice(0, 8), totalWeight);
        if (barChartBase64) {
            const barImageId = workbook.addImage({
                base64: barChartBase64,
                extension: 'png',
            });
            imageSheet.addImage(barImageId, {
                tl: { col: 7, row: 2 },
                ext: { width: 500, height: 350 }
            });
        }

        imageSheet.getCell('H20').value = 'Tezina po klijentu';
        imageSheet.getCell('H20').font = { bold: true, size: 12 };

        // Generate LINE CHART image
        const lineChartBase64 = generateLineChart(sortedDates.slice(-14), sortedTypes, dailyData);
        if (lineChartBase64) {
            const lineImageId = workbook.addImage({
                base64: lineChartBase64,
                extension: 'png',
            });
            imageSheet.addImage(lineImageId, {
                tl: { col: 0, row: 22 },
                ext: { width: 900, height: 350 }
            });
        }

        imageSheet.getCell('A42').value = 'Dnevni trend po vrstama otpada';
        imageSheet.getCell('A42').font = { bold: true, size: 12 };

        imageSheet.columns = Array(14).fill({ width: 10 });
    }

    // Generate file and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
};

// Helper function to format weight
function formatWeight(kg) {
    if (kg >= 1000) {
        return `${(kg / 1000).toFixed(2)} t`;
    }
    if (kg >= 100) {
        return `${kg.toFixed(0)} kg`;
    }
    return `${kg.toFixed(1)} kg`;
}

/**
 * Generate a Pie Chart as PNG base64
 */
function generatePieChart(typeRows, totalWeight) {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 500;
        canvas.height = 350;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 500, 350);

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Tezina po vrsti otpada', 200, 25);

        const centerX = 180;
        const centerY = 180;
        const radius = 120;
        let startAngle = -Math.PI / 2;

        typeRows.forEach((row, idx) => {
            const sliceAngle = (row.weightKg / totalWeight) * 2 * Math.PI;
            const endAngle = startAngle + sliceAngle;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = CHART_COLORS[idx % CHART_COLORS.length];
            ctx.fill();

            if (row.percent > 5) {
                const midAngle = startAngle + sliceAngle / 2;
                const labelX = centerX + Math.cos(midAngle) * (radius * 0.65);
                const labelY = centerY + Math.sin(midAngle) * (radius * 0.65);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 11px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`${row.percent.toFixed(0)}%`, labelX, labelY + 4);
            }

            startAngle = endAngle;
        });

        const legendX = 330;
        let legendY = 60;
        ctx.font = '11px Arial';
        ctx.textAlign = 'left';

        typeRows.slice(0, 8).forEach((row, idx) => {
            ctx.fillStyle = CHART_COLORS[idx % CHART_COLORS.length];
            ctx.fillRect(legendX, legendY - 10, 14, 14);

            ctx.fillStyle = '#475569';
            const label = row.type.length > 12 ? row.type.substring(0, 12) + '...' : row.type;
            ctx.fillText(`${label}`, legendX + 20, legendY);

            legendY += 22;
        });

        return canvas.toDataURL('image/png').split(',')[1];
    } catch (e) {
        console.error('Pie chart generation error:', e);
        return null;
    }
}

/**
 * Generate a Bar Chart as PNG base64
 */
function generateBarChart(clientRows, totalWeight) {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 500;
        canvas.height = 350;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 500, 350);

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Tezina po klijentu', 250, 25);

        const maxWeight = Math.max(...clientRows.map(r => r.weightKg), 1);
        const barHeight = 28;
        const chartLeft = 130;
        const chartWidth = 320;
        const chartTop = 50;

        clientRows.slice(0, 8).forEach((row, idx) => {
            const y = chartTop + idx * (barHeight + 8);
            const barWidth = (row.weightKg / maxWeight) * chartWidth;

            ctx.fillStyle = '#475569';
            ctx.font = '11px Arial';
            ctx.textAlign = 'right';
            const name = row.client.length > 15 ? row.client.substring(0, 15) + '...' : row.client;
            ctx.fillText(name, chartLeft - 10, y + barHeight / 2 + 4);

            const gradient = ctx.createLinearGradient(chartLeft, y, chartLeft + barWidth, y);
            gradient.addColorStop(0, CHART_COLORS[idx % CHART_COLORS.length]);
            gradient.addColorStop(1, CHART_COLORS[idx % CHART_COLORS.length] + '99');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(chartLeft, y, barWidth, barHeight, 4);
            } else {
                ctx.rect(chartLeft, y, barWidth, barHeight);
            }
            ctx.fill();

            ctx.fillStyle = '#64748b';
            ctx.font = '10px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(formatWeight(row.weightKg), chartLeft + barWidth + 8, y + barHeight / 2 + 4);
        });

        return canvas.toDataURL('image/png').split(',')[1];
    } catch (e) {
        console.error('Bar chart generation error:', e);
        return null;
    }
}

/**
 * Generate a Line Chart as PNG base64
 */
function generateLineChart(dates, types, dailyData) {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 900;
        canvas.height = 350;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 900, 350);

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Dnevni trend po vrstama otpada', 450, 25);

        if (dates.length === 0) return null;

        const padding = { top: 50, right: 150, bottom: 60, left: 70 };
        const chartWidth = 900 - padding.left - padding.right;
        const chartHeight = 350 - padding.top - padding.bottom;

        let maxValue = 0;
        dates.forEach(date => {
            types.forEach(type => {
                const val = dailyData[date]?.[type] || 0;
                if (val > maxValue) maxValue = val;
            });
        });
        maxValue = maxValue * 1.1 || 100;

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.font = '10px Arial';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'right';

        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartHeight * (4 - i) / 4);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(900 - padding.right, y);
            ctx.stroke();

            const val = (maxValue * i) / 4;
            ctx.fillText(formatWeight(val), padding.left - 10, y + 4);
        }
        ctx.setLineDash([]);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#64748b';
        dates.forEach((date, i) => {
            if (dates.length > 10 && i % 2 !== 0 && i !== dates.length - 1) return;
            const x = padding.left + (i / Math.max(dates.length - 1, 1)) * chartWidth;
            const label = new Date(date).toLocaleDateString('sr-RS', { day: 'numeric', month: 'numeric' });
            ctx.fillText(label, x, 350 - 25);
        });

        types.forEach((type, typeIdx) => {
            const color = CHART_COLORS[typeIdx % CHART_COLORS.length];

            ctx.beginPath();
            dates.forEach((date, i) => {
                const x = padding.left + (i / Math.max(dates.length - 1, 1)) * chartWidth;
                const val = dailyData[date]?.[type] || 0;
                const y = padding.top + chartHeight - (val / maxValue) * chartHeight;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
            ctx.lineTo(padding.left, padding.top + chartHeight);
            ctx.closePath();
            ctx.fillStyle = color + '22';
            ctx.fill();

            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            dates.forEach((date, i) => {
                const x = padding.left + (i / Math.max(dates.length - 1, 1)) * chartWidth;
                const val = dailyData[date]?.[type] || 0;
                const y = padding.top + chartHeight - (val / maxValue) * chartHeight;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();

            dates.forEach((date, i) => {
                const x = padding.left + (i / Math.max(dates.length - 1, 1)) * chartWidth;
                const val = dailyData[date]?.[type] || 0;
                const y = padding.top + chartHeight - (val / maxValue) * chartHeight;

                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.stroke();
            });
        });

        const legendX = 900 - padding.right + 20;
        let legendY = padding.top + 10;
        ctx.font = '11px Arial';
        ctx.textAlign = 'left';

        types.slice(0, 8).forEach((type, idx) => {
            ctx.strokeStyle = CHART_COLORS[idx % CHART_COLORS.length];
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(legendX, legendY);
            ctx.lineTo(legendX + 20, legendY);
            ctx.stroke();

            ctx.fillStyle = '#475569';
            const label = type.length > 12 ? type.substring(0, 12) + '...' : type;
            ctx.fillText(label, legendX + 28, legendY + 4);

            legendY += 24;
        });

        return canvas.toDataURL('image/png').split(',')[1];
    } catch (e) {
        console.error('Line chart generation error:', e);
        return null;
    }
}
