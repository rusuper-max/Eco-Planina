/**
 * Menu Configuration - Konfiguracija menija po ulogama
 * Ekstraktovano iz Dashboard.jsx
 */
import {
  LayoutDashboard, Truck, Users, Settings, MapPin, Plus, Recycle, BarChart3,
  FileText, Building2, Clock, Package, MessageCircle, History, Printer,
  Box, Network, UserCheck, ClipboardList, Warehouse, ArrowUpFromLine, TrendingUp, Info, Globe, Fuel
} from 'lucide-react';

/**
 * Vraća menu stavke na osnovu uloge korisnika
 * @param {string} userRole - Uloga korisnika (admin, company_admin, supervisor, manager, client)
 * @param {Array} pickupRequests - Lista zahteva za prikaz badge-a
 * @param {Array} clientRequests - Lista klijentovih zahteva
 * @param {number} unreadCount - Broj nepročitanih poruka
 * @returns {Array} - Lista menu stavki
 */
export const getMenuByRole = (userRole, pickupRequests = [], clientRequests = [], unreadCount = 0) => {
  const pendingCount = pickupRequests?.filter(r => r.status === 'pending')?.length || 0;

  if (userRole === 'admin') {
    return [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Pregled' },
      { id: 'companies', icon: Building2, label: 'Firme' },
      { id: 'users', icon: Users, label: 'Korisnici' },
      { id: 'codes', icon: FileText, label: 'Master Kodovi' },
      { id: 'messages', icon: MessageCircle, label: 'Poruke', badge: unreadCount > 0 ? unreadCount : null }
    ];
  }

  if (userRole === 'company_admin') {
    return [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Pregled', helpKey: 'sidebar-dashboard' },
      { id: 'map', icon: Globe, label: 'Mapa', helpKey: 'sidebar-map' },
      {
        label: 'Upravljanje Zahtevima',
        icon: ClipboardList,
        helpKey: 'sidebar-group-requests',
        children: [
          { id: 'requests', icon: Truck, label: 'Aktivni zahtevi', badge: pendingCount, helpKey: 'sidebar-requests' },
          { id: 'history', icon: History, label: 'Istorija zahteva', helpKey: 'sidebar-history' },
          { id: 'activity-log', icon: History, label: 'Aktivnosti', helpKey: 'sidebar-activity-log' },
        ]
      },
      {
        label: 'Analitika',
        icon: BarChart3,
        helpKey: 'sidebar-group-analytics',
        children: [
          { id: 'analytics', icon: BarChart3, label: 'Pregled', helpKey: 'sidebar-analytics' },
          { id: 'manager-analytics', icon: UserCheck, label: 'Učinak menadžera', helpKey: 'sidebar-manager-analytics' },
          { id: 'driver-analytics', icon: Truck, label: 'Učinak vozača', helpKey: 'sidebar-driver-analytics' },
          { id: 'print', icon: Printer, label: 'Štampaj/Export', helpKey: 'sidebar-print' }
        ]
      },
      {
        label: 'Administracija',
        icon: Users,
        helpKey: 'sidebar-group-admin',
        children: [
          { id: 'staff', icon: Users, label: 'Osoblje', helpKey: 'sidebar-staff' },
          { id: 'regions', icon: MapPin, label: 'Filijale', helpKey: 'sidebar-regions' },
          { id: 'visual', icon: Network, label: 'Vizuelni Editor', helpKey: 'sidebar-visual-editor' }
        ]
      },
      {
        label: 'Skladište',
        icon: Warehouse,
        helpKey: 'sidebar-group-inventory',
        children: [
          { id: 'inventory', icon: Package, label: 'Stanje', helpKey: 'sidebar-inventory' },
          { id: 'outbound', icon: ArrowUpFromLine, label: 'Izlazi', helpKey: 'sidebar-outbound' },
          { id: 'transactions', icon: TrendingUp, label: 'Transakcije', helpKey: 'sidebar-transactions' },
          { id: 'vehicles', icon: Truck, label: 'Kamioni', helpKey: 'sidebar-vehicles' },
          { id: 'fuel', icon: Fuel, label: 'Gorivo', helpKey: 'sidebar-fuel' }
        ]
      },
      { id: 'settings', icon: Settings, label: 'Podešavanja', helpKey: 'sidebar-settings' }
    ];
  }

  if (userRole === 'supervisor') {
    return [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Pregled', helpKey: 'sidebar-dashboard' },
      { id: 'map', icon: Globe, label: 'Mapa', helpKey: 'sidebar-map' },
      {
        label: 'Zahtevi',
        icon: ClipboardList,
        helpKey: 'sidebar-group-requests',
        children: [
          { id: 'requests', icon: Truck, label: 'Aktivni zahtevi', badge: pendingCount, helpKey: 'sidebar-requests' },
          { id: 'history', icon: History, label: 'Istorija', helpKey: 'sidebar-history' },
          { id: 'activity-log', icon: History, label: 'Aktivnosti', helpKey: 'sidebar-activity-log' }
        ]
      },
      {
        label: 'Analitika',
        icon: BarChart3,
        helpKey: 'sidebar-group-analytics',
        children: [
          { id: 'analytics', icon: BarChart3, label: 'Pregled', helpKey: 'sidebar-analytics' },
          { id: 'manager-analytics', icon: UserCheck, label: 'Učinak menadžera', helpKey: 'sidebar-manager-analytics' },
          { id: 'driver-analytics', icon: Truck, label: 'Učinak vozača', helpKey: 'sidebar-driver-analytics' },
          { id: 'print', icon: Printer, label: 'Štampaj/Export', helpKey: 'sidebar-print' }
        ]
      },
      {
        label: 'Ljudstvo',
        icon: Users,
        helpKey: 'sidebar-group-people',
        children: [
          { id: 'staff', icon: Users, label: 'Osoblje', helpKey: 'sidebar-staff' },
          { id: 'clients', icon: Building2, label: 'Klijenti', helpKey: 'sidebar-clients' },
          { id: 'drivers', icon: Truck, label: 'Vozači', helpKey: 'sidebar-drivers' },
          { id: 'visual', icon: Network, label: 'Vizuelni Editor', helpKey: 'sidebar-visual-editor' }
        ]
      },
      {
        label: 'Skladište',
        icon: Warehouse,
        helpKey: 'sidebar-group-inventory',
        children: [
          { id: 'inventory', icon: Package, label: 'Stanje', helpKey: 'sidebar-inventory' },
          { id: 'outbound', icon: ArrowUpFromLine, label: 'Izlazi', helpKey: 'sidebar-outbound' },
          { id: 'transactions', icon: TrendingUp, label: 'Transakcije', helpKey: 'sidebar-transactions' },
          { id: 'vehicles', icon: Truck, label: 'Kamioni', helpKey: 'sidebar-vehicles' },
          { id: 'fuel', icon: Fuel, label: 'Gorivo', helpKey: 'sidebar-fuel' }
        ]
      },
      {
        label: 'Podešavanja',
        icon: Settings,
        helpKey: 'sidebar-group-settings',
        children: [
          { id: 'equipment', icon: Box, label: 'Oprema', helpKey: 'sidebar-equipment' },
          { id: 'wastetypes', icon: Recycle, label: 'Vrste robe', helpKey: 'sidebar-wastetypes' }
        ]
      }
    ];
  }

  if (userRole === 'manager') {
    return [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Pregled', helpKey: 'sidebar-dashboard' },
      { id: 'map', icon: Globe, label: 'Mapa', helpKey: 'sidebar-map' },
      {
        label: 'Zahtevi',
        icon: ClipboardList,
        helpKey: 'sidebar-group-requests',
        children: [
          { id: 'requests', icon: Truck, label: 'Aktivni zahtevi', badge: pendingCount, helpKey: 'sidebar-requests' },
          { id: 'history', icon: History, label: 'Istorija', helpKey: 'sidebar-history' },
          { id: 'activity-log', icon: History, label: 'Aktivnosti', helpKey: 'sidebar-activity-log' }
        ]
      },
      {
        label: 'Ljudstvo',
        icon: Users,
        helpKey: 'sidebar-group-people',
        children: [
          { id: 'clients', icon: Building2, label: 'Klijenti', helpKey: 'sidebar-clients' },
          { id: 'drivers', icon: Truck, label: 'Vozači', helpKey: 'sidebar-drivers' }
        ]
      },
      {
        label: 'Analitika',
        icon: BarChart3,
        helpKey: 'sidebar-group-analytics',
        children: [
          { id: 'analytics', icon: BarChart3, label: 'Pregled', helpKey: 'sidebar-analytics' },
          { id: 'print', icon: Printer, label: 'Štampaj/Export', helpKey: 'sidebar-print' }
        ]
      },
      {
        label: 'Skladište',
        icon: Warehouse,
        helpKey: 'sidebar-group-inventory',
        children: [
          { id: 'inventory', icon: Package, label: 'Stanje', helpKey: 'sidebar-inventory' },
          { id: 'outbound', icon: ArrowUpFromLine, label: 'Izlazi', helpKey: 'sidebar-outbound' },
          { id: 'transactions', icon: TrendingUp, label: 'Transakcije', helpKey: 'sidebar-transactions' },
          { id: 'vehicles', icon: Truck, label: 'Kamioni', helpKey: 'sidebar-vehicles' },
          { id: 'fuel', icon: Fuel, label: 'Gorivo', helpKey: 'sidebar-fuel' }
        ]
      },
      {
        label: 'Podešavanja',
        icon: Settings,
        helpKey: 'sidebar-group-settings',
        children: [
          { id: 'equipment', icon: Box, label: 'Oprema', helpKey: 'sidebar-equipment' },
          { id: 'wastetypes', icon: Recycle, label: 'Vrste robe', helpKey: 'sidebar-wastetypes' }
        ]
      }
    ];
  }

  // Default: client menu
  return [
    { id: 'new', icon: Plus, label: 'Novi zahtev' },
    { id: 'requests', icon: Truck, label: 'Zahtevi', badge: clientRequests?.length },
    { id: 'history', icon: Clock, label: 'Istorija' },
    { id: 'info', icon: Info, label: 'Informacije' },
    { id: 'messages', icon: MessageCircle, label: 'Poruke', badge: unreadCount > 0 ? unreadCount : null }
  ];
};

/**
 * Helper za prikaz uloge na srpskom
 */
export const getRoleLabel = (role) => {
  const labels = {
    developer: 'Developer',
    admin: 'Administrator',
    company_admin: 'Admin firme',
    supervisor: 'Supervizor',
    manager: 'Menadžer',
    driver: 'Vozač',
    client: 'Klijent'
  };
  return labels[role] || 'Korisnik';
};

export default { getMenuByRole, getRoleLabel };
