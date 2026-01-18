import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvents, useMap } from 'react-leaflet';
import { DraggableMarker } from './DraggableMarker';
import { Search, MapPin, X } from 'lucide-react';
import { RecycleLoader } from '../common';

/**
 * Helper component to fly to position when it changes
 */
const FlyToPosition = ({ position }) => {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.flyTo(position, 15, { duration: 0.8 });
        }
    }, [map, position]);
    return null;
};

/**
 * Location picker component with address search and map interaction
 * - Address search with Nominatim autocomplete
 * - Click on map to set position
 * - Drag marker to adjust
 * - Manual coordinate input
 */
export const LocationPicker = ({ initialPosition, onSave, onCancel, clientName }) => {
    const [position, setPosition] = useState(initialPosition || [44.8, 20.45]);
    const [manualLat, setManualLat] = useState(position[0].toString());
    const [manualLng, setManualLng] = useState(position[1].toString());
    const [hasUserInteraction, setHasUserInteraction] = useState(false);

    // Address search state
    const [addressQuery, setAddressQuery] = useState('');
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState('');

    const suggestionsRef = useRef(null);
    const inputRef = useRef(null);

    // Address search with debounce (Nominatim API)
    useEffect(() => {
        if (addressQuery.length < 3) {
            setAddressSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const timer = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}&countrycodes=rs,ba,hr,si,me,mk&limit=5&addressdetails=1`,
                    {
                        headers: {
                            'Accept-Language': 'sr,hr,bs,sl,mk'
                        }
                    }
                );
                const data = await response.json();
                setAddressSuggestions(data);
                setShowSuggestions(data.length > 0);
            } catch (err) {
                console.error('Address search error:', err);
                setAddressSuggestions([]);
            } finally {
                setSearchLoading(false);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [addressQuery]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                suggestionsRef.current &&
                !suggestionsRef.current.contains(event.target) &&
                inputRef.current &&
                !inputRef.current.contains(event.target)
            ) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle address selection
    const handleAddressSelect = (suggestion) => {
        const newLat = parseFloat(suggestion.lat);
        const newLng = parseFloat(suggestion.lon);
        setPosition([newLat, newLng]);
        setManualLat(newLat.toFixed(6));
        setManualLng(newLng.toFixed(6));
        setAddressQuery(suggestion.display_name);
        setSelectedAddress(suggestion.display_name);
        setShowSuggestions(false);
        setHasUserInteraction(true);
    };

    const MapClickHandler = () => {
        useMapEvents({
            click(e) {
                const newPos = [e.latlng.lat, e.latlng.lng];
                setPosition(newPos);
                setManualLat(e.latlng.lat.toFixed(6));
                setManualLng(e.latlng.lng.toFixed(6));
                setHasUserInteraction(true);
                // Clear selected address since user clicked on map
                setSelectedAddress('');
            },
        });
        return null;
    };

    const handleManualUpdate = () => {
        const lat = parseFloat(manualLat);
        const lng = parseFloat(manualLng);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            setPosition([lat, lng]);
            setHasUserInteraction(true);
            setSelectedAddress('');
        }
    };

    const handlePositionChange = (newPos) => {
        setPosition(newPos);
        setManualLat(newPos[0].toFixed(6));
        setManualLng(newPos[1].toFixed(6));
        setHasUserInteraction(true);
        setSelectedAddress('');
    };

    // Clear address search
    const clearSearch = () => {
        setAddressQuery('');
        setSelectedAddress('');
        setAddressSuggestions([]);
        setShowSuggestions(false);
    };

    // Check if position is valid for saving
    const isValidPosition = position &&
        !isNaN(position[0]) &&
        !isNaN(position[1]) &&
        position[0] !== 0 &&
        position[1] !== 0;

    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-600">
                Pretražite adresu ili kliknite na mapu da postavite lokaciju za <strong>{clientName}</strong>
            </p>

            {/* Address Search */}
            <div className="relative">
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={addressQuery}
                        onChange={(e) => setAddressQuery(e.target.value)}
                        onFocus={() => addressSuggestions.length > 0 && setShowSuggestions(true)}
                        placeholder="Pretražite adresu (npr. Knez Mihailova, Beograd)"
                        className="w-full pl-10 pr-10 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none text-sm"
                    />
                    {addressQuery && (
                        <button
                            onClick={clearSearch}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X size={18} />
                        </button>
                    )}
                    {searchLoading && (
                        <RecycleLoader size={18} className="absolute right-10 top-1/2 -translate-y-1/2 text-emerald-500" />
                    )}
                </div>

                {/* Suggestions dropdown */}
                {showSuggestions && addressSuggestions.length > 0 && (
                    <div
                        ref={suggestionsRef}
                        className="absolute z-[10000] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto"
                    >
                        {addressSuggestions.map((suggestion, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleAddressSelect(suggestion)}
                                className="w-full px-4 py-3 text-left hover:bg-emerald-50 flex items-start gap-3 border-b last:border-b-0"
                            >
                                <MapPin size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                                <span className="text-sm text-slate-700 line-clamp-2">{suggestion.display_name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Selected address display */}
            {selectedAddress && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <MapPin size={16} className="text-emerald-600 shrink-0" />
                    <span className="text-sm text-emerald-800 line-clamp-1 flex-1">{selectedAddress}</span>
                    <button onClick={clearSearch} className="text-emerald-600 hover:text-emerald-800">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Map */}
            <div className="rounded-xl overflow-hidden border" style={{ height: '350px' }}>
                <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapClickHandler />
                    <DraggableMarker position={position} onPositionChange={handlePositionChange} />
                    {selectedAddress && <FlyToPosition position={position} />}
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

            {/* Actions */}
            <div className="flex gap-3 justify-end">
                <button onClick={onCancel} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">
                    Otkaži
                </button>
                <button
                    onClick={() => onSave(position)}
                    disabled={!isValidPosition}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isValidPosition
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                >
                    Sačuvaj lokaciju
                </button>
            </div>
        </div>
    );
};

export default LocationPicker;

