import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { Truck, X, RefreshCw, MapPin, ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react';
import { createCustomIcon } from '../../utils/mapUtils';
import { getCurrentUrgency } from '../../utils/timeUtils';
import { FitBounds } from './FitBounds';
import { LocationPicker } from './LocationPicker';

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
    onSetClientLocation,  // New: callback za podešavanje lokacije klijenta (ažurira klijenta i sve njegove zahteve)
    wasteTypes = DEFAULT_WASTE_TYPES,
    drivers = [],
    onAssignDriver,
    driverAssignments = []
}) => {
    const [urgencyFilter, setUrgencyFilter] = useState('all');
    const [wasteFilter, setWasteFilter] = useState('all');
    const [showDriverModal, setShowDriverModal] = useState(false);
    const [selectedForAssignment, setSelectedForAssignment] = useState(null);
    const [assigningDriver, setAssigningDriver] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [selectedClientForLocation, setSelectedClientForLocation] = useState(null);
    const [savingLocation, setSavingLocation] = useState(false);
    const items = type === 'requests' ? requests : clients;

    // Custom cluster icon with smooth styling and count
    const createClusterIcon = (cluster) => {
        const count = cluster.getChildCount();
        const size = count < 10 ? 40 : count < 50 ? 48 : 56;
        const color = count < 10 ? '#0ea5e9' : count < 50 ? '#f59e0b' : '#ef4444';

        return L.divIcon({
            html: `
                <div style="
                    background:${color};
                    color:white;
                    width:${size}px;
                    height:${size}px;
                    border-radius:50%;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-weight:700;
                    box-shadow:0 6px 14px rgba(0,0,0,0.25);
                    border:3px solid white;
                ">
                    ${count}
                </div>
            `,
            className: 'cluster-icon',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
        });
    };

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
        let list = itemsWithCurrentUrgency;
        if (urgencyFilter !== 'all') {
            list = list.filter(item => item.currentUrgency === urgencyFilter);
        }
        if (wasteFilter !== 'all') {
            // Find the waste type object to get both id and name for flexible matching
            const selectedWasteType = wasteTypes.find(wt => (wt.id || wt.name) === wasteFilter);
            list = list.filter(item => {
                // Match by ID, name, or label (handles both old JSONB and new table formats)
                return item.waste_type === wasteFilter ||
                       item.waste_type === selectedWasteType?.id ||
                       item.waste_type === selectedWasteType?.name ||
                       item.waste_label === selectedWasteType?.label ||
                       item.waste_label === selectedWasteType?.name;
            });
        }
        return list;
    }, [itemsWithCurrentUrgency, type, urgencyFilter, wasteFilter, wasteTypes]);

    // Calculate positions for items WITH valid coordinates only
    // Items without coordinates are shown ONLY in the sidebar, NOT on the map
    const markers = useMemo(() => {
        const withCoords = [];

        filteredItems.forEach((item, index) => {
            const lat = item.latitude ? parseFloat(item.latitude) : null;
            const lng = item.longitude ? parseFloat(item.longitude) : null;
            const hasValidCoords = lat && lng && !isNaN(lat) && !isNaN(lng);

            if (hasValidCoords) {
                withCoords.push({ item, position: [lat, lng], index, hasCoords: true });
            }
            // Items without coordinates are NOT added to markers - they appear only in sidebar
        });

        return withCoords;
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

    // Get requests without location, grouped by client
    const requestsWithoutLocation = useMemo(() => {
        if (type !== 'requests') return { clients: [], total: 0 };

        const withoutCoords = itemsWithCurrentUrgency.filter(item => {
            const lat = item.latitude ? parseFloat(item.latitude) : null;
            const lng = item.longitude ? parseFloat(item.longitude) : null;
            const hasNoLocation = !lat || !lng || isNaN(lat) || isNaN(lng);
            return hasNoLocation;
        });

        // Debug: Log breakdown
        console.log('[MapView] Request breakdown:', {
            total: itemsWithCurrentUrgency.length,
            withCoords: itemsWithCurrentUrgency.length - withoutCoords.length,
            withoutCoords: withoutCoords.length
        });

        // Group by client_id
        const byClient = {};
        withoutCoords.forEach(req => {
            // Some zahtevi koriste user_id umesto client_id
            const clientId = req.client_id || req.user_id;
            if (!clientId) return; // safety guard

            if (!byClient[clientId]) {
                byClient[clientId] = {
                    clientId,
                    clientName: req.client_name || req.name || 'Klijent',
                    clientPhone: req.client_phone || req.phone || '',
                    clientAddress: req.client_address || req.address || '',
                    requests: []
                };
            }
            byClient[clientId].requests.push(req);
        });

        return {
            clients: Object.values(byClient),
            total: withoutCoords.length
        };
    }, [itemsWithCurrentUrgency, type]);

    // Handle setting client location
    const handleSetClientLocation = async (position) => {
        if (!onSetClientLocation || !selectedClientForLocation) return;

        setSavingLocation(true);
        try {
            await onSetClientLocation(selectedClientForLocation.clientId, position[0], position[1]);
            toast.success(`Lokacija za ${selectedClientForLocation.clientName} je sačuvana`);
            setShowLocationPicker(false);
            setSelectedClientForLocation(null);
        } catch (err) {
            toast.error('Greška pri čuvanju lokacije: ' + err.message);
        } finally {
            setSavingLocation(false);
        }
    };

    // Open location picker for a client
    const openLocationPickerForClient = (clientData) => {
        setSelectedClientForLocation(clientData);
        setShowLocationPicker(true);
    };

    return (
        <div className="bg-white rounded-2xl border overflow-hidden h-full flex flex-col">
            {/* Urgency Filter - Only show for requests */}
            {type === 'requests' && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 border-b">
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
                    <div className="h-6 w-px bg-slate-200 mx-1" />
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Vrsta otpada:</span>
                        <select
                            value={wasteFilter}
                            onChange={(e) => setWasteFilter(e.target.value)}
                            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        >
                            <option value="all">Sve vrste</option>
                            {(wasteTypes || []).map(wt => (
                                <option key={wt.id || wt.name} value={wt.id || wt.name}>
                                    {wt.label || wt.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}
            {/* Main content area with sidebar */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar for requests without location */}
                {type === 'requests' && requestsWithoutLocation.total > 0 && (
                    <div className={`bg-white border-r transition-all duration-300 flex flex-col ${sidebarOpen ? 'w-80' : 'w-0'}`}>
                        {sidebarOpen && (
                            <>
                                <div className="p-3 bg-amber-50 border-b flex items-center gap-2">
                                    <AlertTriangle className="text-amber-500" size={18} />
                                    <span className="text-sm font-medium text-amber-800">
                                        Bez lokacije ({requestsWithoutLocation.total})
                                    </span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                    {requestsWithoutLocation.clients.map(clientData => (
                                        <div key={clientData.clientId} className="bg-slate-50 rounded-xl p-3 border">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-slate-800 truncate">{clientData.clientName}</p>
                                                    <p className="text-xs text-slate-500 truncate">{clientData.clientPhone}</p>
                                                    {clientData.clientAddress && (
                                                        <p className="text-xs text-slate-400 truncate mt-0.5">{clientData.clientAddress}</p>
                                                    )}
                                                </div>
                                                <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                                    {clientData.requests.length} {clientData.requests.length === 1 ? 'zahtev' : 'zahteva'}
                                                </span>
                                            </div>
                                            <div className="space-y-1 mb-2">
                                                {clientData.requests.slice(0, 3).map(req => (
                                                    <div key={req.id} className="flex items-center gap-2 text-xs text-slate-600">
                                                        <span>{getWasteIcon(req.waste_type)}</span>
                                                        <span className="truncate flex-1">{req.waste_label}</span>
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                            req.currentUrgency === '24h' ? 'bg-red-100 text-red-700' :
                                                            req.currentUrgency === '48h' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-emerald-100 text-emerald-700'
                                                        }`}>
                                                            {req.currentUrgency === '24h' ? 'Hitno' : req.currentUrgency === '48h' ? 'Srednje' : 'Norm.'}
                                                        </span>
                                                    </div>
                                                ))}
                                                {clientData.requests.length > 3 && (
                                                    <p className="text-xs text-slate-400 pl-5">+{clientData.requests.length - 3} više...</p>
                                                )}
                                            </div>
                                            {onSetClientLocation && (
                                                <button
                                                    onClick={() => openLocationPickerForClient(clientData)}
                                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
                                                >
                                                    <MapPin size={14} />
                                                    Podesi lokaciju klijenta
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Sidebar toggle button */}
                {type === 'requests' && requestsWithoutLocation.total > 0 && (
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-[1000] bg-white border rounded-r-lg p-1 shadow-md hover:bg-slate-50"
                        style={{ marginLeft: sidebarOpen ? '320px' : '0' }}
                    >
                        {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        {!sidebarOpen && requestsWithoutLocation.total > 0 && (
                            <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                                {requestsWithoutLocation.total}
                            </span>
                        )}
                    </button>
                )}

                {/* Map */}
                <div className="flex-1 relative">
            <MapContainer
                center={[44.8, 20.45]}
                zoom={11}
                preferCanvas={true}
                wheelDebounceTime={20}
                wheelPxPerZoomLevel={80}
                className="h-full w-full"
                style={{ minHeight: '400px' }}
            >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <FitBounds positions={allPositions} fitOnChange={true} trigger={urgencyFilter} />

                <MarkerClusterGroup
                    chunkedLoading
                    showCoverageOnHover={false}
                    spiderfyOnEveryZoom={false}
                    spiderfyDistanceMultiplier={1.2}
                    iconCreateFunction={createClusterIcon}
                >
                    {markers.map(({ item, position, index }) => (
                        <Marker
                            key={`${item.id || index}`}
                            position={position}
                            icon={createCustomIcon(item.currentUrgency || item.urgency, type === 'requests' ? getWasteIcon(item.waste_type) : '🏢', type === 'clients')}
                        >
                            <Popup>
                                <p className="font-semibold text-slate-900 text-base">{type === 'requests' ? item.client_name : item.name}</p>
                                <p className="text-sm text-slate-600 mb-2">{type === 'requests' ? item.waste_label : item.phone}</p>
                                <p className="text-xs text-slate-500 leading-relaxed">{type === 'requests' ? item.client_address : item.address}</p>
                                {type === 'requests' && item.currentUrgency && (
                                    <p className={`text-xs font-semibold mt-2 flex items-center gap-1 ${item.currentUrgency === '24h' ? 'text-red-600' : item.currentUrgency === '48h' ? 'text-amber-600' : 'text-emerald-600'}`}>
                                        ⏱ {item.currentUrgency === '24h' ? 'Hitno' : item.currentUrgency === '48h' ? 'Srednje' : 'Normalno'}
                                    </p>
                                )}
                                {type === 'requests' && (
                                    <div className="flex gap-2 mt-3">
                                        <a
                                            href={`https://www.google.com/maps/dir/?api=1&destination=${position[0]},${position[1]}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-2.5 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 shadow-sm font-semibold"
                                            style={{ color: '#fff' }}
                                        >
                                            Google Maps
                                        </a>
                                        <a
                                            href={`https://waze.com/ul?ll=${position[0]},${position[1]}&navigate=yes`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-2.5 py-1.5 bg-cyan-600 text-white text-xs rounded-lg hover:bg-cyan-700 shadow-sm font-semibold"
                                            style={{ color: '#fff' }}
                                        >
                                            Waze
                                        </a>
                                    </div>
                                )}
                                {type === 'requests' && drivers.length > 0 && onAssignDriver && (
                                    <div className="mt-3 pt-2 border-t">
                                        {getAssignment(item.id) ? (
                                            <div className="text-xs text-slate-600">
                                                <span className="text-slate-500">Dodeljeno: </span>
                                                <span className="font-semibold text-emerald-600">{getAssignment(item.id)?.driver?.name}</span>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => openDriverModal(item)}
                                                className="w-full px-3 py-2 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-1 font-semibold shadow-sm"
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
                </div>
            </div>

            {/* Location Picker Modal */}
            {showLocationPicker && selectedClientForLocation && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl">
                        <div className="p-4 border-b flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="font-bold text-slate-800">Podesi lokaciju klijenta</h3>
                                <p className="text-sm text-slate-500">{selectedClientForLocation.clientName}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowLocationPicker(false);
                                    setSelectedClientForLocation(null);
                                }}
                                className="p-2 hover:bg-slate-200 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4">
                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                <p className="text-sm text-amber-800">
                                    <strong>{selectedClientForLocation.requests.length}</strong> zahtev(a) ovog klijenta nema lokaciju.
                                    Nakon podešavanja, svi zahtevi ovog klijenta ce biti ažurirani sa novom lokacijom.
                                </p>
                            </div>
                            <LocationPicker
                                clientName={selectedClientForLocation.clientName}
                                initialPosition={[44.8, 20.45]}
                                onSave={handleSetClientLocation}
                                onCancel={() => {
                                    setShowLocationPicker(false);
                                    setSelectedClientForLocation(null);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

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
