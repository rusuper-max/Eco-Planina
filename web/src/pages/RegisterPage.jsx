import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context';
import { Mountain, Phone, Lock, MapPin, Building2, Eye, EyeOff, Loader2, ArrowLeft, UserCog, Users, ChevronDown, Search, Truck } from 'lucide-react';

const COUNTRY_CODES = [
    { code: '+381', country: 'Srbija', flag: '🇷🇸' },
    { code: '+387', country: 'BiH', flag: '🇧🇦' },
    { code: '+385', country: 'Hrvatska', flag: '🇭🇷' },
    { code: '+386', country: 'Slovenija', flag: '🇸🇮' },
    { code: '+382', country: 'Crna Gora', flag: '🇲🇪' },
    { code: '+389', country: 'S. Makedonija', flag: '🇲🇰' },
];

export default function RegisterPage() {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [step, setStep] = useState(1);
    const [role, setRole] = useState(null);
    const [countryCode, setCountryCode] = useState('+381');
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);
    const [formData, setFormData] = useState({ name: '', phone: '', password: '', address: '', companyCode: '', latitude: null, longitude: null });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Address autocomplete state
    const [addressQuery, setAddressQuery] = useState('');
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
    const [addressLoading, setAddressLoading] = useState(false);
    const addressInputRef = useRef(null);
    const suggestionsRef = useRef(null);

    // Debounced address search
    useEffect(() => {
        if (addressQuery.length < 3) {
            setAddressSuggestions([]);
            return;
        }

        const timer = setTimeout(async () => {
            setAddressLoading(true);
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
                setShowAddressSuggestions(data.length > 0);
            } catch (err) {
                console.error('Address search error:', err);
                setAddressSuggestions([]);
            } finally {
                setAddressLoading(false);
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
                addressInputRef.current &&
                !addressInputRef.current.contains(event.target)
            ) {
                setShowAddressSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAddressSelect = (suggestion) => {
        setFormData({
            ...formData,
            address: suggestion.display_name,
            latitude: parseFloat(suggestion.lat),
            longitude: parseFloat(suggestion.lon)
        });
        setAddressQuery(suggestion.display_name);
        setShowAddressSuggestions(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            let phoneNumber = formData.phone.trim().replace(/\s/g, '');
            if (phoneNumber.startsWith('0')) phoneNumber = phoneNumber.slice(1);
            const formattedPhone = countryCode + phoneNumber;

            await register({
                name: formData.name,
                phone: formattedPhone,
                password: formData.password,
                address: formData.address,
                latitude: formData.latitude,
                longitude: formData.longitude,
                companyCode: formData.companyCode,
                role
            });
            navigate('/', { state: { registered: true } });
        } catch (err) {
            setError(err.message || 'Greška pri registraciji');
        } finally {
            setLoading(false);
        }
    };

    const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode);

    const RoleCard = ({ icon: Icon, title, desc, selected, onClick }) => (
        <button
            type="button"
            onClick={onClick}
            className={`w-full p-6 rounded-2xl border-2 transition-all text-left ${selected
                ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-100'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                }`}
        >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${selected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                <Icon size={24} />
            </div>
            <h3 className={`font-bold text-lg mb-1 ${selected ? 'text-emerald-700' : 'text-slate-800'}`}>{title}</h3>
            <p className="text-sm text-slate-500">{desc}</p>
        </button>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center opacity-90 pointer-events-none"
                style={{ backgroundImage: 'url(https://vmsfsstxxndpxbsdylog.supabase.co/storage/v1/object/public/assets/background.jpg)' }}
            />
            <div className="w-full max-w-lg relative z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200 mb-4">
                        <Mountain className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">EcoMountain<span className="text-emerald-600">T</span></h1>
                    <p className="text-slate-500 mt-1">Registracija novog naloga</p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">

                    {/* Back Button */}
                    {step > 1 && (
                        <button
                            type="button"
                            onClick={() => step === 3 ? (role === 'company_admin' ? setStep(2) : setStep(1)) : setStep(1)}
                            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 text-sm font-medium"
                        >
                            <ArrowLeft size={16} /> Nazad
                        </button>
                    )}

                    {error && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    {/* Step 1: Choose Role */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 mb-2">Izaberite tip naloga</h2>
                                <p className="text-slate-500 text-sm">Kako planirate da koristite EcoMountainT sistem?</p>
                            </div>
                            <div className="grid gap-4">
                                <RoleCard
                                    icon={Building2}
                                    title="Registruj firmu"
                                    desc="Imam Master Code i želim da registrujem novu firmu"
                                    selected={role === 'company_admin'}
                                    onClick={() => { setRole('company_admin'); setStep(2); }}
                                />
                                <RoleCard
                                    icon={UserCog}
                                    title="Menadžer"
                                    desc="Pridružujem se postojećoj firmi kao menadžer"
                                    selected={role === 'manager'}
                                    onClick={() => { setRole('manager'); setStep(3); }}
                                />
                                <RoleCard
                                    icon={Truck}
                                    title="Vozač"
                                    desc="Preuzimam robu od klijenata po nalogu menadžera"
                                    selected={role === 'driver'}
                                    onClick={() => { setRole('driver'); setStep(3); }}
                                />
                                <RoleCard
                                    icon={Users}
                                    title="Klijent"
                                    desc="Prijavljujem preuzimanje robe od moje firme"
                                    selected={role === 'client'}
                                    onClick={() => { setRole('client'); setStep(3); }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Company Admin Info */}
                    {step === 2 && role === 'company_admin' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 mb-2">Registracija firme</h2>
                                <p className="text-slate-500 text-sm">Kao vlasnik firme, imaćete potpunu kontrolu nad vašom organizacijom.</p>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                <h3 className="font-semibold text-emerald-800 mb-2">Šta dobijate kao vlasnik firme:</h3>
                                <ul className="text-sm text-emerald-700 space-y-1">
                                    <li>✓ Upravljanje svim menadžerima i vozačima</li>
                                    <li>✓ Pregled svih zahteva i statistike</li>
                                    <li>✓ Pristup podešavanjima firme</li>
                                    <li>✓ Kontrola nad ECO kodom za nove članove</li>
                                </ul>
                            </div>
                            <button
                                type="button"
                                onClick={() => setStep(3)}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-emerald-200 transition-all"
                            >
                                Nastavi sa registracijom
                            </button>
                        </div>
                    )}

                    {/* Step 3: Registration Form */}
                    {step === 3 && (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 mb-2">
                                    {role === 'client' ? 'Registracija klijenta' : role === 'driver' ? 'Registracija vozača' : role === 'manager' ? 'Pridruživanje firmi' : 'Kreiranje firme'}
                                </h2>
                                <p className="text-slate-500 text-sm">Unesite vaše podatke za registraciju</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    {role === 'company_admin' ? 'Ime firme' : 'Ime i prezime'}
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder={role === 'company_admin' ? 'Naziv vaše firme' : 'Petar Petrović'}
                                        className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Broj telefona</label>
                                <div className="flex gap-2">
                                    {/* Country Code Dropdown */}
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                                            className="flex items-center gap-2 px-3 py-3 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors min-w-[100px]"
                                        >
                                            <span className="text-lg">{selectedCountry?.flag}</span>
                                            <span className="text-sm font-medium text-slate-700">{countryCode}</span>
                                            <ChevronDown size={16} className="text-slate-400" />
                                        </button>
                                        {showCountryDropdown && (
                                            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 min-w-[180px] py-1">
                                                {COUNTRY_CODES.map((c) => (
                                                    <button
                                                        key={c.code}
                                                        type="button"
                                                        onClick={() => { setCountryCode(c.code); setShowCountryDropdown(false); }}
                                                        className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors ${countryCode === c.code ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700'}`}
                                                    >
                                                        <span className="text-lg">{c.flag}</span>
                                                        <span className="text-sm font-medium">{c.code}</span>
                                                        <span className="text-xs text-slate-500">{c.country}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {/* Phone Input */}
                                    <div className="relative flex-1">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="60 123 4567"
                                            className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Lozinka</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="••••••••"
                                        className="w-full pl-12 pr-12 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Address field - not shown for drivers */}
                            {role !== 'driver' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Adresa</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            ref={addressInputRef}
                                            type="text"
                                            value={addressQuery}
                                            onChange={(e) => {
                                                setAddressQuery(e.target.value);
                                                setFormData({ ...formData, address: e.target.value, latitude: null, longitude: null });
                                            }}
                                            onFocus={() => addressSuggestions.length > 0 && setShowAddressSuggestions(true)}
                                            placeholder="Počnite kucati adresu..."
                                            className="w-full pl-12 pr-12 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                            required
                                        />
                                        {addressLoading && (
                                            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 animate-spin" />
                                        )}
                                        {!addressLoading && formData.latitude && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                        {showAddressSuggestions && addressSuggestions.length > 0 && (
                                            <div
                                                ref={suggestionsRef}
                                                className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto"
                                            >
                                                {addressSuggestions.map((suggestion, index) => (
                                                    <button
                                                        key={suggestion.place_id || index}
                                                        type="button"
                                                        onClick={() => handleAddressSelect(suggestion)}
                                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                                            <span className="text-sm text-slate-700 line-clamp-2">{suggestion.display_name}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {formData.latitude && formData.longitude && (
                                        <p className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            Lokacija potvrđena ({formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)})
                                        </p>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    {role === 'company_admin' ? 'Master Code' : 'ECO Kod firme'}
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={formData.companyCode}
                                        onChange={(e) => setFormData({ ...formData, companyCode: e.target.value.toUpperCase() })}
                                        placeholder={role === 'company_admin' ? 'MC-XXXXXX' : 'ECO-XXXX'}
                                        className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all uppercase"
                                        required
                                    />
                                </div>
                                <p className="mt-2 text-xs text-slate-500">
                                    {role === 'company_admin'
                                        ? 'Master Code dobijate od EcoMountainT administratora'
                                        : role === 'manager'
                                            ? 'Unesite ECO kod firme kojoj se pridružujete'
                                            : role === 'driver'
                                                ? 'Dobićete ECO kod od menadžera firme za koju vozite'
                                                : 'Dobićete ECO kod od vašeg menadžera'}
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Registruj se'}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <p className="text-slate-500 text-sm">
                            Već imate nalog?{' '}
                            <button onClick={() => navigate('/')} className="text-emerald-600 hover:text-emerald-700 font-medium">
                                Prijavite se
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
