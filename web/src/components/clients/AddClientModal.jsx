import { useState, useEffect, useRef } from 'react';
import { UserPlus, Phone, MapPin, StickyNote, AlertCircle, Search, X } from 'lucide-react';
import { Modal, RecycleLoader } from '../common';
import { normalizePhone, validatePhone, COUNTRY_CODES } from '../../utils/phoneUtils';

/**
 * AddClientModal - Modal za brzo dodavanje jednog shadow klijenta
 * Alternativa Excel importu za brzo dodavanje 1-2 klijenta
 */
export const AddClientModal = ({ open, onClose, onAdd, existingPhones = [] }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('+381');
    const [address, setAddress] = useState('');
    const [latitude, setLatitude] = useState(null);
    const [longitude, setLongitude] = useState(null);
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const suggestionsRef = useRef(null);
    const addressInputRef = useRef(null);

    // Address search with debounce (Nominatim API)
    useEffect(() => {
        if (address.length < 3) {
            setAddressSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const timer = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=rs,ba,hr,si,me,mk&limit=5&addressdetails=1`,
                    { headers: { 'Accept-Language': 'sr,hr,bs,sl,mk' } }
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
    }, [address]);

    // Close suggestions on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
                addressInputRef.current && !addressInputRef.current.contains(event.target)
            ) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAddressSelect = (suggestion) => {
        setAddress(suggestion.display_name);
        setLatitude(parseFloat(suggestion.lat));
        setLongitude(parseFloat(suggestion.lon));
        setShowSuggestions(false);
    };

    const resetForm = () => {
        setName('');
        setPhone('');
        setCountryCode('+381');
        setAddress('');
        setLatitude(null);
        setLongitude(null);
        setAddressSuggestions([]);
        setShowSuggestions(false);
        setNote('');
        setError('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validacija
        if (!name.trim()) {
            setError('Ime je obavezno');
            return;
        }

        if (!phone.trim()) {
            setError('Telefon je obavezan');
            return;
        }

        const validation = validatePhone(phone, countryCode);
        if (!validation.valid) {
            setError(validation.error);
            return;
        }

        const normalizedPhone = normalizePhone(phone, countryCode);

        // Proveri duplikate
        const existingNormalized = existingPhones.map(p => normalizePhone(p));
        if (existingNormalized.includes(normalizedPhone)) {
            setError('Klijent sa ovim brojem telefona već postoji');
            return;
        }

        setSaving(true);
        try {
            const clientData = {
                name: name.trim(),
                phone: normalizedPhone,
                address: address.trim() || null,
                latitude: latitude,
                longitude: longitude,
                note: note.trim() || null
            };

            await onAdd(clientData);
            handleClose();
        } catch (err) {
            console.error('Error adding client:', err);
            setError(err.message || 'Greška pri dodavanju klijenta');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal open={open} onClose={handleClose} title="Dodaj klijenta">
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-slate-600">
                    Brzo dodavanje shadow klijenta. Klijent će moći da preuzme nalog kada instalira aplikaciju.
                </p>

                {/* Ime */}
                <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                        Ime i prezime <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="npr. Petar Petrović"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        autoFocus
                    />
                </div>

                {/* Telefon */}
                <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                        Telefon <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                        <select
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            className="w-28 px-3 py-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm"
                        >
                            {COUNTRY_CODES.map(cc => (
                                <option key={cc.code} value={cc.code}>
                                    {cc.flag} {cc.code}
                                </option>
                            ))}
                        </select>
                        <div className="flex-1 relative">
                            <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="0641234567"
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Adresa sa autocomplete */}
                <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                        Adresa <span className="text-slate-400 font-normal">(opciono)</span>
                    </label>
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            ref={addressInputRef}
                            type="text"
                            value={address}
                            onChange={(e) => {
                                setAddress(e.target.value);
                                // Korisnik je izmenio adresu - obriši koordinate dok ne izabere novu
                                setLatitude(null);
                                setLongitude(null);
                            }}
                            onFocus={() => addressSuggestions.length > 0 && setShowSuggestions(true)}
                            placeholder="Pretražite adresu..."
                            className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        />
                        {address && (
                            <button
                                type="button"
                                onClick={() => { setAddress(''); setLatitude(null); setLongitude(null); setAddressSuggestions([]); setShowSuggestions(false); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={18} />
                            </button>
                        )}
                        {searchLoading && (
                            <RecycleLoader size={16} className="absolute right-9 top-1/2 -translate-y-1/2 text-emerald-500" />
                        )}

                        {/* Suggestions dropdown */}
                        {showSuggestions && addressSuggestions.length > 0 && (
                            <div
                                ref={suggestionsRef}
                                className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto"
                            >
                                {addressSuggestions.map((suggestion, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleAddressSelect(suggestion)}
                                        className="w-full px-4 py-2.5 text-left hover:bg-emerald-50 flex items-start gap-2.5 border-b last:border-b-0"
                                    >
                                        <MapPin size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                                        <span className="text-sm text-slate-700 line-clamp-2">{suggestion.display_name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {latitude && longitude && (
                        <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                            <MapPin size={12} />
                            Lokacija postavljena ({latitude.toFixed(4)}, {longitude.toFixed(4)})
                        </p>
                    )}
                </div>

                {/* Napomena */}
                <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                        Napomena <span className="text-slate-400 font-normal">(opciono)</span>
                    </label>
                    <div className="relative">
                        <StickyNote size={18} className="absolute left-3 top-3 text-slate-400" />
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="npr. VIP klijent, lokacija iza zgrade..."
                            rows={2}
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"
                        />
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                        <AlertCircle size={18} className="text-red-500 shrink-0" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={saving}
                        className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium disabled:opacity-50"
                    >
                        Odustani
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <>
                                <RecycleLoader size={18} className="text-white" />
                                Dodajem...
                            </>
                        ) : (
                            <>
                                <UserPlus size={18} />
                                Dodaj klijenta
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AddClientModal;
