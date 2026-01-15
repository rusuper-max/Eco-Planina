import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { Truck, X, RefreshCw } from 'lucide-react';
import { createCustomIcon, URGENCY_COLORS } from '../../utils/mapUtils';
import { getCurrentUrgency } from '../../utils/timeUtils';
import { FitBounds } from './FitBounds';

// Default waste types
const DEFAULT_WASTE_TYPES = [
    { id: 'cardboard', label: 'Karton', icon: '📦' },
    { id: 'plastic', label: 'Plastika', icon: '♻️' },
    { id: 'glass', label: 'Staklo', icon: '🍾' },
];

/**
 * Main map view component with clustering, filtering, and driver assignment
 */
export const MapView = ({
    requests,
    clients,
    type,
    onClientLocationEdit,
    wasteTypes = DEFAULT_WASTE_TYPES,
    drivers = [],
    onAssignDriver,
    driverAssignments = []
}) => {
    const [urgencyFilter, setUrgencyFilter] = useState('all');
    const [showDriverModal, setShowDriverModal] = useState(false);
    const [selectedForAssignment, setSelectedForAssignment] = useState(null);
    const [assigningDriver, setAssigningDriver] = useState(false);
    const items = type === 'requests' ? requests : clients;

    // Get assignment info for a request
    const getAssignment = (requestId) => {
        return driverAssignments.find(a => a.request_id === requestId);
    };

    // Open driver selection modal
    const openDriverModal = (requestOrRequests) => {
        setSelectedForAssignment(requestOrRequests);
        setShowDriverModal(true);
    };

    // Handle driver assignment
    const handleAssignToDriver = async (driverId) => {
        if (!onAssignDriver || !selectedForAssignment) return;
        setAssigningDriver(true);
        try {
            const requestIds = Array.isArray(selectedForAssignment)
                ? selectedForAssignment.map(r => r.id)
                : [selectedForAssignment.id];
            await onAssignDriver(requestIds, driverId);
            setShowDriverModal(false);
            setSelectedForAssignment(null);
        } catch (err) {
            toast.error('Greška pri dodeljivanju: ' + err.message);
        } finally {
            setAssigningDriver(false);
        }
    };

    // Helper to get waste type icon from wasteTypes array
    const getWasteIcon = (wasteTypeId) => {
        const wt = wasteTypes.find(w => w.id === wasteTypeId);
        return wt?.icon || '📦';
    };

    // Add current urgency to each request based on remaining time
    const itemsWithCurrentUrgency = useMemo(() => {
        if (type !== 'requests') return items || [];
        return (items || []).map(item => ({
            ...item,
            currentUrgency: getCurrentUrgency(item.created_at, item.urgency)
        }));
    }, [items, type]);

    // Filter items by CURRENT urgency (not original)
    const filteredItems = useMemo(() => {
        if (type !== 'requests') return items || [];
        if (urgencyFilter === 'all') return itemsWithCurrentUrgency;
        return itemsWithCurrentUrgency.filter(item => item.currentUrgency === urgencyFilter);
    }, [itemsWithCurrentUrgency, items, type, urgencyFilter]);

    // Calculate positions for all items
    const markers = useMemo(() => {
        const withCoords = [];
        const withoutCoords = [];

        filteredItems.forEach((item, index) => {
            const lat = item.latitude ? parseFloat(item.latitude) : null;
            const lng = item.longitude ? parseFloat(item.longitude) : null;
            const hasValidCoords = lat && lng && !isNaN(lat) && !isNaN(lng);

            if (hasValidCoords) {
                withCoords.push({ item, position: [lat, lng], index, hasCoords: true });
            } else {
                withoutCoords.push({ item, index, hasCoords: false });
            }
        });

        // Calculate center for items without coords
        let centerLat = 44.0;
        let centerLng = 20.9;
        if (withCoords.length > 0) {
            centerLat = withCoords.reduce((sum, m) => sum + m.position[0], 0) / withCoords.length;
            centerLng = withCoords.reduce((sum, m) => sum + m.position[1], 0) / withCoords.length;
        }

        // Distribute items without coords in a circle around the center
        const radius = 0.05;
        withoutCoords.forEach((item, i) => {
            const angle = (2 * Math.PI * i) / Math.max(withoutCoords.length, 1);
            const lat = centerLat + radius * Math.cos(angle);
            const lng = centerLng + radius * Math.sin(angle);
            item.position = [lat, lng];
        });

        return [...withCoords, ...withoutCoords];
    }, [filteredItems]);

    // Extract all positions for bounds fitting
    const allPositions = useMemo(() => markers.map(m => m.position), [markers]);

    // Count by CURRENT urgency
    const urgencyCounts = useMemo(() => {
        if (type !== 'requests') return {};
        return itemsWithCurrentUrgency.reduce((acc, item) => {
            acc[item.currentUrgency] = (acc[item.currentUrgency] || 0) + 1;
            return acc;
        }, {});
    }, [itemsWithCurrentUrgency, type]);

    return (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ height: '500px' }}>
            {/* Urgency Filter - Only show for requests */}
            {type === 'requests' && (
                <div className="flex items-center gap-2 p-3 bg-slate-50 border-b">
                    <span className="text-sm text-slate-500 mr-2">Filter:</span>
                    <button
                        onClick={() => setUrgencyFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${urgencyFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    >
                        Svi ({itemsWithCurrentUrgency?.length || 0})
                    </button>
                    <button
                        onClick={() => setUrgencyFilter('24h')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${urgencyFilter === '24h' ? 'bg-red-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-200'}`}
                    >
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        Hitno ({urgencyCounts['24h'] || 0})
                    </button>
                    <button
                        onClick={() => setUrgencyFilter('48h')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${urgencyFilter === '48h' ? 'bg-amber-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-amber-50 hover:border-amber-200'}`}
                    >
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        Srednje ({urgencyCounts['48h'] || 0})
                    </button>
                    <button
                        onClick={() => setUrgencyFilter('72h')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${urgencyFilter === '72h' ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-200'}`}
                    >
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Normalno ({urgencyCounts['72h'] || 0})
                    </button>
                </div>
            )}
            <MapContainer center={[44.8, 20.45]} zoom={11} style={{ height: type === 'requests' ? 'calc(100% - 52px)' : '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <FitBounds positions={allPositions} />
                <MarkerClusterGroup
                    key={`cluster-${urgencyFilter}-${filteredItems?.length || 0}`}
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

                        // Store marker data on cluster for later use
                        cluster._childRequestIds = childMarkers.map(m => m.options.requestId).filter(Boolean);

                        // Show truck icon for batch assignment if drivers available
                        const showTruckIcon = type === 'requests' && drivers.length > 0 && onAssignDriver;

                        return L.divIcon({
                            html: `<div style="position: relative;">
                                <div style="background-color: ${color}; color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${count}</div>
                                ${showTruckIcon ? `<div class="cluster-truck-btn" style="position: absolute; top: -8px; right: -8px; background: #059669; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border: 2px solid white; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.684-.949V8a2 2 0 0 1 2-2h2"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
                                </div>` : ''}
                            </div>`,
                            className: 'custom-cluster-icon',
                            iconSize: L.point(40, 40, true),
                        });
                    }}
                    eventHandlers={{
                        clusterclick: (e) => {
                            // Check if truck button was clicked
                            const clickedElement = e.originalEvent?.target;
                            if (clickedElement?.closest('.cluster-truck-btn')) {
                                e.originalEvent.stopPropagation();
                                const cluster = e.layer;
                                const requestIds = cluster._childRequestIds || [];
                                const clusterRequests = requestIds
                                    .map(id => filteredItems.find(item => item.id === id))
                                    .filter(Boolean);
                                if (clusterRequests.length > 0) {
                                    openDriverModal(clusterRequests);
                                }
                                return;
                            }
                            // Default behavior: zoom/spiderfy
                        }
                    }}
                >
                    {markers.map(({ item, position, index, hasCoords }) => (
                        <Marker
                            key={item.id || `marker-${index}`}
                            position={position}
                            icon={createCustomIcon(item.currentUrgency || item.urgency, type === 'requests' ? getWasteIcon(item.waste_type) : '🏢', type === 'clients')}
                            opacity={hasCoords ? 1 : 0.7}
                            urgencyLevel={item.currentUrgency || item.urgency}
                            requestId={item.id}
                        >
                            <Popup>
                                <p className="font-bold">{type === 'requests' ? item.client_name : item.name}</p>
                                <p className="text-sm">{type === 'requests' ? item.waste_label : item.phone}</p>
                                <p className="text-xs text-gray-500">{type === 'requests' ? item.client_address : item.address}</p>
                                {type === 'requests' && item.currentUrgency && (
                                    <p className={`text-xs font-semibold mt-1 ${item.currentUrgency === '24h' ? 'text-red-600' : item.currentUrgency === '48h' ? 'text-amber-600' : 'text-emerald-600'}`}>
                                        ⏱ {item.currentUrgency === '24h' ? 'Hitno' : item.currentUrgency === '48h' ? 'Srednje' : 'Normalno'}
                                    </p>
                                )}
                                {!hasCoords && <p className="text-xs text-orange-500 mt-1">⚠️ Lokacija nije podešena</p>}
                                {hasCoords && type === 'requests' && (
                                    <div className="flex gap-1 mt-2">
                                        <a
                                            href={`https://www.google.com/maps/dir/?api=1&destination=${position[0]},${position[1]}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                        >
                                            Google Maps
                                        </a>
                                        <a
                                            href={`https://waze.com/ul?ll=${position[0]},${position[1]}&navigate=yes`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-2 py-1 bg-cyan-600 text-white text-xs rounded hover:bg-cyan-700"
                                        >
                                            Waze
                                        </a>
                                    </div>
                                )}
                                {type === 'requests' && drivers.length > 0 && onAssignDriver && (
                                    <div className="mt-2 pt-2 border-t">
                                        {getAssignment(item.id) ? (
                                            <div className="text-xs">
                                                <span className="text-slate-500">Dodeljeno: </span>
                                                <span className="font-medium text-emerald-600">{getAssignment(item.id)?.driver?.name}</span>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => openDriverModal(item)}
                                                className="w-full px-2 py-1.5 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 flex items-center justify-center gap-1"
                                            >
                                                <Truck size={12} /> Dodeli vozaču
                                            </button>
                                        )}
                                    </div>
                                )}
                                {type === 'clients' && onClientLocationEdit && (
                                    <button
                                        onClick={() => onClientLocationEdit(item)}
                                        className="mt-2 px-3 py-1 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700"
                                    >
                                        Uredi lokaciju
                                    </button>
                                )}
                            </Popup>
                        </Marker>
                    ))}
                </MarkerClusterGroup>
            </MapContainer>

            {/* Driver Assignment Modal */}
            {showDriverModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-xl">
                        <div className="p-4 border-b flex items-center justify-between bg-slate-50">
                            <h3 className="font-bold text-slate-800">Dodeli vozaču</h3>
                            <button
                                onClick={() => {
                                    setShowDriverModal(false);
                                    setSelectedForAssignment(null);
                                }}
                                className="p-2 hover:bg-slate-200 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-3 bg-emerald-50 border-b">
                            {Array.isArray(selectedForAssignment) ? (
                                <p className="text-sm text-emerald-700">
                                    <strong>{selectedForAssignment.length}</strong> zahteva odabrano za dodelu
                                </p>
                            ) : selectedForAssignment && (
                                <div>
                                    <p className="font-medium text-slate-800">{selectedForAssignment.client_name}</p>
                                    <p className="text-sm text-slate-500">{selectedForAssignment.waste_label}</p>
                                </div>
                            )}
                        </div>

                        <div className="overflow-y-auto max-h-96 p-2">
                            {drivers.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    <Truck size={32} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Nema registrovanih vozača</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {drivers.map(driver => (
                                        <button
                                            key={driver.id}
                                            onClick={() => handleAssignToDriver(driver.id)}
                                            disabled={assigningDriver}
                                            className="w-full flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                                        >
                                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold">
                                                {driver.name?.charAt(0)?.toUpperCase() || 'V'}
                                            </div>
                                            <div className="text-left flex-1">
                                                <p className="font-medium text-slate-800">{driver.name}</p>
                                                <p className="text-xs text-slate-500">{driver.phone}</p>
                                            </div>
                                            {assigningDriver && (
                                                <RefreshCw size={16} className="animate-spin text-emerald-600" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t">
                            <button
                                onClick={() => {
                                    setShowDriverModal(false);
                                    setSelectedForAssignment(null);
                                }}
                                className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200"
                            >
                                Otkaži
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MapView;
