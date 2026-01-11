import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Mountain, Phone, Lock, LogIn, ChevronDown } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+381', flag: '🇷🇸', name: 'Srbija' },
  { code: '+387', flag: '🇧🇦', name: 'BiH' },
  { code: '+382', flag: '🇲🇪', name: 'Crna Gora' },
  { code: '+385', flag: '🇭🇷', name: 'Hrvatska' },
  { code: '+386', flag: '🇸🇮', name: 'Slovenija' },
  { code: '+389', flag: '🇲🇰', name: 'S. Makedonija' },
  { code: '+43', flag: '🇦🇹', name: 'Austrija' },
  { code: '+49', flag: '🇩🇪', name: 'Nemačka' },
  { code: '+41', flag: '🇨🇭', name: 'Švajcarska' },
];

const LoginPage = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [countryCode, setCountryCode] = useState('+381');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const fullPhone = countryCode + phone.trim().replace(/^0+/, '');
      const result = await login(fullPhone, password);
      if (result.success) {
        navigate(result.role === 'manager' ? '/manager' : result.role === 'admin' || result.role === 'god' ? '/admin' : '/client');
      }
    } catch (err) {
      setError(err.message || 'Greška pri prijavi');
      toast.error(err.message || 'Greška pri prijavi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <Mountain size={48} className="logo-icon" />
          <h1>EcoPlanina</h1>
          <p>Pametno upravljanje otpadom</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <h2>Prijava</h2>
          <p className="form-subtitle">Ulogujte se na postojeći nalog</p>

          {error && <div className="error-message">{error}</div>}

          <div className="input-group">
            <label>Broj telefona</label>
            <p className="input-hint">Unesite broj bez vodeće nule (npr. 641234567)</p>
            <div className="phone-input-row">
              <div className="country-code-wrapper">
                <button
                  type="button"
                  className="country-code-btn"
                  onClick={() => setShowCountryPicker(!showCountryPicker)}
                >
                  <span className="country-flag">{selectedCountry.flag}</span>
                  <span className="country-code">{countryCode}</span>
                  <ChevronDown size={16} />
                </button>
                {showCountryPicker && (
                  <div className="country-picker-dropdown">
                    {COUNTRY_CODES.map((country) => (
                      <button
                        key={country.code}
                        type="button"
                        className={`country-option ${countryCode === country.code ? 'selected' : ''}`}
                        onClick={() => {
                          setCountryCode(country.code);
                          setShowCountryPicker(false);
                        }}
                      >
                        <span className="country-flag">{country.flag}</span>
                        <span className="country-name">{country.name}</span>
                        <span className="country-code">{country.code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="input-wrapper phone-input">
                <Phone size={20} />
                <input
                  type="tel"
                  inputMode="numeric"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="641234567"
                  required
                />
              </div>
            </div>
          </div>

          <div className="input-group">
            <label>Lozinka</label>
            <div className="input-wrapper">
              <Lock size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Unesite lozinku"
                required
              />
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading || !phone.trim()}>
            {loading ? (
              <span className="loading-spinner"></span>
            ) : (
              <>
                <LogIn size={20} />
                Prijavi se
              </>
            )}
          </button>
        </form>

        <p className="app-hint">
          Nemate nalog? <Link to="/register" className="link">Registrujte se</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
