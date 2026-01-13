import { useState } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { DraggableMarker } from './DraggableMarker';

/**
 * Location picker component for setting client position on map
 */
export const LocationPicker = ({ initialPosition, onSave, onCancel, clientName }) => {
    const [position, setPosition] = useState(initialPosition || [44.8, 20.45]);
    const [manualLat, setManualLat] = useState(position[0].toString());
    const [manualLng, setManualLng] = useState(position[1].toString());

    const MapClickHandler = () => {
        useMapEvents({
            click(e) {
                const newPos = [e.latlng.lat, e.latlng.lng];
                setPosition(newPos);
                setManualLat(e.latlng.lat.toFixed(6));
                setManualLng(e.latlng.lng.toFixed(6));
            },
        });
        return null;
    };

    const handleManualUpdate = () => {
        const lat = parseFloat(manualLat);
        const lng = parseFloat(manualLng);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            setPosition([lat, lng]);
        }
    };

    const handlePositionChange = (newPos) => {
        setPosition(newPos);
        setManualLat(newPos[0].toFixed(6));
        setManualLng(newPos[1].toFixed(6));
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-600">
                Kliknite na mapu ili prevucite marker da postavite lokaciju za <strong>{clientName}</strong>
            </p>
            <div className="rounded-xl overflow-hidden border" style={{ height: '350px' }}>
                <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapClickHandler />
                    <DraggableMarker position={position} onPositionChange={handlePositionChange} />
                </MapContainer>
            </div>
            {/* Manual coordinate input */}
            <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-2">Ili unesite koordinate ručno:</p>
                <div className="flex gap-3 items-end">
                    <div className="flex-1">
                        <label className="text-xs text-slate-600 mb-1 block">Latitude</label>
                        <input
                            type="text"
                            value={manualLat}
                            onChange={(e) => setManualLat(e.target.value)}
                            onBlur={handleManualUpdate}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                            placeholder="44.8"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs text-slate-600 mb-1 block">Longitude</label>
                        <input
                            type="text"
                            value={manualLng}
                            onChange={(e) => setManualLng(e.target.value)}
                            onBlur={handleManualUpdate}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                            placeholder="20.45"
                        />
                    </div>
                    <button
                        onClick={handleManualUpdate}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm"
                    >
                        Primeni
                    </button>
                </div>
            </div>
            <div className="flex gap-3 justify-end">
                <button onClick={onCancel} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">
                    Otkaži
                </button>
                <button onClick={() => onSave(position)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">
                    Sačuvaj lokaciju
                </button>
            </div>
        </div>
    );
};

export default LocationPicker;
