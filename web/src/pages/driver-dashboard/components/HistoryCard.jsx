/**
 * HistoryCard - Kartica za prikaz istorije zahteva
 * Ekstraktovano iz DriverDashboard.jsx
 */
import React, { useState } from 'react';
import { MapPin, Truck, Package, PackageCheck, FileText, Scale, Image as ImageIcon, ChevronDown, ChevronUp, X } from 'lucide-react';

// Calculate time difference between two dates
const getTimeDiff = (start, end) => {
    if (!start || !end) return null;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate - startDate;

    if (diffMs < 0) return null;

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h ${diffMins % 60}min`;
    return `${diffDays}d ${diffHours % 24}h`;
};

// Format date/time for display
const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('sr-RS', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const HistoryCard = ({ item, wasteTypes }) => {
    const [expanded, setExpanded] = useState(false);
    const [showProofModal, setShowProofModal] = useState(false);

    const wasteIcon = wasteTypes?.find(w => w.id === item.waste_type)?.icon || '📦';

    const isRetroactiveAssignment = item.source === 'processed_request' || (!item.assigned_at && !item.picked_up_at);

    const steps = isRetroactiveAssignment ? [] : [
        { key: 'assigned', label: 'Dodeljeno', icon: Truck, time: item.assigned_at, color: 'bg-blue-500', completed: !!item.assigned_at },
        { key: 'picked_up', label: 'Preuzeto', icon: Package, time: item.picked_up_at, color: 'bg-amber-500', completed: !!item.picked_up_at },
        { key: 'delivered', label: 'Dostavljeno', icon: PackageCheck, time: item.delivered_at, color: 'bg-emerald-500', completed: !!item.delivered_at }
    ];

    const processedData = item.processed_at ? {
        processed_at: item.processed_at,
        weight: item.weight,
        weight_unit: item.weight_unit,
        proof_url: item.proof_url,
        notes: item.notes
    } : null;

    return (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setExpanded(!expanded)}>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl">{wasteIcon}</div>
                        <div>
                            <p className="font-medium text-slate-800">{item.client_name || 'Nepoznat klijent'}</p>
                            <p className="text-sm text-slate-500">{item.waste_label || 'Nepoznata vrsta'}</p>
                            {item.client_address && (
                                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1 max-w-[180px] sm:max-w-none">
                                    <MapPin size={10} className="shrink-0" />
                                    <span className="truncate">{item.client_address}</span>
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                            <p className="text-xs font-medium text-emerald-600 whitespace-nowrap">
                                {item.delivered_at ? new Date(item.delivered_at).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\. /g, '.').replace(/\.$/, '') : '-'}
                            </p>
                            <p className="text-xs text-slate-400">
                                {item.delivered_at ? new Date(item.delivered_at).toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </p>
                        </div>
                        {expanded ? <ChevronUp size={20} className="text-slate-400 shrink-0" /> : <ChevronDown size={20} className="text-slate-400 shrink-0" />}
                    </div>
                </div>

                {/* Mini timeline preview */}
                {!expanded && (
                    <div className="flex items-center gap-1 mt-3">
                        {isRetroactiveAssignment ? (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">Evidentirano naknadno</span>
                        ) : (
                            <>
                                {steps.map((step, idx) => (
                                    <div key={step.key} className="flex items-center">
                                        <div className={`w-2 h-2 rounded-full ${step.completed ? step.color : 'bg-slate-200'}`} />
                                        {idx < steps.length - 1 && <div className={`w-8 h-0.5 ${step.completed && steps[idx + 1].completed ? 'bg-slate-300' : 'bg-slate-200'}`} />}
                                    </div>
                                ))}
                                {item.status === 'completed' && (
                                    <>
                                        <div className="w-8 h-0.5 bg-slate-300" />
                                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                                    </>
                                )}
                                <span className="text-xs text-slate-400 ml-2">Ukupno: {getTimeDiff(item.assigned_at, item.delivered_at) || '-'}</span>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Expanded content */}
            {expanded && (
                <div className="px-4 pb-4 border-t bg-slate-50">
                    {isRetroactiveAssignment ? (
                        <div className="py-4">
                            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center shrink-0">
                                        <FileText size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-purple-800">Evidentirano naknadno</p>
                                        <p className="text-sm text-purple-600 mt-1">Ovaj zahtev je obrađen od strane menadžera, a vi ste evidentirani kao vozač naknadno.</p>
                                        <p className="text-xs text-purple-500 mt-2">Obrađeno: {formatDateTime(item.delivered_at || item.completed_at)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-4">
                            <div className="relative">
                                {steps.map((step, idx) => {
                                    const Icon = step.icon;
                                    const nextStep = steps[idx + 1];
                                    const timeDiff = nextStep ? getTimeDiff(step.time, nextStep.time) : null;

                                    return (
                                        <div key={step.key} className="flex items-start mb-0">
                                            <div className="flex flex-col items-center mr-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step.completed ? step.color : 'bg-slate-200'}`}>
                                                    <Icon size={16} className="text-white" />
                                                </div>
                                                {idx < steps.length - 1 && (
                                                    <div className="relative w-0.5 h-12 bg-slate-200 my-1">
                                                        {step.completed && nextStep?.completed && <div className="absolute inset-0 bg-slate-400" />}
                                                        {timeDiff && (
                                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap">
                                                                <span className="text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded border">{timeDiff}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 pb-4">
                                                <div className="flex items-center justify-between">
                                                    <p className={`font-medium ${step.completed ? 'text-slate-800' : 'text-slate-400'}`}>{step.label}</p>
                                                    <span className="text-xs text-slate-500">{formatDateTime(step.time)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {processedData && (
                                    <div className="flex items-start">
                                        <div className="flex flex-col items-center mr-3">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-500">
                                                <FileText size={16} className="text-white" />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <p className="font-medium text-slate-800">Obrađeno</p>
                                                <span className="text-xs text-slate-500">{formatDateTime(processedData.processed_at)}</span>
                                            </div>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {processedData.weight && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
                                                        <Scale size={12} />
                                                        {processedData.weight} {processedData.weight_unit || 'kg'}
                                                    </span>
                                                )}
                                                {processedData.proof_url && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setShowProofModal(true); }}
                                                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
                                                    >
                                                        <ImageIcon size={12} />
                                                        Dokaznica
                                                    </button>
                                                )}
                                            </div>
                                            {processedData.notes && <p className="mt-2 text-xs text-slate-500 italic">"{processedData.notes}"</p>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {!isRetroactiveAssignment && (
                        <div className="pt-3 border-t border-slate-200">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Ukupno vreme:</span>
                                <span className="font-medium text-slate-700">{getTimeDiff(item.assigned_at, item.delivered_at) || '-'}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Proof Modal */}
            {showProofModal && processedData?.proof_url && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowProofModal(false)}>
                    <div className="relative max-w-2xl max-h-[90vh]">
                        <button onClick={() => setShowProofModal(false)} className="absolute -top-10 right-0 text-white hover:text-slate-300">
                            <X size={24} />
                        </button>
                        <img src={processedData.proof_url} alt="Dokaznica" className="max-w-full max-h-[80vh] rounded-lg object-contain" />
                        <div className="mt-2 text-center text-white text-sm">
                            <p>{item.client_name} - {item.waste_label}</p>
                            {processedData.weight && <p className="text-emerald-400 font-medium">{processedData.weight} {processedData.weight_unit || 'kg'}</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoryCard;
