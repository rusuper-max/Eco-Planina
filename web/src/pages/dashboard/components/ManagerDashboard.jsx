/**
 * ManagerDashboard - Sadržaj za manager role
 * Ekstraktovano iz Dashboard.jsx
 */
import React from 'react';
import { Plus } from 'lucide-react';
import {
    ManagerRequestsTable, HistoryTable, AnalyticsPage, ClientsTable, PrintExport,
    EquipmentManagement, WasteTypesManagement, MapView, ActivityLogPage,
    InventoryPage, OutboundPage, TransactionsPage, VehiclesPage, FuelLogsPage
} from '../../DashboardComponents';
import DriverManagement from '../../DriverManagement';
import { OverviewPage } from '../../../components/overview';

export const ManagerDashboard = ({
    activeTab,
    setActiveTab,
    // Data
    pending,
    processedRequests,
    clients,
    regions,
    equipment,
    wasteTypes,
    companyDrivers,
    driverAssignments,
    companyCode,
    user,
    userRole,
    mapType,
    setMapType,
    historyPage,
    companyMembers,
    // Handlers
    handleProcessRequest,
    handleRejectRequest,
    setSelectedRequest,
    handleClientClick,
    setUrgencyFilter,
    urgencyFilter,
    handleQuickAssignDriver,
    setEditingClientLocation,
    setShowCreateRequestModal,
    // History handlers
    fetchProcessedRequests,
    setProcessedRequests,
    setHistoryCount,
    updateProcessedRequest,
    deleteProcessedRequest,
    handleAssignDriverToProcessed,
    // Client handlers
    setSelectedClient,
    handleDeleteClient,
    setEditingClientEquipment,
    setShowImportClientsModal,
    // Equipment handlers
    handleAddEquipment,
    handleAssignEquipment,
    handleDeleteEquipment,
    handleEditEquipment,
    // Waste type handlers
    handleAddWasteType,
    handleDeleteWasteType,
    handleEditWasteType,
    handleUpdateClientWasteTypes,
    handleBulkWasteTypeUpdate,
    // Map handlers
    handleAssignDriverFromMap,
    setClientLocationWithRequests,
    fetchCompanyClients,
    toast
}) => {
    if (activeTab === 'requests') {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">Zahtevi na čekanju</h2>
                    <button
                        onClick={() => setShowCreateRequestModal(true)}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center gap-2 font-medium"
                    >
                        <Plus size={18} /> Kreiraj zahtev
                    </button>
                </div>
                <ManagerRequestsTable
                    requests={pending}
                    onProcess={handleProcessRequest}
                    onDelete={handleRejectRequest}
                    onView={setSelectedRequest}
                    onClientClick={handleClientClick}
                    wasteTypes={wasteTypes}
                    initialUrgencyFilter={urgencyFilter}
                    onUrgencyFilterChange={setUrgencyFilter}
                    assignments={driverAssignments}
                    drivers={companyDrivers}
                    onQuickAssign={handleQuickAssignDriver}
                    onEditLocation={(req) => setEditingClientLocation({
                        id: req.user_id,
                        name: req.client_name,
                        latitude: req.latitude,
                        longitude: req.longitude,
                        address: req.client_address
                    })}
                />
            </div>
        );
    }

    if (activeTab === 'drivers') {
        return <DriverManagement wasteTypes={wasteTypes} />;
    }

    if (activeTab === 'history') {
        return (
            <HistoryTable
                requests={processedRequests}
                wasteTypes={wasteTypes}
                drivers={companyDrivers}
                showDetailedView={true}
                onAssignDriverToProcessed={handleAssignDriverToProcessed}
                onEdit={async (id, updates) => {
                    try {
                        await updateProcessedRequest(id, updates);
                        const result = await fetchProcessedRequests({ page: historyPage });
                        setProcessedRequests(result.data || []);
                    } catch (err) {
                        toast.error('Greška pri ažuriranju: ' + err.message);
                    }
                }}
                onDelete={async (id) => {
                    const previous = processedRequests;
                    setProcessedRequests(prev => prev.filter(r => r.id !== id));
                    try {
                        await deleteProcessedRequest(id);
                        const result = await fetchProcessedRequests({ page: historyPage });
                        setProcessedRequests(result.data || []);
                        setHistoryCount(result.count);
                        toast.success('Zahtev je obrisan iz istorije');
                    } catch (err) {
                        setProcessedRequests(previous);
                        toast.error('Greška pri brisanju: ' + (err.message || 'Nepoznata greška'));
                    }
                }}
            />
        );
    }

    if (activeTab === 'analytics') {
        return (
            <AnalyticsPage
                processedRequests={processedRequests}
                clients={clients}
                wasteTypes={wasteTypes}
                drivers={companyDrivers}
                pickupRequests={pending}
                regions={regions}
            />
        );
    }

    if (activeTab === 'activity-log') {
        return <ActivityLogPage companyCode={companyCode} userRole={userRole} />;
    }

    if (activeTab === 'clients') {
        return (
            <ClientsTable
                clients={clients}
                onView={setSelectedClient}
                onDelete={handleDeleteClient}
                onEditLocation={setEditingClientLocation}
                onEditEquipment={setEditingClientEquipment}
                onImport={() => setShowImportClientsModal(true)}
                equipment={equipment}
                wasteTypes={wasteTypes}
                regions={regions}
                showRegionColumn={userRole === 'company_admin'}
            />
        );
    }

    if (activeTab === 'print') {
        return (
            <PrintExport
                clients={clients}
                requests={pending}
                processedRequests={processedRequests}
                wasteTypes={wasteTypes}
                onClientClick={handleClientClick}
            />
        );
    }

    if (activeTab === 'equipment') {
        return (
            <EquipmentManagement
                equipment={equipment}
                onAdd={handleAddEquipment}
                onAssign={handleAssignEquipment}
                onDelete={handleDeleteEquipment}
                onEdit={handleEditEquipment}
                clients={clients}
            />
        );
    }

    if (activeTab === 'wastetypes') {
        return (
            <WasteTypesManagement
                wasteTypes={wasteTypes}
                onAdd={handleAddWasteType}
                onDelete={handleDeleteWasteType}
                onEdit={handleEditWasteType}
                clients={clients}
                onUpdateClientWasteTypes={handleUpdateClientWasteTypes}
                onBulkUpdate={handleBulkWasteTypeUpdate}
            />
        );
    }

    if (activeTab === 'vehicles') {
        return <VehiclesPage userRole={userRole} />;
    }

    if (activeTab === 'fuel') {
        return <FuelLogsPage />;
    }

    if (activeTab === 'map') {
        return (
            <div className="flex flex-col h-full">
                <div className="flex gap-2 p-3 bg-white border-b shrink-0">
                    <button
                        onClick={() => setMapType('requests')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium ${mapType === 'requests' ? 'bg-emerald-600 text-white' : 'bg-white border'}`}
                    >
                        Zahtevi ({pending.length})
                    </button>
                    <button
                        onClick={() => setMapType('clients')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium ${mapType === 'clients' ? 'bg-emerald-600 text-white' : 'bg-white border'}`}
                    >
                        Klijenti ({clients.length})
                    </button>
                </div>
                <MapView
                    requests={pending}
                    clients={clients}
                    type={mapType}
                    onClientLocationEdit={setEditingClientLocation}
                    wasteTypes={wasteTypes}
                    drivers={companyDrivers}
                    onAssignDriver={handleAssignDriverFromMap}
                    driverAssignments={driverAssignments}
                    onSetClientLocation={async (clientId, lat, lng) => {
                        await setClientLocationWithRequests(clientId, lat, lng);
                        await fetchCompanyClients();
                    }}
                />
            </div>
        );
    }

    if (activeTab === 'inventory') {
        return <InventoryPage wasteTypes={wasteTypes} regions={regions} userRole={userRole} userRegionId={user?.region_id} />;
    }

    if (activeTab === 'outbound') {
        return <OutboundPage wasteTypes={wasteTypes} />;
    }

    if (activeTab === 'transactions') {
        return <TransactionsPage wasteTypes={wasteTypes} />;
    }

    // Default: Overview Page for manager dashboard
    return (
        <OverviewPage
            onNavigate={(tab, params) => {
                setActiveTab(tab);
                if (params?.action === 'create') setShowCreateRequestModal(true);
                if (params?.selectedId) {
                    const req = pending.find(r => r.id === params.selectedId);
                    if (req) setSelectedRequest(req);
                }
            }}
            companyMembers={companyMembers}
            processedRequests={processedRequests}
            companyDrivers={companyDrivers}
        />
    );
};

export default ManagerDashboard;
