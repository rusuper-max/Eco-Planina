/**
 * SupervisorDashboard - Sadržaj za supervisor role
 * Ekstraktovano iz Dashboard.jsx
 */
import React from 'react';
import { Plus } from 'lucide-react';
import {
    ManagerRequestsTable, HistoryTable, AnalyticsPage, ManagerAnalyticsPage, DriverAnalyticsPage,
    ClientsTable, PrintExport, EquipmentManagement, WasteTypesManagement, MapView,
    ActivityLogPage, RegionNodeEditor, CompanyStaffPage,
    InventoryPage, OutboundPage, TransactionsPage, VehiclesPage, FuelLogsPage
} from '../../DashboardComponents';
import DriverManagement from '../../DriverManagement';
import { OverviewPage } from '../../../components/overview';
import ErrorBoundary from '../../../components/common/ErrorBoundary';

export const SupervisorDashboard = ({
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
    handleQuickAssignDriver,
    setEditingClientLocation,
    setShowCreateRequestModal,
    // History handlers
    fetchProcessedRequests,
    setProcessedRequests,
    updateProcessedRequest,
    deleteProcessedRequest,
    handleAssignDriverToProcessed,
    resetManagerAnalytics,
    // Client handlers
    setSelectedClient,
    handleDeleteClient,
    setEditingClientEquipment,
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
    toast,
    // User settings
    allowBulkMapAssignment = true
}) => {
    if (activeTab === 'requests') {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Aktivni zahtevi</h1>
                        <p className="text-slate-500">Zahtevi iz vaših dodeljenih filijala</p>
                    </div>
                    <button
                        onClick={() => setShowCreateRequestModal(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium flex items-center gap-2"
                    >
                        <Plus size={18} /> Novi zahtev
                    </button>
                </div>
                <ManagerRequestsTable
                    requests={pending}
                    wasteTypes={wasteTypes}
                    onView={setSelectedRequest}
                    onClientClick={handleClientClick}
                    assignments={driverAssignments}
                    drivers={companyDrivers}
                    onProcess={handleProcessRequest}
                    onReject={handleRejectRequest}
                    onAssignDriver={handleQuickAssignDriver}
                    readOnly={false}
                />
            </div>
        );
    }

    if (activeTab === 'staff') {
        return <CompanyStaffPage />;
    }

    if (activeTab === 'drivers') {
        return <DriverManagement wasteTypes={wasteTypes} />;
    }

    if (activeTab === 'history') {
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-bold">Istorija zahteva</h1>
                <p className="text-slate-500">Kliknite na strelicu za prikaz timeline-a akcija za svaki zahtev</p>
                <HistoryTable
                    requests={processedRequests}
                    wasteTypes={wasteTypes}
                    onView={setSelectedRequest}
                    showDetailedView={true}
                    drivers={companyDrivers}
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
                            toast.success('Zahtev je obrisan iz istorije');
                        } catch (err) {
                            setProcessedRequests(previous);
                            toast.error('Greška pri brisanju: ' + (err.message || 'Nepoznata greška'));
                        }
                    }}
                />
            </div>
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
                equipment={equipment}
                wasteTypes={wasteTypes}
                regions={regions}
                showRegionColumn={true}
            />
        );
    }

    if (activeTab === 'inventory') {
        return (
            <ErrorBoundary title="Greška u inventaru" message="Došlo je do greške pri učitavanju inventara. Pokušajte da osvežite stranicu.">
                <InventoryPage wasteTypes={wasteTypes} regions={regions} userRole={userRole} userRegionId={user?.region_id} />
            </ErrorBoundary>
        );
    }

    if (activeTab === 'outbound') {
        return <OutboundPage wasteTypes={wasteTypes} />;
    }

    if (activeTab === 'transactions') {
        return <TransactionsPage wasteTypes={wasteTypes} />;
    }

    if (activeTab === 'vehicles') {
        return <VehiclesPage userRole={userRole} />;
    }

    if (activeTab === 'fuel') {
        return <FuelLogsPage />;
    }

    if (activeTab === 'visual') {
        return <RegionNodeEditor fullscreen={false} />;
    }

    if (activeTab === 'manager-analytics') {
        return (
            <ManagerAnalyticsPage
                processedRequests={processedRequests}
                members={companyMembers}
                wasteTypes={wasteTypes}
                driverAssignments={driverAssignments}
                onResetStats={async () => {
                    await resetManagerAnalytics();
                    const fresh = await fetchProcessedRequests();
                    setProcessedRequests(fresh);
                    toast.success('Statistika je uspešno resetovana');
                }}
            />
        );
    }

    if (activeTab === 'driver-analytics') {
        return (
            <DriverAnalyticsPage
                driverAssignments={driverAssignments}
                drivers={companyDrivers}
                wasteTypes={wasteTypes}
                processedRequests={processedRequests}
                onResetStats={async () => {
                    await resetManagerAnalytics();
                    const fresh = await fetchProcessedRequests();
                    setProcessedRequests(fresh);
                    toast.success('Statistika je resetovana');
                }}
            />
        );
    }

    if (activeTab === 'analytics') {
        return (
            <AnalyticsPage
                processedRequests={processedRequests}
                wasteTypes={wasteTypes}
                clients={clients}
                drivers={companyDrivers}
                pickupRequests={pending}
                regions={regions}
                userRole={userRole}
                supervisorRegionIds={user?.supervisor_region_ids || []}
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
                    allowBulkAssignment={allowBulkMapAssignment}
                    onSetClientLocation={async (clientId, lat, lng) => {
                        await setClientLocationWithRequests(clientId, lat, lng);
                        await fetchCompanyClients();
                    }}
                />
            </div>
        );
    }

    // Default: Supervisor Dashboard - Overview Page
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

export default SupervisorDashboard;
