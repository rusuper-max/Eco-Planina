/**
 * AdminDashboard - Sadržaj za admin role
 * Ekstraktovano iz Dashboard.jsx
 */
import React from 'react';
import { FileText, Building2, Users, BarChart3, Download } from 'lucide-react';
import {
    StatCard, AdminCompaniesTable, AdminUsersTable, MasterCodesTable
} from '../../DashboardComponents';

export const AdminDashboard = ({
    activeTab,
    setActiveTab,
    stats,
    companies,
    users,
    masterCodes,
    isDeveloper,
    handleDeleteUser,
    handleImpersonateUser,
    changeUserRole,
    handleResetPassword,
    refreshUsers,
    setEditingUser,
    setEditingCompany,
    handleGenerateCode,
    handleCopyCode,
    handleDeleteCode,
    handleUpdateCodePrice,
    handleExportUsers,
    handleExportCompanies
}) => {
    const statCards = stats ? [
        { label: 'Firme', value: stats.totalCompanies, icon: <Building2 className="w-6 h-6 text-emerald-600" />, onClick: () => setActiveTab('companies') },
        { label: 'Korisnici', value: stats.totalUsers, subtitle: `${stats.totalManagers || 0} menadž. / ${stats.totalClients || 0} klij. / ${stats.totalDrivers || 0} voz.`, icon: <Users className="w-6 h-6 text-blue-600" />, onClick: () => setActiveTab('users') },
        { label: 'Master kodovi', value: stats.totalCodes, icon: <FileText className="w-6 h-6 text-orange-600" />, onClick: () => setActiveTab('codes') },
        { label: 'Dostupni', value: stats.availableCodes, icon: <Building2 className="w-6 h-6 text-green-600" />, onClick: () => setActiveTab('codes') }
    ] : [];

    if (activeTab === 'companies') {
        return <AdminCompaniesTable companies={companies} onEdit={setEditingCompany} />;
    }

    if (activeTab === 'users') {
        return (
            <AdminUsersTable
                users={users}
                onDelete={handleDeleteUser}
                isDeveloper={isDeveloper()}
                isAdmin={true}
                onImpersonate={handleImpersonateUser}
                onChangeRole={changeUserRole}
                onResetPassword={handleResetPassword}
                onRefresh={refreshUsers}
                onEditUser={setEditingUser}
            />
        );
    }

    if (activeTab === 'codes') {
        return (
            <MasterCodesTable
                codes={masterCodes}
                onGenerate={handleGenerateCode}
                onCopy={handleCopyCode}
                onDelete={handleDeleteCode}
                onUpdatePrice={handleUpdateCodePrice}
                isDeveloper={isDeveloper()}
                isAdmin={true}
            />
        );
    }

    // Default: Dashboard overview
    return (
        <div className="space-y-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((s, i) => <StatCard key={i} {...s} />)}
            </div>
            <div className="bg-white rounded-2xl border p-6">
                <h2 className="font-bold mb-4">Brze akcije</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { icon: FileText, label: 'Generiši kod', onClick: handleGenerateCode },
                        { icon: Building2, label: 'Firme', onClick: () => setActiveTab('companies') },
                        { icon: Users, label: 'Korisnici', onClick: () => setActiveTab('users') },
                        { icon: BarChart3, label: 'Kodovi', onClick: () => setActiveTab('codes') }
                    ].map((a, i) => (
                        <button key={i} onClick={a.onClick} className="p-4 bg-slate-50 rounded-xl hover:bg-emerald-50 text-left">
                            <a.icon size={20} className="mb-3 text-slate-500" />
                            <p className="font-semibold">{a.label}</p>
                        </button>
                    ))}
                </div>
            </div>
            <div className="bg-white rounded-2xl border p-6">
                <h2 className="font-bold mb-4">Export podataka</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <button onClick={handleExportUsers} className="p-4 bg-blue-50 rounded-xl hover:bg-blue-100 text-left flex items-center gap-3">
                        <Download size={20} className="text-blue-600" />
                        <div>
                            <p className="font-semibold text-blue-900">Korisnici</p>
                            <p className="text-xs text-blue-600">Export u CSV</p>
                        </div>
                    </button>
                    <button onClick={handleExportCompanies} className="p-4 bg-emerald-50 rounded-xl hover:bg-emerald-100 text-left flex items-center gap-3">
                        <Download size={20} className="text-emerald-600" />
                        <div>
                            <p className="font-semibold text-emerald-900">Firme</p>
                            <p className="text-xs text-emerald-600">Export u CSV</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
