import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import {
  Users, Building2, Key, Shield, UserCheck, RefreshCw,
  TrendingUp, ArrowRight, Sparkles
} from 'lucide-react';

const AdminDashboard = () => {
  const { user, logout, getAdminStats, isGod } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Da li ste sigurni da želite da se odjavite?')) {
      logout();
      navigate('/');
    }
  };

  const StatCard = ({ icon: Icon, value, label, gradient, trend }) => (
    <div className="group relative bg-white rounded-2xl p-6 border border-slate-100 hover:border-slate-200 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br ${gradient} shadow-lg`}>
          <Icon size={24} className="text-white" />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-xs font-medium">
            <TrendingUp size={12} />
            {trend}
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="text-3xl font-bold text-slate-900">{value}</div>
        <div className="text-sm text-slate-500 mt-1">{label}</div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity rounded-b-2xl" style={{ backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))` }} />
    </div>
  );

  const QuickAction = ({ icon: Icon, label, description, onClick, color }) => (
    <button
      onClick={onClick}
      className="group w-full text-left p-5 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50"
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} transition-transform group-hover:scale-110`}>
          <Icon size={22} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors flex items-center gap-2">
            {label}
            <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
    </button>
  );

  const UserBreakdown = ({ icon: Icon, value, label, color }) => (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50/50 border border-slate-100">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <Sidebar
        activeItem="dashboard"
        user={user}
        isGod={isGod()}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="lg:ml-72 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-100">
          <div className="px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="pt-10 lg:pt-0">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Dashboard</h1>
                  <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 text-sm font-medium rounded-full">
                    <Sparkles size={14} />
                    Admin
                  </span>
                </div>
                <p className="text-slate-500 mt-1">Dobrodošli nazad, {user?.name?.split(' ')[0] || 'Admin'}!</p>
              </div>
              <button
                onClick={loadStats}
                disabled={loading}
                className="btn-secondary"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                <span>Osveži</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100">
                  <div className="skeleton w-14 h-14 rounded-xl mb-4" />
                  <div className="skeleton w-20 h-8 mb-2" />
                  <div className="skeleton w-32 h-4" />
                </div>
              ))}
            </div>
          ) : stats ? (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
                <StatCard
                  icon={Users}
                  value={stats.totalUsers}
                  label="Ukupno korisnika"
                  gradient="from-blue-500 to-blue-600"
                  trend="+12%"
                />
                <StatCard
                  icon={Building2}
                  value={stats.totalCompanies}
                  label="Registrovanih firmi"
                  gradient="from-emerald-500 to-emerald-600"
                />
                <StatCard
                  icon={Key}
                  value={stats.totalCodes}
                  label="Master kodova"
                  gradient="from-amber-500 to-orange-500"
                />
                <StatCard
                  icon={Key}
                  value={stats.availableCodes}
                  label="Slobodnih kodova"
                  gradient="from-purple-500 to-pink-500"
                />
              </div>

              {/* Two Column Layout */}
              <div className="grid lg:grid-cols-5 gap-6">
                {/* User Breakdown */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-5">Pregled korisnika</h2>
                  <div className="space-y-3">
                    <UserBreakdown
                      icon={Shield}
                      value={stats.totalAdmins}
                      label="Administratora"
                      color="bg-gradient-to-br from-red-500 to-rose-500"
                    />
                    <UserBreakdown
                      icon={UserCheck}
                      value={stats.totalManagers}
                      label="Menadžera"
                      color="bg-gradient-to-br from-blue-500 to-cyan-500"
                    />
                    <UserBreakdown
                      icon={Users}
                      value={stats.totalClients}
                      label="Klijenata"
                      color="bg-gradient-to-br from-emerald-500 to-teal-500"
                    />
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-5">Brze akcije</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <QuickAction
                      icon={Key}
                      label="Generiši kod"
                      description="Kreiraj novi Master Code"
                      onClick={() => navigate('/admin/codes')}
                      color="bg-gradient-to-br from-amber-500 to-orange-500"
                    />
                    <QuickAction
                      icon={Users}
                      label="Korisnici"
                      description="Pregledaj sve korisnike"
                      onClick={() => navigate('/admin/users')}
                      color="bg-gradient-to-br from-blue-500 to-cyan-500"
                    />
                    <QuickAction
                      icon={Building2}
                      label="Firme"
                      description="Upravljaj firmama"
                      onClick={() => navigate('/admin/companies')}
                      color="bg-gradient-to-br from-emerald-500 to-teal-500"
                    />
                    <QuickAction
                      icon={Shield}
                      label="Kodovi"
                      description="Svi Master Kodovi"
                      onClick={() => navigate('/admin/codes')}
                      color="bg-gradient-to-br from-purple-500 to-pink-500"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <Shield size={64} className="text-slate-300" />
              <h3>Greška pri učitavanju</h3>
              <p>Pokušajte ponovo</p>
              <button onClick={loadStats} className="btn-primary mt-4">
                <RefreshCw size={18} />
                Pokušaj ponovo
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
