import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Truck, MapPin } from 'lucide-react';

// Create driver marker icon
const createDriverIcon = (isActive) => {
  const color = isActive ? '#10b981' : '#94a3b8';
  return L.divIcon({
    html: `
      <div style="
        background: ${color};
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        border: 2px solid white;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
          <path d="M15 18H9"/>
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
          <circle cx="17" cy="18" r="2"/>
          <circle cx="7" cy="18" r="2"/>
        </svg>
      </div>
    `,
    className: 'driver-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Create request marker icon
const createRequestIcon = (urgency) => {
  const colors = {
    high: '#ef4444',
    normal: '#f59e0b',
    low: '#10b981',
  };
  const color = colors[urgency] || colors.normal;

  return L.divIcon({
    html: `
      <div style="
        background: ${color};
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        border: 2px solid white;
        font-size: 10px;
        font-weight: bold;
      ">
        📦
      </div>
    `,
    className: 'request-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const LiveMapPreview = ({
  drivers = [],
  driverLocations = [],
  requests = [],
  driversOnField = 0,
  driversAtBase = 0,
  onLiveView,
  center = [43.85, 20.85], // Default: Serbia center
  zoom = 8,
}) => {
  // Combine drivers with their locations
  const driversWithLocation = useMemo(() => {
    return drivers
      .map(driver => {
        const location = driverLocations.find(loc => loc.driver_id === driver.id);
        return {
          ...driver,
          latitude: location?.latitude,
          longitude: location?.longitude,
          lastUpdate: location?.updated_at,
        };
      })
      .filter(d => d.latitude && d.longitude);
  }, [drivers, driverLocations]);

  // Get requests with valid coordinates
  const requestsWithCoords = useMemo(() => {
    return requests
      .filter(r => r.latitude && r.longitude)
      .slice(0, 20); // Limit to 20 for performance
  }, [requests]);

  // Calculate map center based on data
  const mapCenter = useMemo(() => {
    const points = [
      ...driversWithLocation.map(d => [d.latitude, d.longitude]),
      ...requestsWithCoords.map(r => [parseFloat(r.latitude), parseFloat(r.longitude)]),
    ];

    if (points.length === 0) return center;

    const avgLat = points.reduce((sum, p) => sum + p[0], 0) / points.length;
    const avgLng = points.reduce((sum, p) => sum + p[1], 0) / points.length;

    return [avgLat, avgLng];
  }, [driversWithLocation, requestsWithCoords, center]);

  return (
    <div className="h-full bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
      {/* Leaflet Map */}
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Driver markers */}
        {driversWithLocation.map(driver => (
          <Marker
            key={driver.id}
            position={[driver.latitude, driver.longitude]}
            icon={createDriverIcon(driver.status === 'busy')}
          >
            <Popup>
              <div className="text-center">
                <p className="font-bold text-slate-800">{driver.name}</p>
                <p className={`text-xs ${driver.status === 'busy' ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {driver.status === 'busy' ? 'Na terenu' : 'Slobodan'}
                </p>
                {driver.lastUpdate && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Ažurirano: {new Date(driver.lastUpdate).toLocaleTimeString('sr-RS')}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Request markers */}
        {requestsWithCoords.map(request => (
          <Marker
            key={request.id}
            position={[parseFloat(request.latitude), parseFloat(request.longitude)]}
            icon={createRequestIcon(request.urgency)}
          >
            <Popup>
              <div>
                <p className="font-bold text-slate-800 text-sm">{request.client_name}</p>
                <p className="text-xs text-slate-500">{request.waste_label || request.waste_type}</p>
                <p className="text-[10px] text-slate-400 mt-1">{request.client_address}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Overlay Controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-2 z-[1000]">
        <button
          onClick={onLiveView}
          className="p-2 bg-white rounded-lg shadow-md border border-slate-100 text-slate-600 hover:text-emerald-600 hover:scale-105 transition-all"
        >
          <Navigation size={18} />
        </button>
      </div>

      {/* No data overlay */}
      {driversWithLocation.length === 0 && requestsWithCoords.length === 0 && (
        <div className="absolute inset-0 bg-slate-100/80 flex items-center justify-center z-[500]">
          <div className="text-center">
            <MapPin size={32} className="mx-auto mb-2 text-slate-400" />
            <p className="text-sm text-slate-500">Nema podataka o lokacijama</p>
            <p className="text-xs text-slate-400">Vozači još nisu registrovali lokaciju</p>
          </div>
        </div>
      )}

      {/* Bottom Status Bar */}
      <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-white/50 shadow-lg flex items-center justify-between z-[1000]">
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
            Status Flote
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-bold text-slate-700">
                {driversOnField} na terenu
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-300" />
              <span className="text-xs font-medium text-slate-500">
                {driversAtBase} u bazi
              </span>
            </div>
          </div>
        </div>
        {onLiveView && (
          <button
            onClick={onLiveView}
            className="text-xs font-bold text-white bg-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20"
          >
            Live View →
          </button>
        )}
      </div>
    </div>
  );
};

export default LiveMapPreview;
