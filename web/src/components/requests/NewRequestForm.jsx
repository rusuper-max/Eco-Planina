import { useState, useMemo } from 'react';
import { CheckCircle2, RefreshCw, Send } from 'lucide-react';

const WASTE_TYPES = [
    { id: 'cardboard', label: 'Karton', icon: '📦' },
    { id: 'plastic', label: 'Plastika', icon: '♻️' },
    { id: 'glass', label: 'Staklo', icon: '🍾' },
];

// Funkcija za boju na osnovu popunjenosti (0-100)
const getFillLevelStyle = (value) => {
    if (value <= 25) return { color: '#10b981', bgLight: '#d1fae5' }; // emerald
    if (value <= 50) return { color: '#84cc16', bgLight: '#ecfccb' }; // lime
    if (value <= 75) return { color: '#f59e0b', bgLight: '#fef3c7' }; // amber
    return { color: '#ef4444', bgLight: '#fee2e2' }; // red
};

export const NewRequestForm = ({ onSubmit, loading, wasteTypes = WASTE_TYPES }) => {
    const [wasteType, setWasteType] = useState(null);
    const [fillLevel, setFillLevel] = useState(50); // Default 50%
    const [note, setNote] = useState('');

    // Stil za trenutni nivo popunjenosti
    const fillStyle = useMemo(() => getFillLevelStyle(fillLevel), [fillLevel]);

    // Labela za nivo popunjenosti
    const getFillLabel = (value) => {
        if (value <= 25) return 'Skoro prazan';
        if (value <= 50) return 'Polupun';
        if (value <= 75) return 'Skoro pun';
        return 'Potpuno pun';
    };

    return (
        <div className="space-y-6 bg-white rounded-2xl p-6 border">
            {/* Vrsta robe */}
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
                                    <img src={`${w.customImage}${w.customImage.includes('?') ? '&' : '?'}v=${w.updated_at || Date.now()}`} alt={w.label} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
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

            {/* Popunjenost - Slider */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Popunjenost kontejnera</h3>
                    <div
                        className="px-3 py-1 rounded-full text-sm font-bold"
                        style={{ backgroundColor: fillStyle.bgLight, color: fillStyle.color }}
                    >
                        {fillLevel}% - {getFillLabel(fillLevel)}
                    </div>
                </div>

                {/* Custom slider sa gradijentom */}
                <div className="relative pt-2 pb-6">
                    {/* Pozadinski gradient bar */}
                    <div className="h-3 rounded-full bg-gradient-to-r from-emerald-400 via-yellow-400 via-orange-400 to-red-500 shadow-inner" />

                    {/* Slider input - native range sa stilizacijom */}
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={fillLevel}
                        onChange={(e) => setFillLevel(parseInt(e.target.value))}
                        className="absolute top-0 left-0 w-full h-7 opacity-0 cursor-pointer z-10"
                    />

                    {/* Thumb indicator - glatka animacija */}
                    <div
                        className="absolute top-[-2px] w-7 h-7 rounded-full bg-white border-[3px] shadow-lg transform -translate-x-1/2 pointer-events-none"
                        style={{
                            left: `${fillLevel}%`,
                            borderColor: fillStyle.color,
                            transition: 'left 0.05s ease-out, border-color 0.15s ease',
                        }}
                    >
                        <div
                            className="absolute inset-[3px] rounded-full transition-colors duration-150"
                            style={{ backgroundColor: fillStyle.color }}
                        />
                    </div>

                    {/* Scale markers */}
                    <div className="flex justify-between mt-3 px-1 text-xs text-slate-400">
                        <span>0%</span>
                        <span>25%</span>
                        <span>50%</span>
                        <span>75%</span>
                        <span>100%</span>
                    </div>
                </div>
            </div>

            {/* Napomena */}
            <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Napomena (opciono)"
                className="w-full p-4 border rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
                rows={2}
            />

            {/* Submit dugme */}
            <button
                onClick={() => wasteType && onSubmit({
                    wasteType,
                    wasteLabel: wasteTypes.find(w => w.id === wasteType)?.label,
                    fillLevel,
                    urgency: 'standard', // Standardna hitnost - koristi max_pickup_hours iz firme
                    note
                })}
                disabled={loading || !wasteType}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
                {loading ? <RefreshCw className="animate-spin" size={20} /> : <><Send size={20} /> Pošalji zahtev</>}
            </button>
        </div>
    );
};

export default NewRequestForm;
