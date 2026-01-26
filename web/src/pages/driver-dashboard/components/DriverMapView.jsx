/**
 * DriverMapView - Mapa prikaz za vozače
 * Ekstraktovano iz DriverDashboard.jsx
 */
import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { AlertCircle, Navigation, Package, PackageCheck, MapPin } from 'lucide-react';
import { EmptyState } from '../../../components/common';
import { Truck } from 'lucide-react';
import { createCustomIcon, CountdownTimer, FitBounds, FillLevelBar } from '../../DashboardComponents';

export const DriverMapView = ({
    pendingRequests,
    wasteTypes,
    urgencyFilter,
    setUrgencyFilter,
    processing,
    handlePickup,
    handleDelivery
}) => {
    // Get waste icon
    const getWasteIcon = (wasteTypeId) => {
        const wt = wasteTypes.find(w => w.id === wasteTypeId);
        return wt?.icon || '📦';
    };

    // Prepare markers
    const markers = useMemo(() => {
        return pendingRequests
            .filter(r => r.latitude && r.longitude)
            .map(r => ({
                item: r,
                position: [parseFloat(r.latitude), parseFloat(r.longitude)],
                hasCoords: true
            }));
    }, [pendingRequests]);

    const allPositions = useMemo(() => markers.map(m => m.position), [markers]);

    if (pendingRequests.length === 0) {
        return (
            <div className="flex items-center justify-center h-full p-4">
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
        <div className="flex-1 relative">
            <MapContainer
                center={[44.8, 20.45]}
                zoom={11}
                preferCanvas={true}
                wheelDebounceTime={20}
                wheelPxPerZoomLevel={80}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {allPositions.length > 0 && <FitBounds positions={allPositions} />}
                <MarkerClusterGroup
                    chunkedLoading
                    maxClusterRadius={50}
                    spiderfyOnMaxZoom={true}
                    showCoverageOnHover={false}
                    iconCreateFunction={(cluster) => {
                        const count = cluster.getChildCount();
                        const childMarkers = cluster.getAllChildMarkers();
                        const hasUrgent = childMarkers.some(m => m.options.urgencyLevel === '24h');
                        const hasMedium = childMarkers.some(m => m.options.urgencyLevel === '48h');
                        const color = hasUrgent ? '#EF4444' : hasMedium ? '#F59E0B' : '#10B981';
                        return L.divIcon({
                            html: `<div style="background-color: ${color}; color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${count}</div>`,
                            className: 'custom-cluster-icon',
                            iconSize: L.point(40, 40, true),
                        });
                    }}
                >
                    {markers.map(({ item, position }) => (
                        <Marker
                            key={item.id}
                            position={position}
                            icon={createCustomIcon(item.currentUrgency, getWasteIcon(item.waste_type), item.assignmentStatus === 'picked_up')}
                            urgencyLevel={item.currentUrgency}
                        >
                            <Popup>
                                <div className="min-w-[240px]">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="font-semibold text-slate-900 text-base">{item.client_name}</p>
                                        {item.assignmentStatus === 'picked_up' && (
                                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-semibold">
                                                Preuzeto
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-600 mb-1">{item.waste_label}</p>
                                    {item.request_code && (
                                        <p className="text-xs text-slate-400 font-mono mb-1">{item.request_code}</p>
                                    )}
                                    <p className="text-xs text-slate-500 leading-relaxed">{item.client_address}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs text-slate-500">Popunjenost:</span>
                                        <FillLevelBar fillLevel={item.fill_level} />
                                    </div>
                                    <div className={`text-xs font-semibold mt-2 flex items-center gap-1 ${item.currentUrgency === '24h' ? 'text-red-600' : item.currentUrgency === '48h' ? 'text-amber-600' : 'text-emerald-600'}`}>
                                        ⏱ <CountdownTimer createdAt={item.created_at} urgency={item.urgency} />
                                    </div>
                                    <div className="flex gap-2 mt-3">
                                        <a
                                            href={`https://www.google.com/maps/dir/?api=1&destination=${position[0]},${position[1]}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 px-3 py-2.5 min-h-[44px] bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 active:bg-blue-800 text-center font-semibold shadow-md flex items-center justify-center touch-manipulation"
                                            style={{ color: '#fff' }}
                                        >
                                            Google Maps
                                        </a>
                                        <a
                                            href={`https://waze.com/ul?ll=${position[0]},${position[1]}&navigate=yes`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 px-3 py-2.5 min-h-[44px] bg-cyan-600 text-white text-sm rounded-xl hover:bg-cyan-700 active:bg-cyan-800 text-center font-semibold shadow-md flex items-center justify-center touch-manipulation"
                                            style={{ color: '#fff' }}
                                        >
                                            Waze
                                        </a>
                                    </div>
                                    {item.assignmentStatus === 'picked_up' ? (
                                        <button
                                            onClick={() => handleDelivery(item)}
                                            disabled={processing}
                                            className="w-full mt-3 px-4 py-3 min-h-[48px] bg-emerald-600 text-white text-base rounded-xl hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 font-semibold flex items-center justify-center gap-2 shadow-md touch-manipulation"
                                        >
                                            <PackageCheck size={20} />
                                            Dostavljeno
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handlePickup(item)}
                                            disabled={processing}
                                            className="w-full mt-3 px-4 py-3 min-h-[48px] bg-amber-600 text-white text-base rounded-xl hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 font-semibold flex items-center justify-center gap-2 shadow-md touch-manipulation"
                                        >
                                            <Package size={20} />
                                            Preuzeto od klijenta
                                        </button>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MarkerClusterGroup>
            </MapContainer>

            {/* Floating list of requests without location */}
            {pendingRequests.filter(r => !r.latitude || !r.longitude).length > 0 && (
                <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white rounded-xl shadow-lg border max-h-48 overflow-y-auto">
                    <div className="p-3 border-b bg-amber-50">
                        <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
                            <AlertCircle size={16} />
                            Zahtevi bez lokacije ({pendingRequests.filter(r => !r.latitude || !r.longitude).length})
                        </p>
                    </div>
                    <div className="divide-y">
                        {pendingRequests.filter(r => !r.latitude || !r.longitude).map(r => (
                            <div key={r.id} className="p-3 hover:bg-slate-50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-sm">{r.client_name}</p>
                                        <p className="text-xs text-slate-500">{r.waste_label}</p>
                                    </div>
                                    <CountdownTimer createdAt={r.created_at} urgency={r.urgency} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverMapView;
