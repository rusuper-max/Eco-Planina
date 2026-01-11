import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LogOut, Mountain, Users, Building2, Key, LayoutDashboard,
    Shield, Crown, Menu, X, ChevronRight
} from 'lucide-react';

const Sidebar = ({ activeItem, user, isGod, onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    const navItems = [
        { id: 'dashboard', label: 'Pregled', icon: LayoutDashboard, path: '/admin' },
        { id: 'users', label: 'Korisnici', icon: Users, path: '/admin/users' },
        { id: 'companies', label: 'Firme', icon: Building2, path: '/admin/companies' },
        { id: 'codes', label: 'Master Kodovi', icon: Key, path: '/admin/codes' },
    ];

    const NavItem = ({ item }) => {
        const isActive = activeItem === item.id;
        return (
            <button
                onClick={() => navigate(item.path)}
                className={`
                    group w-full flex items-center gap-3 px-4 py-3 rounded-xl
                    transition-all duration-200 text-left relative
                    ${isActive
                        ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 text-emerald-400'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }
                `}
            >
                {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-500 rounded-r-full" />
                )}
                <item.icon size={20} className={isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'} />
                <span className="font-medium">{item.label}</span>
                {isActive && <ChevronRight size={16} className="ml-auto text-emerald-500/60" />}
            </button>
        );
    };

    return (
        <>
            {/* Mobile Toggle */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-3 rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/50 hover:bg-slate-800 transition-colors"
            >
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed top-0 left-0 h-screen z-40
                w-72 flex flex-col
                bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950
                border-r border-slate-800/50
                transition-transform duration-300 ease-out
                ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Logo */}
                <div className="p-6 border-b border-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
                                <Mountain size={22} />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white tracking-tight">EcoPlanina</h1>
                            <p className="text-xs text-slate-500">Admin Panel</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 overflow-y-auto scrollbar-thin">
                    <div className="mb-2">
                        <p className="px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
                            Navigacija
                        </p>
                        <div className="space-y-1">
                            {navItems.map(item => (
                                <NavItem key={item.id} item={item} />
                            ))}
                        </div>
                    </div>
                </nav>

                {/* User Section */}
                <div className="p-4 border-t border-slate-800/50">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50">
                        <div className={`
                            w-10 h-10 rounded-xl flex items-center justify-center text-white font-medium
                            ${isGod
                                ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25'
                                : 'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/25'
                            }
                        `}>
                            {isGod ? <Crown size={18} /> : <Shield size={18} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                                {user?.name}
                            </p>
                            <p className="text-xs text-slate-500">
                                {isGod ? 'Super Admin' : 'Administrator'}
                            </p>
                        </div>
                        <button
                            onClick={onLogout}
                            className="p-2.5 rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all"
                            title="Odjavi se"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
