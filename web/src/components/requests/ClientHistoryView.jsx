import { useState, useEffect } from 'react';
import { History, Loader2, Search, X, ArrowUp, ArrowDown, Send, CheckCircle2, Image, ChevronDown, Download, EyeOff } from 'lucide-react';
import { Modal, FillLevelBar } from '../common';

/**
 * Client History View - Shows past processed requests with pagination and search
 */
export const ClientHistoryView = ({ history, loading, wasteTypes, onHide }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortBy, setSortBy] = useState('processed_at'); // processed_at, created_at, type
    const [sortDir, setSortDir] = useState('desc');
    const [viewingProof, setViewingProof] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [hidingId, setHidingId] = useState(null);
    const itemsPerPage = 10;

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border p-12 text-center">
                <Loader2 size={40} className="mx-auto text-emerald-500 mb-4 animate-spin" />
                <p className="text-slate-500">Učitavanje istorije...</p>
            </div>
        );
    }

    if (!history?.length) {
        return (
            <div className="bg-white rounded-2xl border p-12 text-center">
                <History size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">Nema istorije</h3>
                <p className="text-slate-500">Vaši obrađeni zahtevi će se pojaviti ovde</p>
            </div>
        );
    }

    // Filter by search query
    const filtered = searchQuery.trim()
        ? history.filter(r => {
            const query = searchQuery.toLowerCase();
            return (
                (r.waste_label || '').toLowerCase().includes(query) ||
                (r.waste_type || '').toLowerCase().includes(query) ||
                (r.note || '').toLowerCase().includes(query) ||
                (r.processing_note || '').toLowerCase().includes(query) ||
                (r.request_code || '').toLowerCase().includes(query) ||
                new Date(r.processed_at).toLocaleDateString('sr-RS').includes(query) ||
                new Date(r.created_at).toLocaleDateString('sr-RS').includes(query)
            );
        })
        : history;

    const sorted = [...filtered].sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'processed_at') cmp = new Date(b.processed_at) - new Date(a.processed_at);
        else if (sortBy === 'created_at') cmp = new Date(b.created_at) - new Date(a.created_at);
        else if (sortBy === 'type') cmp = (a.waste_label || '').localeCompare(b.waste_label || '');
        return sortDir === 'desc' ? cmp : -cmp;
    });

    const totalPages = Math.ceil(sorted.length / itemsPerPage);
    const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const toggleSort = (key) => {
        if (sortBy === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        else { setSortBy(key); setSortDir('desc'); }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border overflow-hidden">
                <div className="p-4 border-b bg-slate-50 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h2 className="font-bold text-lg">Istorija zahteva ({filtered.length}{searchQuery && ` od ${history.length}`})</h2>
                        <div className="flex gap-2">
                            {[{ key: 'processed_at', label: 'Datum obrade' }, { key: 'created_at', label: 'Datum zahteva' }, { key: 'type', label: 'Tip' }].map(s => (
                                <button
                                    key={s.key}
                                    onClick={() => toggleSort(s.key)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${sortBy === s.key ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    {s.label}
                                    {sortBy === s.key && (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Pretraži po tipu, datumu, napomeni..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
                <div className="divide-y">
                    {paginated.map((r, idx) => (
                        <div key={r.id || idx} className="p-5 hover:bg-slate-50 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center text-3xl">
                                        {wasteTypes.find(w => w.id === r.waste_type)?.icon || '📦'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            {r.request_code && (
                                                <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 text-xs font-mono rounded font-medium">
                                                    {r.request_code}
                                                </span>
                                            )}
                                            <h4 className="font-semibold text-slate-800 text-lg">{r.waste_label || r.waste_type}</h4>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Send size={14} className="text-blue-500" />
                                                Podneto: {new Date(r.created_at).toLocaleDateString('sr-RS', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <CheckCircle2 size={14} className="text-emerald-500" />
                                                Obrađeno: {new Date(r.processed_at).toLocaleDateString('sr-RS', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        {r.note && <p className="text-sm text-slate-400 mt-2 italic">"{r.note}"</p>}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-100 text-emerald-700 flex items-center gap-2">
                                        <CheckCircle2 size={16} /> Obrađeno
                                    </span>
                                    {(r.fill_level !== null && r.fill_level !== undefined) && (
                                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full">
                                            <span className="text-xs text-slate-500">Bilo:</span>
                                            <FillLevelBar fillLevel={r.fill_level} />
                                        </div>
                                    )}
                                    {r.proof_image_url && (
                                        <button
                                            onClick={() => setViewingProof(r)}
                                            className="px-3 py-1.5 text-xs font-medium rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1"
                                        >
                                            <Image size={14} /> Dokaz
                                        </button>
                                    )}
                                    {onHide && (
                                        <button
                                            onClick={async () => {
                                                if (!window.confirm('Sakriti ovaj zahtev iz istorije? Možete ga ponovo videti samo kontaktiranjem podrške.')) return;
                                                setHidingId(r.id);
                                                try {
                                                    await onHide(r.id);
                                                } catch (err) {
                                                    alert('Greška: ' + (err.message || 'Pokušajte ponovo'));
                                                } finally {
                                                    setHidingId(null);
                                                }
                                            }}
                                            disabled={hidingId === r.id}
                                            className="px-3 py-1.5 text-xs font-medium rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 flex items-center gap-1 disabled:opacity-50"
                                            title="Sakrij iz istorije"
                                        >
                                            {hidingId === r.id ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <EyeOff size={14} />
                                            )}
                                            Sakrij
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Proof Image/PDF Modal */}
            {viewingProof && (
                <Modal open={!!viewingProof} onClose={() => setViewingProof(null)} title="Dokaz o izvršenoj usluzi">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <span className="text-2xl">{wasteTypes.find(w => w.id === viewingProof.waste_type)?.icon}</span>
                            <div>
                                <p className="font-medium">{viewingProof.waste_label}</p>
                                <p className="text-xs text-slate-500">
                                    Obrađeno: {new Date(viewingProof.processed_at).toLocaleDateString('sr-RS', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>

                        {/* Check if PDF or Image */}
                        {viewingProof.proof_image_url?.toLowerCase().endsWith('.pdf') ? (
                            <div className="border rounded-xl overflow-hidden">
                                <iframe
                                    src={viewingProof.proof_image_url}
                                    className="w-full h-96"
                                    title="PDF Dokaz"
                                />
                            </div>
                        ) : (
                            <img
                                src={viewingProof.proof_image_url}
                                alt="Dokaz o izvršenoj usluzi"
                                className="w-full rounded-xl"
                            />
                        )}

                        {viewingProof.processing_note && (
                            <div className="p-3 bg-amber-50 rounded-xl">
                                <p className="text-xs text-amber-600 mb-1">Napomena pri obradi</p>
                                <p className="text-sm">{viewingProof.processing_note}</p>
                            </div>
                        )}

                        {/* Download button */}
                        <a
                            href={viewingProof.proof_image_url}
                            download={`dokaz_${viewingProof.id || Date.now()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium transition-colors"
                        >
                            <Download size={18} />
                            Preuzmi dokaz
                        </a>
                    </div>
                </Modal>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 bg-white rounded-2xl border p-4">
                    <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 rounded-xl border bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                        <ChevronDown size={16} className="rotate-90" /> Prethodna
                    </button>
                    <div className="flex items-center gap-1">
                        {/* Smart pagination: show limited pages with ellipsis */}
                        {(() => {
                            const pages = [];
                            const showPages = 5;
                            let start = Math.max(1, currentPage - Math.floor(showPages / 2));
                            let end = Math.min(totalPages, start + showPages - 1);
                            if (end - start + 1 < showPages) {
                                start = Math.max(1, end - showPages + 1);
                            }

                            if (start > 1) {
                                pages.push(
                                    <button key={1} onClick={() => setCurrentPage(1)} className="w-10 h-10 rounded-xl font-medium bg-white border text-slate-600 hover:bg-slate-50">1</button>
                                );
                                if (start > 2) pages.push(<span key="start-dots" className="px-1 text-slate-400">...</span>);
                            }

                            for (let i = start; i <= end; i++) {
                                pages.push(
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(i)}
                                        className={`w-10 h-10 rounded-xl font-medium transition-colors ${currentPage === i ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        {i}
                                    </button>
                                );
                            }

                            if (end < totalPages) {
                                if (end < totalPages - 1) pages.push(<span key="end-dots" className="px-1 text-slate-400">...</span>);
                                pages.push(
                                    <button key={totalPages} onClick={() => setCurrentPage(totalPages)} className="w-10 h-10 rounded-xl font-medium bg-white border text-slate-600 hover:bg-slate-50">{totalPages}</button>
                                );
                            }

                            return pages;
                        })()}
                    </div>
                    <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 rounded-xl border bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                        Sledeća <ChevronDown size={16} className="-rotate-90" />
                    </button>
                    <span className="text-sm text-slate-500 ml-2">
                        Stranica {currentPage} od {totalPages}
                    </span>
                </div>
            )}

            {/* No results message */}
            {filtered.length === 0 && searchQuery && (
                <div className="bg-white rounded-2xl border p-8 text-center">
                    <Search size={40} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-600 font-medium">Nema rezultata za "{searchQuery}"</p>
                    <button onClick={() => setSearchQuery('')} className="mt-3 text-emerald-600 hover:underline text-sm">
                        Obriši pretragu
                    </button>
                </div>
            )}
        </div>
    );
};

export default ClientHistoryView;
