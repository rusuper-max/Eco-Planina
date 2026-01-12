import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mountain, User, Phone, Lock, MapPin, Building2, Eye, EyeOff, Loader2, ArrowLeft, UserCog, Users, ChevronDown } from 'lucide-react';

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
    const [joinExisting, setJoinExisting] = useState(false);
    const [countryCode, setCountryCode] = useState('+381');
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);
    const [formData, setFormData] = useState({ name: '', phone: '', password: '', address: '', companyCode: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
                companyCode: formData.companyCode,
                role,
                joinExisting
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
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
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
                            onClick={() => step === 3 ? setStep(2) : step === 2 && role === 'manager' ? setStep(1) : setStep(1)}
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
                                <p className="text-slate-500 text-sm">Kako planirate da koristite EcoPlanina sistem?</p>
                            </div>
                            <div className="grid gap-4">
                                <RoleCard
                                    icon={Users}
                                    title="Klijent"
                                    desc="Prijavljujem preuzimanje otpada od moje firme"
                                    selected={role === 'client'}
                                    onClick={() => { setRole('client'); setStep(3); }}
                                />
                                <RoleCard
                                    icon={UserCog}
                                    title="Menadžer"
                                    desc="Upravljam preuzimanjem otpada za klijente"
                                    selected={role === 'manager'}
                                    onClick={() => { setRole('manager'); setStep(2); }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Manager Options */}
                    {step === 2 && role === 'manager' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 mb-2">Opcije za menadžera</h2>
                                <p className="text-slate-500 text-sm">Da li se pridružujete postojećoj firmi ili kreirate novu?</p>
                            </div>
                            <div className="grid gap-4">
                                <RoleCard
                                    icon={Building2}
                                    title="Kreiraj novu firmu"
                                    desc="Imam Master Code i želim da registrujem novu firmu"
                                    selected={!joinExisting}
                                    onClick={() => { setJoinExisting(false); setStep(3); }}
                                />
                                <RoleCard
                                    icon={Users}
                                    title="Pridruži se postojećoj"
                                    desc="Imam ECO kod i želim da se pridružim kao menadžer"
                                    selected={joinExisting}
                                    onClick={() => { setJoinExisting(true); setStep(3); }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Registration Form */}
                    {step === 3 && (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 mb-2">
                                    {role === 'client' ? 'Registracija klijenta' : joinExisting ? 'Pridruživanje firmi' : 'Kreiranje firme'}
                                </h2>
                                <p className="text-slate-500 text-sm">Unesite vaše podatke za registraciju</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Ime i prezime</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Petar Petrović"
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

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Adresa</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="Ulica i broj, Grad"
                                        className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    {role === 'client' ? 'ECO Kod firme' : joinExisting ? 'ECO Kod firme' : 'Master Code'}
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={formData.companyCode}
                                        onChange={(e) => setFormData({ ...formData, companyCode: e.target.value.toUpperCase() })}
                                        placeholder={role === 'manager' && !joinExisting ? 'MC-XXXXXX' : 'ECO-XXXX'}
                                        className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all uppercase"
                                        required
                                    />
                                </div>
                                <p className="mt-2 text-xs text-slate-500">
                                    {role === 'client'
                                        ? 'Dobićete ECO kod od vašeg menadžera otpada'
                                        : joinExisting
                                            ? 'Unesite ECO kod firme kojoj se pridružujete'
                                            : 'Master Code dobijate od EcoPlanina administratora'}
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
