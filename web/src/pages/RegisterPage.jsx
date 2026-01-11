import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Mountain, Phone, Lock, User, MapPin, Building2, ChevronDown, UserPlus } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+381', flag: '🇷🇸', name: 'Srbija' },
  { code: '+387', flag: '🇧🇦', name: 'BiH' },
  { code: '+382', flag: '🇲🇪', name: 'Crna Gora' },
  { code: '+385', flag: '🇭🇷', name: 'Hrvatska' },
  { code: '+386', flag: '🇸🇮', name: 'Slovenija' },
  { code: '+389', flag: '🇲🇰', name: 'S. Makedonija' },
  { code: '+43', flag: '🇦🇹', name: 'Austrija' },
  { code: '+49', flag: '🇩🇪', name: 'Nemacka' },
  { code: '+41', flag: '🇨🇭', name: 'Svajcarska' },
];

const RegisterPage = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    countryCode: '+381',
    password: '',
    confirmPassword: '',
    address: '',
    companyCode: '',
    role: 'client'
  });
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const selectedCountry = COUNTRY_CODES.find(c => c.code === formData.countryCode) || COUNTRY_CODES[0];

  const updateForm = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateStep1 = () => {
    if (!formData.name.trim()) {
      setError('Unesite ime i prezime');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('Unesite broj telefona');
      return false;
    }
    if (formData.password.length < 4) {
      setError('Lozinka mora imati najmanje 4 karaktera');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Lozinke se ne podudaraju');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.companyCode.trim()) {
      setError('Unesite kod firme');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const fullPhone = formData.countryCode + formData.phone.trim().replace(/^0+/, '');

      await register({
        name: formData.name.trim(),
        phone: fullPhone,
        password: formData.password,
        address: formData.address.trim(),
        companyCode: formData.companyCode.trim().toUpperCase(),
        role: formData.role
      });

      toast.success('Uspešno ste se registrovali!');
      navigate('/');
    } catch (err) {
      setError(err.message || 'Greška pri registraciji');
      toast.error(err.message || 'Greška pri registraciji');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container register-container">
        <div className="login-header">
          <Mountain size={48} className="logo-icon" />
          <h1>EcoPlanina</h1>
          <p>Pametno upravljanje otpadom</p>
        </div>

        <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className="login-form">
          <h2>Registracija</h2>
          <p className="form-subtitle">
            {step === 1 ? 'Korak 1: Osnovni podaci' : 'Korak 2: Podaci o firmi'}
          </p>

          {/* Progress indicator */}
          <div className="register-progress">
            <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>1</div>
            <div className={`progress-line ${step >= 2 ? 'active' : ''}`}></div>
            <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>2</div>
          </div>

          {error && <div className="error-message">{error}</div>}

          {step === 1 ? (
            <>
              <div className="input-group">
                <label>Ime i prezime</label>
                <div className="input-wrapper">
                  <User size={20} />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    placeholder="Petar Petrovic"
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Broj telefona</label>
                <p className="input-hint">Unesite broj bez vodece nule</p>
                <div className="phone-input-row">
                  <div className="country-code-wrapper">
                    <button
                      type="button"
                      className="country-code-btn"
                      onClick={() => setShowCountryPicker(!showCountryPicker)}
                    >
                      <span className="country-flag">{selectedCountry.flag}</span>
                      <span className="country-code">{formData.countryCode}</span>
                      <ChevronDown size={16} />
                    </button>
                    {showCountryPicker && (
                      <div className="country-picker-dropdown">
                        {COUNTRY_CODES.map((country) => (
                          <button
                            key={country.code}
                            type="button"
                            className={`country-option ${formData.countryCode === country.code ? 'selected' : ''}`}
                            onClick={() => {
                              updateForm('countryCode', country.code);
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
                      value={formData.phone}
                      onChange={(e) => updateForm('phone', e.target.value)}
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
                    value={formData.password}
                    onChange={(e) => updateForm('password', e.target.value)}
                    placeholder="Minimum 4 karaktera"
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Potvrdi lozinku</label>
                <div className="input-wrapper">
                  <Lock size={20} />
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => updateForm('confirmPassword', e.target.value)}
                    placeholder="Ponovite lozinku"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="login-btn">
                Dalje
              </button>
            </>
          ) : (
            <>
              <div className="input-group">
                <label>Kod firme</label>
                <p className="input-hint">Dobijate od administratora firme</p>
                <div className="input-wrapper">
                  <Building2 size={20} />
                  <input
                    type="text"
                    value={formData.companyCode}
                    onChange={(e) => updateForm('companyCode', e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    required
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Adresa (opciono)</label>
                <div className="input-wrapper">
                  <MapPin size={20} />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => updateForm('address', e.target.value)}
                    placeholder="Ulica i broj, grad"
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Registrujem se kao</label>
                <div className="role-selector">
                  <button
                    type="button"
                    className={`role-option ${formData.role === 'client' ? 'active' : ''}`}
                    onClick={() => updateForm('role', 'client')}
                  >
                    <User size={20} />
                    <span>Klijent</span>
                    <p>Saljem zahteve za odvoz</p>
                  </button>
                  <button
                    type="button"
                    className={`role-option ${formData.role === 'manager' ? 'active' : ''}`}
                    onClick={() => updateForm('role', 'manager')}
                  >
                    <Building2 size={20} />
                    <span>Menadzer</span>
                    <p>Upravljam zahtevima</p>
                  </button>
                </div>
              </div>

              <div className="button-row">
                <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                  Nazad
                </button>
                <button type="submit" className="login-btn" disabled={loading}>
                  {loading ? (
                    <span className="loading-spinner"></span>
                  ) : (
                    <>
                      <UserPlus size={20} />
                      Registruj se
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>

        <p className="app-hint">
          Već imate nalog? <Link to="/" className="link">Prijavite se</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
