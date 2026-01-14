import { useState } from 'react';
import { CheckCircle2, RefreshCw, Send } from 'lucide-react';

const WASTE_TYPES = [
    { id: 'cardboard', label: 'Karton', icon: '📦' },
    { id: 'plastic', label: 'Plastika', icon: '♻️' },
    { id: 'glass', label: 'Staklo', icon: '🍾' },
];

export const NewRequestForm = ({ onSubmit, loading, wasteTypes = WASTE_TYPES }) => {
    console.log('DEBUG NewRequestForm - wasteTypes:', wasteTypes);
    const [wasteType, setWasteType] = useState(null);
    const [fillLevel, setFillLevel] = useState(null);
    const [urgency, setUrgency] = useState(null);
    const [note, setNote] = useState('');

    return (
        <div className="space-y-6 bg-white rounded-2xl p-6 border">
            <div>
                <h3 className="font-semibold mb-4">Vrsta Robe</h3>
                <div className={`grid gap-3 ${wasteTypes.length === 1 ? 'grid-cols-1 md:grid-cols-1' :
                    wasteTypes.length === 2 ? 'grid-cols-2 md:grid-cols-2' :
                        wasteTypes.length === 3 ? 'grid-cols-3 md:grid-cols-3' :
                            wasteTypes.length === 4 ? 'grid-cols-2 md:grid-cols-4' :
                                'grid-cols-3 md:grid-cols-5'
                    }`}>
                    {wasteTypes.map(w => (
                        <button
                            key={w.id}
                            onClick={() => setWasteType(w.id)}
                            className={`relative group overflow-hidden rounded-xl border-2 transition-all duration-200 ${wasteType === w.id ? 'border-emerald-500 ring-2 ring-emerald-500 ring-offset-2' : 'border-slate-200 hover:border-emerald-300'
                                } ${w.customImage ? 'h-32 p-0' : 'h-32 p-4 flex flex-col items-center justify-center'}`}
                        >
                            {w.customImage ? (
                                <>
                                    <img src={w.customImage} alt={w.label} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    <div className={`absolute inset-0 flex items-end justify-center p-2 ${wasteType === w.id ? 'bg-black/40' : 'bg-black/20 group-hover:bg-black/30'}`}>
                                        <span className="text-white text-sm font-bold drop-shadow-md text-center leading-tight">{w.label}</span>
                                    </div>
                                    {wasteType === w.id && (
                                        <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full shadow-lg">
                                            <CheckCircle2 size={14} />
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <span className="text-4xl block mb-2 filter drop-shadow-sm transition-transform duration-200 group-hover:scale-110">{w.icon}</span>
                                    <span className={`text-sm font-medium text-center ${wasteType === w.id ? 'text-emerald-700' : 'text-slate-600'}`}>{w.label}</span>
                                </>
                            )}
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <h3 className="font-semibold mb-4">Popunjenost</h3>
                <div className="grid grid-cols-3 gap-3">
                    {[50, 75, 100].map(v => (
                        <button key={v} onClick={() => setFillLevel(v)} className={`p-4 rounded-xl border-2 text-center ${fillLevel === v ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>
                            <span className="text-lg font-bold">{v}%</span>
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <h3 className="font-semibold mb-4">Hitnost</h3>
                <div className="grid grid-cols-3 gap-3">
                    {[{ v: '24h', l: 'Hitno', h: '24h', c: 'red' }, { v: '48h', l: 'Srednje', h: '48h', c: 'amber' }, { v: '72h', l: 'Normalno', h: '72h', c: 'emerald' }].map(u => (
                        <button key={u.v} onClick={() => setUrgency(u.v)} className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-1 ${urgency === u.v ? `border-${u.c}-500 bg-${u.c}-50` : 'border-slate-200'}`}>
                            <span className="text-sm font-bold block">{u.l}</span>
                            <span className={`text-xs ${urgency === u.v ? `text-${u.c}-700` : 'text-slate-500'}`}>({u.h})</span>
                        </button>
                    ))}
                </div>
            </div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Napomena (opciono)" className="w-full p-4 border rounded-xl" rows={2} />
            <button onClick={() => wasteType && fillLevel && urgency && onSubmit({ wasteType, wasteLabel: wasteTypes.find(w => w.id === wasteType)?.label, fillLevel, urgency, note })} disabled={loading || !wasteType || !fillLevel || !urgency} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium py-4 rounded-xl flex items-center justify-center gap-2">
                {loading ? <RefreshCw className="animate-spin" size={20} /> : <><Send size={20} /> Pošalji</>}
            </button>
        </div>
    );
};

export default NewRequestForm;
