import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context';
import { Mountain, Phone, Lock, Eye, EyeOff, Loader2, ChevronDown, CheckCircle } from 'lucide-react';

const COUNTRY_CODES = [
    { code: '+381', country: 'Srbija', flag: '🇷🇸' },
    { code: '+387', country: 'BiH', flag: '🇧🇦' },
    { code: '+385', country: 'Hrvatska', flag: '🇭🇷' },
    { code: '+386', country: 'Slovenija', flag: '🇸🇮' },
    { code: '+382', country: 'Crna Gora', flag: '🇲🇪' },
    { code: '+389', country: 'S. Makedonija', flag: '🇲🇰' },
];

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const [countryCode, setCountryCode] = useState('+381');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showCountryDropdown, setShowCountryDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Check if user just registered successfully
    const justRegistered = location.state?.registered;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            let phoneNumber = phone.trim().replace(/\s/g, '');
            if (phoneNumber.startsWith('0')) phoneNumber = phoneNumber.slice(1);
            const formattedPhone = countryCode + phoneNumber;

            const result = await login(formattedPhone, password);
            if (result.success) {
                if (result.role === 'developer' || result.role === 'admin') navigate('/admin');
                else if (result.role === 'manager') navigate('/manager');
                else if (result.role === 'driver') navigate('/driver');
                else navigate('/client');
            }
        } catch (err) {
            setError(err.message || 'Greška pri prijavi');
        } finally {
            setLoading(false);
        }
    };

    const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode);

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center opacity-90 pointer-events-none"
                style={{ backgroundImage: 'url(https://vmsfsstxxndpxbsdylog.supabase.co/storage/v1/object/public/assets/background.jpg)' }}
            />
            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200 mb-4">
                        <Mountain className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">EcoMountain<span className="text-emerald-600">T</span></h1>
                    <p className="text-slate-500 mt-1">Sistem za upravljanje robom</p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800 mb-6">Prijavite se</h2>

                    {justRegistered && (
                        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm flex items-center gap-2">
                            <CheckCircle size={18} />
                            Registracija uspešna! Sada se možete prijaviti.
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
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
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
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
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
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

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Prijavi se'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-slate-500 text-sm">
                            Nemate nalog?{' '}
                            <button onClick={() => navigate('/register')} className="text-emerald-600 hover:text-emerald-700 font-medium">
                                Registrujte se
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
