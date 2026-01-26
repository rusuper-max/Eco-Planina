/**
 * Stats Configuration - Konfiguracija statistika po ulogama
 * Ekstraktovano iz Dashboard.jsx
 */
import { Truck, Users, Building2, FileText, Recycle, AlertCircle } from 'lucide-react';
import { getCurrentUrgency } from '../../DashboardComponents';

/**
 * Vraća statistike na osnovu uloge korisnika
 * @param {string} userRole - Uloga korisnika
 * @param {Object} params - Parametri za računanje statistika
 * @returns {Array} - Lista statistika za prikaz
 */
export const getStatsByRole = (userRole, {
  stats = null,
  pickupRequests = [],
  clientRequests = [],
  clients = [],
  companyMembers = [],
  setActiveTab,
  setUrgencyFilter
}) => {
  const pending = pickupRequests?.filter(r => r.status === 'pending') || [];

  if (userRole === 'admin' && stats) {
    return [
      {
        label: 'Firme',
        value: stats.totalCompanies,
        icon: <Building2 className="w-6 h-6 text-emerald-600" />,
        onClick: () => setActiveTab('companies')
      },
      {
        label: 'Korisnici',
        value: stats.totalUsers,
        subtitle: `${stats.totalManagers || 0} menadž. / ${stats.totalClients || 0} klij. / ${stats.totalDrivers || 0} voz.`,
        icon: <Users className="w-6 h-6 text-blue-600" />,
        onClick: () => setActiveTab('users')
      },
      {
        label: 'Master kodovi',
        value: stats.totalCodes,
        icon: <FileText className="w-6 h-6 text-orange-600" />,
        onClick: () => setActiveTab('codes')
      },
      {
        label: 'Dostupni',
        value: stats.availableCodes,
        icon: <Recycle className="w-6 h-6 text-green-600" />,
        onClick: () => setActiveTab('codes')
      }
    ];
  }

  if (userRole === 'manager') {
    return [
      {
        label: 'Zahtevi',
        value: pending.length,
        icon: <Truck className="w-6 h-6 text-emerald-600" />,
        onClick: () => {
          setUrgencyFilter('all');
          setActiveTab('requests');
        }
      },
      {
        label: 'Klijenti',
        value: clients.length,
        icon: <Users className="w-6 h-6 text-blue-600" />,
        onClick: () => setActiveTab('clients')
      },
      {
        label: 'Hitni',
        value: pending.filter(r => getCurrentUrgency(r.created_at, r.urgency) === '24h').length,
        icon: <AlertCircle className="w-6 h-6 text-red-600" />,
        onClick: () => {
          setUrgencyFilter('24h');
          setActiveTab('requests');
        }
      }
    ];
  }

  if (userRole === 'supervisor') {
    return [
      {
        label: 'Zahtevi',
        value: pending.length,
        icon: <Truck className="w-6 h-6 text-emerald-600" />,
        onClick: () => setActiveTab('requests')
      },
      {
        label: 'Klijenti',
        value: clients.length,
        icon: <Users className="w-6 h-6 text-blue-600" />,
        onClick: () => setActiveTab('clients')
      },
      {
        label: 'Osoblje',
        value: companyMembers.length,
        icon: <Users className="w-6 h-6 text-purple-600" />,
        onClick: () => setActiveTab('staff')
      }
    ];
  }

  // Default: client stats
  return [
    {
      label: 'Aktivni zahtevi',
      value: clientRequests?.length || 0,
      icon: <Truck className="w-6 h-6 text-emerald-600" />,
      onClick: () => setActiveTab('requests')
    }
  ];
};

export default { getStatsByRole };
