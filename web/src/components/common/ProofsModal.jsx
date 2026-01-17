import React, { useState } from 'react';
import { X, Camera, Image, Check, Clock, Download } from 'lucide-react';

/**
 * ProofsModal - Unified modal for viewing all proofs for a request
 * Displays pickup, delivery, and processing proofs with timestamps and metadata
 */
const ProofsModal = ({
    open,
    onClose,
    requestCode,
    clientName,
    // Pickup proof (from driver_assignments)
    pickupProofUrl,
    pickupDriverName,
    pickupAt,
    // Delivery proof (from driver_assignments)
    deliveryProofUrl,
    deliveryDriverName,
    deliveryAt,
    driverWeight,
    driverWeightUnit,
    // Processing proof (from processed_requests)
    processingProofUrl,
    processingManagerName,
    processedAt,
    processedWeight,
    processedWeightUnit,
    // Edit callback for manager to add/edit processing proof
    onAddProcessingProof,
}) => {
    const [lightbox, setLightbox] = useState(null); // { url, title }

    if (!open) return null;

    const hasAnyProof = pickupProofUrl || deliveryProofUrl || processingProofUrl;

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('sr-Latn-RS', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleDownload = (url, filename) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'dokaz.jpg';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const ProofCard = ({ type, title, icon, proofUrl, personName, timestamp, weight, weightUnit, isCompleted, canEdit, className = '' }) => (
        <div className={`border rounded-xl p-4 flex flex-col ${isCompleted ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50'} ${className}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-xl">{icon}</span>
                    <span className="font-medium text-slate-700">{title}</span>
                </div>
                {isCompleted ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                        <Check size={12} />
                        Priloženo
                    </span>
                ) : (
                    <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                        <Clock size={12} />
                        Nije priloženo
                    </span>
                )}
            </div>

            {proofUrl ? (
                <div className="space-y-2 flex-1 flex flex-col">
                    <button
                        type="button"
                        onClick={() => setLightbox({ url: proofUrl, title })}
                        className="block w-full text-left flex-1"
                    >
                        <img
                            src={proofUrl}
                            alt={title}
                            className="w-full h-36 object-cover rounded-lg hover:opacity-90 transition-opacity cursor-zoom-in"
                        />
                    </button>
                    <div className="text-xs text-slate-500 space-y-1 mt-auto">
                        {personName && <p>Priložio: <span className="font-medium">{personName}</span></p>}
                        {timestamp && <p>Datum: {formatDate(timestamp)}</p>}
                        {weight && <p>Kilaža: <span className="font-medium">{weight} {weightUnit || 'kg'}</span></p>}
                    </div>
                </div>
            ) : (
                <div className="py-6 text-center text-slate-400 flex-1 flex flex-col items-center justify-center">
                    <Camera size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Dokaz nije priložen</p>
                    {canEdit && onAddProcessingProof && (
                        <button
                            onClick={onAddProcessingProof}
                            className="mt-3 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                            + Dodaj dokaz
                        </button>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <>
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">📷 Dokazi</h2>
                            <p className="text-sm text-slate-500">
                                {requestCode && `#${requestCode} • `}{clientName}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
                            {/* Pickup Proof */}
                            <ProofCard
                                type="pickup"
                                title="Dokaz preuzimanja"
                                icon="📦"
                                proofUrl={pickupProofUrl}
                                personName={pickupDriverName}
                                timestamp={pickupAt}
                                isCompleted={!!pickupProofUrl}
                                className="h-full"
                            />

                            {/* Delivery Proof */}
                            <ProofCard
                                type="delivery"
                                title="Dokaz dostave"
                                icon="🚛"
                                proofUrl={deliveryProofUrl}
                                personName={deliveryDriverName}
                                timestamp={deliveryAt}
                                weight={driverWeight}
                                weightUnit={driverWeightUnit}
                                isCompleted={!!deliveryProofUrl}
                                className="h-full"
                            />

                            {/* Processing Proof */}
                            <ProofCard
                                type="processing"
                                title="Potvrda merenja (menadžer)"
                                icon="📋"
                                proofUrl={processingProofUrl}
                                personName={processingManagerName}
                                timestamp={processedAt}
                                weight={processedWeight}
                                weightUnit={processedWeightUnit}
                                isCompleted={!!processingProofUrl}
                                canEdit={true}
                                className="h-full"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50">
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 transition-colors"
                        >
                            Zatvori
                        </button>
                    </div>
                </div>
            </div>
            {lightbox && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
                    <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
                            <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4">
                                <span className="font-semibold text-slate-800 truncate">{lightbox.title || 'Dokaz'}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => handleDownload(lightbox.url, `${lightbox.title || 'dokaz'}.jpg`)}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                                    >
                                        <Download size={14} />
                                        Preuzmi
                                    </button>
                                    <button
                                        onClick={() => setLightbox(null)}
                                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="bg-slate-100 flex items-center justify-center p-4">
                                <img src={lightbox.url} alt={lightbox.title} className="max-w-full max-h-[70vh] object-contain" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProofsModal;
