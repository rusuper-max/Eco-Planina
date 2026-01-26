/**
 * DriverListView - Lista prikaz za vozače
 * Ekstraktovano iz DriverDashboard.jsx
 */
import React from 'react';
import { Truck, MapPin, Navigation, AlertCircle, Package, PackageCheck, Phone, User, Route } from 'lucide-react';
import toast from 'react-hot-toast';
import { EmptyState } from '../../../components/common';
import { CountdownTimer, FillLevelBar } from '../../DashboardComponents';
import { openOptimizedRoute } from '../../../utils/routeOptimization';

export const DriverListView = ({
    pendingRequests,
    wasteTypes,
    urgencyFilter,
    setUrgencyFilter,
    processing,
    handlePickup,
    handleDelivery,
    selectedForRoute,
    toggleRouteSelection,
    toggleSelectAllForRoute
}) => {
    // Get waste icon
    const getWasteIcon = (wasteTypeId) => {
        const wt = wasteTypes.find(w => w.id === wasteTypeId);
        return wt?.icon || '📦';
    };

    // Open optimized route in Google Maps
    const handleOpenOptimizedRoute = () => {
        const selectedRequests = pendingRequests.filter(r => selectedForRoute.has(r.id));
        const result = openOptimizedRoute(selectedRequests);

        if (result.error) {
            toast.error(result.error);
            return;
        }

        toast.success(`Ruta: ${result.waypointCount} lokacija, ~${result.distance.toFixed(1)} km`);
        window.open(result.url, '_blank');
    };

    if (pendingRequests.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <EmptyState
                    icon={Truck}
                    title={urgencyFilter !== 'all' ? 'Nema zahteva sa tim prioritetom' : 'Nemate dodeljenih zahteva'}
                    desc={urgencyFilter !== 'all'
                        ? 'Promenite filter da vidite sve zahteve'
                        : 'Sacekajte da vam menadzer dodeli zahteve za preuzimanje'}
                    actionLabel={urgencyFilter !== 'all' ? 'Prikazi sve' : null}
                    onAction={urgencyFilter !== 'all' ? () => setUrgencyFilter('all') : null}
                />
            </div>
        );
    }

    return (
        <div className="space-y-3 max-w-2xl mx-auto">
            {/* Route Planning Header */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl text-white">
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={pendingRequests.filter(r => r.latitude && r.longitude).length > 0 &&
                                pendingRequests.filter(r => r.latitude && r.longitude).every(r => selectedForRoute.has(r.id))}
                            onChange={() => toggleSelectAllForRoute(pendingRequests)}
                            className="w-5 h-5 rounded border-white/50 text-white focus:ring-white/50"
                        />
                        <span className="text-sm font-medium">Odaberi sve</span>
                    </label>
                    {selectedForRoute.size > 0 && (
                        <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-bold">
                            {selectedForRoute.size} odabrano
                        </span>
                    )}
                </div>
                <button
                    onClick={handleOpenOptimizedRoute}
                    disabled={selectedForRoute.size < 2}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-purple-700 rounded-lg font-bold text-sm hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Route size={18} />
                    Otvori Rutu
                </button>
            </div>

            {pendingRequests.map(request => (
                <div
                    key={request.id}
                    className={`bg-white rounded-xl border-l-4 shadow-sm overflow-hidden ${selectedForRoute.has(request.id) ? 'ring-2 ring-purple-400' : ''} ${request.assignmentStatus === 'picked_up' ? 'border-l-amber-500' :
                        request.currentUrgency === '24h' ? 'border-l-red-500' :
                            request.currentUrgency === '48h' ? 'border-l-amber-500' : 'border-l-emerald-500'
                        }`}
                >
                    <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                {/* Route Selection Checkbox */}
                                {request.latitude && request.longitude && (
                                    <input
                                        type="checkbox"
                                        checked={selectedForRoute.has(request.id)}
                                        onChange={() => toggleRouteSelection(request.id)}
                                        className="w-5 h-5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 shrink-0"
                                    />
                                )}
                                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl">
                                    {getWasteIcon(request.waste_type)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{request.client_name}</h3>
                                    <p className="text-sm text-slate-500">{request.waste_label}</p>
                                    {request.request_code && (
                                        <p className="text-xs text-slate-400 font-mono">{request.request_code}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                {request.assignmentStatus === 'picked_up' && (
                                    <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                                        Preuzeto
                                    </span>
                                )}
                                <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${request.currentUrgency === '24h' ? 'bg-red-100 text-red-700' :
                                    request.currentUrgency === '48h' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                    <CountdownTimer createdAt={request.created_at} urgency={request.urgency} />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs text-slate-500">Popunjenost:</span>
                            <FillLevelBar fillLevel={request.fill_level} />
                        </div>

                        {request.client_address && (
                            <p className="text-sm text-slate-600 mb-3 flex items-start gap-2">
                                <MapPin size={16} className="shrink-0 mt-0.5 text-slate-400" />
                                {request.client_address}
                            </p>
                        )}

                        {/* Manager who assigned this request */}
                        {request.assignedByName && (
                            <div className="mb-3 p-2 bg-slate-50 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <User size={14} className="text-slate-400" />
                                    <span>Dodelio: <strong>{request.assignedByName}</strong></span>
                                </div>
                                {request.assignedByPhone && (
                                    <a
                                        href={`tel:${request.assignedByPhone}`}
                                        className="flex items-center gap-1 text-emerald-600 text-sm font-medium hover:text-emerald-700"
                                    >
                                        <Phone size={14} /> Pozovi
                                    </a>
                                )}
                            </div>
                        )}

                        <div className="flex gap-2">
                            {request.latitude && request.longitude ? (
                                <>
                                    <a
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${request.latitude},${request.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 px-4 py-3 min-h-[48px] bg-blue-600 text-white text-base rounded-xl hover:bg-blue-700 active:bg-blue-800 text-center font-semibold flex items-center justify-center gap-2 shadow-md touch-manipulation"
                                    >
                                        <Navigation size={18} /> Google
                                    </a>
                                    <a
                                        href={`https://waze.com/ul?ll=${request.latitude},${request.longitude}&navigate=yes`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 px-4 py-3 min-h-[48px] bg-cyan-600 text-white text-base rounded-xl hover:bg-cyan-700 active:bg-cyan-800 text-center font-semibold flex items-center justify-center gap-2 shadow-md touch-manipulation"
                                    >
                                        <Navigation size={18} /> Waze
                                    </a>
                                </>
                            ) : (
                                <div className="flex-1 px-4 py-3 min-h-[48px] bg-amber-100 text-amber-700 text-base rounded-xl text-center font-medium flex items-center justify-center gap-2">
                                    <AlertCircle size={18} /> Nema lokacije
                                </div>
                            )}
                            {request.assignmentStatus === 'picked_up' ? (
                                <button
                                    onClick={() => handleDelivery(request)}
                                    disabled={processing}
                                    className="px-5 py-3 min-h-[48px] bg-emerald-600 text-white text-base rounded-xl hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 font-semibold flex items-center gap-2 shadow-md touch-manipulation"
                                >
                                    <PackageCheck size={20} />
                                    <span className="hidden sm:inline">Dostavljeno</span>
                                </button>
                            ) : (
                                <button
                                    onClick={() => handlePickup(request)}
                                    disabled={processing}
                                    className="px-5 py-3 min-h-[48px] bg-amber-600 text-white text-base rounded-xl hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 font-semibold flex items-center gap-2 shadow-md touch-manipulation"
                                >
                                    <Package size={20} />
                                    <span className="hidden sm:inline">Preuzeto</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default DriverListView;
