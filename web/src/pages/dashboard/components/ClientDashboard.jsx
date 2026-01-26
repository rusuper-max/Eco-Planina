/**
 * ClientDashboard - Sadržaj za client role
 * Ekstraktovano iz Dashboard.jsx
 */
import React from 'react';
import {
    Truck, History, Plus, MessageCircle, Calendar, Clock, Users, Phone, ChevronRight, Recycle
} from 'lucide-react';
import {
    FillLevelBar, NewRequestForm, ClientRequestsView, ClientHistoryView, WASTE_TYPES
} from '../../DashboardComponents';

export const ClientDashboard = ({
    activeTab,
    setActiveTab,
    wasteTypes,
    user,
    clientRequests,
    clientHistory,
    historyLoading,
    unreadCount,
    handleNewRequest,
    submitLoading,
    removePickupRequest,
    hideClientHistoryItem
}) => {
    // Filter waste types based on client's allowed types (null/empty = all allowed)
    const clientWasteTypes = user?.allowed_waste_types?.length > 0
        ? wasteTypes.filter(wt => user.allowed_waste_types.includes(wt.id))
        : wasteTypes;

    if (activeTab === 'requests') {
        return <ClientRequestsView requests={clientRequests} wasteTypes={wasteTypes} onDeleteRequest={removePickupRequest} />;
    }

    if (activeTab === 'history') {
        return (
            <ClientHistoryView
                history={clientHistory}
                loading={historyLoading}
                wasteTypes={wasteTypes}
                onHide={async (id) => {
                    await hideClientHistoryItem(id);
                }}
            />
        );
    }

    if (activeTab === 'info') {
        // Informacije tab - overview of client's activity
        return (
            <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl border p-5 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('requests')}>
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
                            <Truck className="w-6 h-6 text-emerald-600" />
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{clientRequests?.length || 0}</p>
                        <p className="text-sm text-slate-500">Aktivni zahtevi</p>
                    </div>
                    <div className="bg-white rounded-2xl border p-5 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('history')}>
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                            <History className="w-6 h-6 text-blue-600" />
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{clientHistory?.length || 0}</p>
                        <p className="text-sm text-slate-500">Obrađeni zahtevi</p>
                    </div>
                    <div className="bg-white rounded-2xl border p-5 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('new')}>
                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-3">
                            <Plus className="w-6 h-6 text-amber-600" />
                        </div>
                        <p className="text-2xl font-bold text-slate-800">+</p>
                        <p className="text-sm text-slate-500">Novi zahtev</p>
                    </div>
                    <div className="bg-white rounded-2xl border p-5 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('messages')}>
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-3">
                            <MessageCircle className="w-6 h-6 text-purple-600" />
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{unreadCount || 0}</p>
                        <p className="text-sm text-slate-500">Nove poruke</p>
                    </div>
                </div>

                {/* Active Requests Preview */}
                {clientRequests?.length > 0 && (
                    <div className="bg-white rounded-2xl border overflow-hidden">
                        <div className="p-5 border-b flex justify-between items-center">
                            <h2 className="font-bold text-lg">Aktivni zahtevi</h2>
                            <button onClick={() => setActiveTab('requests')} className="text-emerald-600 text-sm font-medium hover:text-emerald-700 flex items-center gap-1">
                                Vidi sve <ChevronRight size={16} />
                            </button>
                        </div>
                        <div className="divide-y">
                            {clientRequests.slice(0, 3).map(r => {
                                const assignment = r.driver_assignment;
                                const hasDriver = !!assignment;
                                const statusLabel = assignment?.status === 'in_progress' ? 'Vozač na putu' : hasDriver ? 'Dodeljen vozač' : 'Na čekanju';
                                const statusColor = assignment?.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : hasDriver ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700';

                                return (
                                    <div key={r.id} className="p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl">
                                                    {WASTE_TYPES.find(w => w.id === r.waste_type)?.icon || '📦'}
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-slate-800">{r.waste_label}</h4>
                                                    <p className="text-sm text-slate-500 flex items-center gap-2">
                                                        <Calendar size={14} />
                                                        {new Date(r.created_at).toLocaleDateString('sr-RS', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full">
                                                    <FillLevelBar fillLevel={r.fill_level} />
                                                </div>
                                                <span className={`px-3 py-1.5 text-xs font-medium rounded-full flex items-center gap-1 ${statusColor}`}>
                                                    {hasDriver ? <Truck size={12} /> : <Clock size={12} />} {statusLabel}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Show driver info when assigned */}
                                        {hasDriver && (
                                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                                                        <Users size={14} className="text-emerald-600" />
                                                    </div>
                                                    <span className="text-slate-600">{assignment.driver_name}</span>
                                                </div>
                                                {assignment.driver_phone && (
                                                    <a href={`tel:${assignment.driver_phone}`} className="flex items-center gap-1 text-emerald-600 text-sm font-medium hover:text-emerald-700">
                                                        <Phone size={14} /> Pozovi
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Quick Action */}
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-8 text-white text-center">
                    <Recycle size={48} className="mx-auto mb-4 opacity-90" />
                    <h3 className="text-2xl font-bold mb-2">
                        {clientRequests?.length ? `Imate ${clientRequests.length} aktivna zahteva` : 'Sve je pod kontrolom!'}
                    </h3>
                    <p className="text-emerald-100 mb-6">Podnesite novi zahtev za preuzimanje robe</p>
                    <button
                        onClick={() => setActiveTab('new')}
                        className="bg-white text-emerald-600 px-8 py-3 rounded-xl font-semibold hover:bg-emerald-50 transition-colors inline-flex items-center gap-2"
                    >
                        <Plus size={20} /> Novi zahtev
                    </button>
                </div>
            </div>
        );
    }

    // Default: Novi zahtev form (home page for clients)
    return <NewRequestForm onSubmit={handleNewRequest} loading={submitLoading} wasteTypes={clientWasteTypes} />;
};

export default ClientDashboard;
