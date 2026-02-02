import { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, X, Users } from 'lucide-react';
import { Modal, RecycleLoader } from '../common';
import { normalizePhone, validatePhone, COUNTRY_CODES } from '../../utils/phoneUtils';
import * as XLSX from 'xlsx';

/**
 * ImportClientsModal - Modal for importing clients from Excel
 * Creates "Shadow Contacts" (users with auth_id = NULL) that can be claimed later
 */
export const ImportClientsModal = ({ open, onClose, onImport, companyCode, existingPhones = [] }) => {
    const [step, setStep] = useState('upload'); // 'upload', 'preview', 'importing', 'done'
    const [parsedData, setParsedData] = useState([]);
    const [errors, setErrors] = useState([]);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [defaultCountryCode, setDefaultCountryCode] = useState('+381');
    const fileInputRef = useRef(null);

    // Generate Excel template for download
    const handleDownloadTemplate = () => {
        // Create worksheet with headers first
        const headers = ['Ime i Prezime', 'Telefon', 'Pozivni Broj', 'Adresa', 'Napomena'];
        const exampleRow = ['Primer: Petar Petrović', '0641234567', '+381', 'Knez Mihailova 5, Beograd', 'VIP klijent'];

        // Create worksheet from array of arrays (gives more control over formatting)
        const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);

        // Set column widths
        ws['!cols'] = [
            { wch: 25 }, // Ime
            { wch: 18 }, // Telefon
            { wch: 14 }, // Pozivni
            { wch: 35 }, // Adresa
            { wch: 20 }  // Napomena
        ];

        // Format phone and country code columns as TEXT to preserve leading zeros and + sign
        // Column B (Telefon) - cells B1, B2, B3, etc.
        // Column C (Pozivni Broj) - cells C1, C2, C3, etc.

        // Set format for example row and add some empty rows with text format
        const textFormat = { t: 's' }; // 's' = string/text type

        // Format the example row cells as text
        if (ws['B2']) ws['B2'] = { v: '0641234567', t: 's' };
        if (ws['C2']) ws['C2'] = { v: '+381', t: 's' };

        // Add 10 empty rows with proper text formatting for user to fill in
        for (let row = 3; row <= 12; row++) {
            // Set all cells in the row, with B and C explicitly as text
            ws[`A${row}`] = { v: '', t: 's' };
            ws[`B${row}`] = { v: '', t: 's' }; // Telefon - TEXT
            ws[`C${row}`] = { v: '', t: 's' }; // Pozivni - TEXT
            ws[`D${row}`] = { v: '', t: 's' };
            ws[`E${row}`] = { v: '', t: 's' };
        }

        // Update the range to include all rows
        ws['!ref'] = 'A1:E12';

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Klijenti');

        XLSX.writeFile(wb, 'eco_import_klijenti_sablon.xlsx');
    };

    // Parse uploaded Excel file
    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            // Parse and validate each row
            const parsed = [];
            const errs = [];

            // Create a set of existing phones for quick lookup
            const existingPhonesSet = new Set(existingPhones.map(p => normalizePhone(p)));

            jsonData.forEach((row, index) => {
                // Map column names (support both Serbian and English)
                const name = row['Ime i Prezime'] || row['Ime'] || row['Name'] || '';
                const phone = row['Telefon'] || row['Phone'] || '';
                const countryCode = row['Pozivni Broj'] || row['Pozivni'] || row['Country Code'] || defaultCountryCode;
                const address = row['Adresa'] || row['Address'] || '';
                const note = row['Napomena'] || row['Note'] || '';

                // Skip empty rows or example/template row
                if (!name || !phone || name.toLowerCase().includes('primer')) {
                    return;
                }

                const normalizedPhone = normalizePhone(phone, countryCode);
                const validation = validatePhone(phone, countryCode);

                let status = 'ok';
                let statusMessage = '';

                if (!validation.valid) {
                    status = 'error';
                    statusMessage = validation.error;
                    errs.push(`Red ${index + 2}: ${validation.error}`);
                } else if (existingPhonesSet.has(normalizedPhone)) {
                    status = 'duplicate';
                    statusMessage = 'Već postoji';
                }

                // Also check for duplicates within this import
                const alreadyInParsed = parsed.find(p => p.normalizedPhone === normalizedPhone);
                if (alreadyInParsed) {
                    status = 'duplicate';
                    statusMessage = 'Duplikat u fajlu';
                }

                parsed.push({
                    id: `import-${index}`,
                    name: name.trim(),
                    phone: phone.trim(),
                    countryCode,
                    normalizedPhone,
                    address: address.trim(),
                    note: note.trim(),
                    status,
                    statusMessage,
                    selected: status === 'ok'
                });

                if (status === 'ok') {
                    existingPhonesSet.add(normalizedPhone);
                }
            });

            setParsedData(parsed);
            setErrors(errs);
            setStep('preview');
        } catch (err) {
            console.error('Error parsing Excel:', err);
            setErrors(['Greška pri čitanju fajla. Proverite da li je validan Excel fajl.']);
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Toggle selection for a row
    const toggleSelection = (id) => {
        setParsedData(prev => prev.map(row =>
            row.id === id ? { ...row, selected: !row.selected } : row
        ));
    };

    // Get counts
    const validCount = parsedData.filter(r => r.status === 'ok').length;
    const selectedCount = parsedData.filter(r => r.selected).length;
    const duplicateCount = parsedData.filter(r => r.status === 'duplicate').length;
    const errorCount = parsedData.filter(r => r.status === 'error').length;

    // Handle import
    const handleImport = async () => {
        const toImport = parsedData.filter(r => r.selected);
        if (toImport.length === 0) return;

        setImporting(true);
        setStep('importing');

        try {
            const clientsToCreate = toImport.map(row => ({
                name: row.name,
                phone: row.normalizedPhone,
                address: row.address || null,
                note: row.note || null
            }));

            const result = await onImport(clientsToCreate);
            setImportResult(result);
            setStep('done');
        } catch (err) {
            console.error('Import error:', err);
            setErrors([`Greška pri importu: ${err.message}`]);
            setStep('preview');
        } finally {
            setImporting(false);
        }
    };

    // Reset and close
    const handleClose = () => {
        setStep('upload');
        setParsedData([]);
        setErrors([]);
        setImportResult(null);
        onClose();
    };

    return (
        <Modal open={open} onClose={handleClose} title="Importuj klijente">
            <div className="space-y-4">
                {/* Step: Upload */}
                {step === 'upload' && (
                    <>
                        <p className="text-sm text-slate-600">
                            Importujte klijente iz Excel fajla. Kreirani nalozi će biti "Shadow" nalozi
                            - klijenti će moći da ih preuzmu kada instaliraju aplikaciju.
                        </p>

                        {/* Default country code */}
                        <div>
                            <label className="text-sm text-slate-600 mb-1 block">Podrazumevani pozivni broj</label>
                            <select
                                value={defaultCountryCode}
                                onChange={(e) => setDefaultCountryCode(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                            >
                                {COUNTRY_CODES.map(cc => (
                                    <option key={cc.code} value={cc.code}>
                                        {cc.flag} {cc.name} ({cc.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Download template */}
                        <button
                            onClick={handleDownloadTemplate}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 font-medium transition-colors"
                        >
                            <Download size={18} />
                            Preuzmi Excel šablon
                        </button>

                        {/* Upload file */}
                        <div className="relative">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <div className="flex items-center justify-center gap-2 px-4 py-8 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border-2 border-dashed border-slate-300 cursor-pointer transition-colors">
                                <Upload size={24} />
                                <span>Prevuci fajl ovde ili klikni za upload</span>
                            </div>
                        </div>

                        {/* Errors */}
                        {errors.length > 0 && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                                {errors.map((err, i) => (
                                    <p key={i} className="text-sm text-red-700 flex items-center gap-2">
                                        <AlertCircle size={14} /> {err}
                                    </p>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* Step: Preview */}
                {step === 'preview' && (
                    <>
                        {/* Summary */}
                        <div className="flex flex-wrap gap-3 text-sm">
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                                ✅ {validCount} validnih
                            </span>
                            {duplicateCount > 0 && (
                                <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full">
                                    ⚠️ {duplicateCount} duplikata
                                </span>
                            )}
                            {errorCount > 0 && (
                                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full">
                                    ❌ {errorCount} grešaka
                                </span>
                            )}
                        </div>

                        {/* Preview table */}
                        <div className="max-h-64 overflow-auto border rounded-xl">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2 text-left w-10">
                                            <input
                                                type="checkbox"
                                                checked={selectedCount === validCount && validCount > 0}
                                                onChange={() => {
                                                    const allSelected = selectedCount === validCount;
                                                    setParsedData(prev => prev.map(r => ({
                                                        ...r,
                                                        selected: r.status === 'ok' ? !allSelected : false
                                                    })));
                                                }}
                                                className="rounded"
                                            />
                                        </th>
                                        <th className="px-3 py-2 text-left">Ime</th>
                                        <th className="px-3 py-2 text-left">Telefon</th>
                                        <th className="px-3 py-2 text-left">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {parsedData.map(row => (
                                        <tr
                                            key={row.id}
                                            className={`${row.status === 'error' ? 'bg-red-50' : row.status === 'duplicate' ? 'bg-amber-50' : ''}`}
                                        >
                                            <td className="px-3 py-2">
                                                <input
                                                    type="checkbox"
                                                    checked={row.selected}
                                                    onChange={() => toggleSelection(row.id)}
                                                    disabled={row.status !== 'ok'}
                                                    className="rounded"
                                                />
                                            </td>
                                            <td className="px-3 py-2 font-medium">{row.name}</td>
                                            <td className="px-3 py-2 text-slate-600">{row.normalizedPhone}</td>
                                            <td className="px-3 py-2">
                                                {row.status === 'ok' && (
                                                    <span className="text-emerald-600 flex items-center gap-1">
                                                        <CheckCircle2 size={14} /> OK
                                                    </span>
                                                )}
                                                {row.status === 'duplicate' && (
                                                    <span className="text-amber-600">{row.statusMessage}</span>
                                                )}
                                                {row.status === 'error' && (
                                                    <span className="text-red-600">{row.statusMessage}</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setStep('upload'); setParsedData([]); setErrors([]); }}
                                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium"
                            >
                                Nazad
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={selectedCount === 0}
                                className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                            >
                                <Users size={18} />
                                Importuj {selectedCount} klijent{selectedCount === 1 ? 'a' : 'a'}
                            </button>
                        </div>
                    </>
                )}

                {/* Step: Importing */}
                {step === 'importing' && (
                    <div className="flex flex-col items-center justify-center py-8">
                        <RecycleLoader size={48} className="text-emerald-600 mb-4" />
                        <p className="text-lg font-medium text-slate-700">Importujem klijente...</p>
                        <p className="text-sm text-slate-500">Molimo sačekajte</p>
                    </div>
                )}

                {/* Step: Done */}
                {step === 'done' && importResult && (
                    <div className="text-center py-4">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 size={32} className="text-emerald-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Import završen!</h3>
                        <p className="text-slate-600 mb-4">
                            Uspešno importovano <strong>{importResult.created}</strong> klijent{importResult.created === 1 ? '' : 'a'}.
                        </p>
                        {importResult.skipped > 0 && (
                            <p className="text-sm text-amber-600">
                                Preskočeno {importResult.skipped} zbog grešaka.
                            </p>
                        )}
                        <button
                            onClick={handleClose}
                            className="mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium"
                        >
                            Zatvori
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ImportClientsModal;
