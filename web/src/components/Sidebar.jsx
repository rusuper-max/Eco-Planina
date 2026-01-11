import { useNavigate } from 'react-router-dom';
import {
    LogOut, Mountain, Users, Building2, Key, LayoutDashboard,
    Shield, Crown
} from 'lucide-react';

const Sidebar = ({ activeItem, user, isGod, onLogout }) => {
    const navigate = useNavigate();

    const navItems = [
        { id: 'dashboard', label: 'Pregled', icon: LayoutDashboard, path: '/admin' },
        { id: 'users', label: 'Korisnici', icon: Users, path: '/admin/users' },
        { id: 'companies', label: 'Firme', icon: Building2, path: '/admin/companies' },
        { id: 'codes', label: 'Master Kodovi', icon: Key, path: '/admin/codes' },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-brand">
                    <div className="brand-icon">
                        <Mountain size={24} />
                    </div>
                    <div className="brand-text">
                        <h1>EcoPlanina</h1>
                        <p>Admin Panel</p>
                    </div>
                </div>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-section">
                    <div className="nav-section-title">Administracija</div>
                    {navItems.map(item => (
                        <a
                            key={item.id}
                            href="#"
                            className={`nav-item ${activeItem === item.id ? 'active' : ''}`}
                            onClick={(e) => {
                                e.preventDefault();
                                navigate(item.path);
                            }}
                        >
                            <item.icon size={20} />
                            <span>{item.label}</span>
                        </a>
                    ))}
                </div>
            </nav>

            <div className="sidebar-footer">
                <div className="user-card">
                    <div className="user-avatar">
                        {isGod ? <Crown size={18} /> : <Shield size={18} />}
                    </div>
                    <div className="user-info">
                        <span className="user-name">{user?.name}</span>
                        <span className="user-role">{isGod ? 'Super Admin' : 'Admin'}</span>
                    </div>
                    <button className="logout-btn" onClick={onLogout} title="Odjavi se">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
