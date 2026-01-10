import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mountain, Phone, Lock, LogIn } from 'lucide-react';

const LoginPage = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(phone.trim(), password);
      if (result.success) {
        navigate(result.role === 'manager' ? '/manager' : '/client');
      }
    } catch (err) {
      setError(err.message || 'Greska pri prijavi');
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
          <p className="form-subtitle">Ulogujte se na postojeci nalog</p>

          {error && <div className="error-message">{error}</div>}

          <div className="input-group">
            <label>Broj telefona</label>
            <div className="input-wrapper">
              <Phone size={20} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="npr. 0641234567"
                required
              />
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
          Nemate nalog? Registrujte se preko mobilne aplikacije.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
