/**
 * CompanyAdminDashboard - Sadržaj za company_admin role
 * Ekstraktovano iz Dashboard.jsx
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
    ManagerRequestsTable, HistoryTable, AnalyticsPage, ManagerAnalyticsPage, DriverAnalyticsPage,
    PrintExport, EquipmentManagement, WasteTypesManagement, MapView,
    ActivityLogPage, RegionNodeEditor, CompanyStaffPage, RegionsPage, CompanySettingsPage,
    InventoryPage, OutboundPage, TransactionsPage, VehiclesPage, FuelLogsPage
} from '../../DashboardComponents';
import { OverviewPage } from '../../../components/overview';
import { OnboardingWizard } from '../../../components/onboarding';

export const CompanyAdminDashboard = ({
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
    historyPage,
    companyMembers,
    // Handlers
    setSelectedRequest,
    handleClientClick,
    // History handlers
    fetchProcessedRequests,
    setProcessedRequests,
    updateProcessedRequest,
    deleteProcessedRequest,
    handleAssignDriverToProcessed,
    resetManagerAnalytics,
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
    setClientLocationWithRequests,
    fetchCompanyClients,
    toast
}) => {
    if (activeTab === 'requests') {
        return (
            <div className="space-y-4">
                <div>
                    <h1 className="text-2xl font-bold">Aktivni zahtevi</h1>
                    <p className="text-slate-500">Pregled svih aktivnih zahteva u firmi (samo za čitanje)</p>
                </div>
                <ManagerRequestsTable
                    requests={pending}
                    wasteTypes={wasteTypes}
                    onView={setSelectedRequest}
                    onClientClick={handleClientClick}
                    assignments={driverAssignments}
                    drivers={companyDrivers}
                    readOnly={true}
                />
            </div>
        );
    }

    if (activeTab === 'staff') {
        return <CompanyStaffPage />;
    }

    if (activeTab === 'regions') {
        return <RegionsPage />;
    }

    if (activeTab === 'visual') {
        return <RegionNodeEditor fullscreen={false} />;
    }

    if (activeTab === 'analytics') {
        return (
            <AnalyticsPage
                processedRequests={processedRequests}
                wasteTypes={wasteTypes}
                clients={clients}
                drivers={companyDrivers}
                equipment={equipment}
                pickupRequests={pending}
                regions={regions}
                userRole={userRole}
            />
        );
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

    if (activeTab === 'history') {
        return (
            <div className="space-y-4">
                <h1 className="text-2xl font-bold">Istorija svih zahteva</h1>
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

    if (activeTab === 'inventory') {
        return <InventoryPage wasteTypes={wasteTypes} regions={regions} userRole={userRole} userRegionId={user?.region_id} />;
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

    if (activeTab === 'map') {
        return (
            <div className="flex flex-col h-full">
                <MapView
                    requests={pending}
                    clients={clients}
                    type="requests"
                    wasteTypes={wasteTypes}
                    drivers={[]}
                    onSetClientLocation={async (clientId, lat, lng) => {
                        await setClientLocationWithRequests(clientId, lat, lng);
                        await fetchCompanyClients();
                    }}
                />
            </div>
        );
    }

    if (activeTab === 'settings') {
        return (
            <div className="space-y-8">
                <CompanySettingsPage />
                <div className="border-t pt-8">
                    <h2 className="text-xl font-bold mb-6">Vrste otpada i oprema</h2>
                    <WasteTypesManagement
                        wasteTypes={wasteTypes}
                        onAdd={handleAddWasteType}
                        onDelete={handleDeleteWasteType}
                        onEdit={handleEditWasteType}
                        clients={clients}
                        onUpdateClientWasteTypes={handleUpdateClientWasteTypes}
                        onBulkUpdate={handleBulkWasteTypeUpdate}
                    />
                </div>
                <div className="border-t pt-8">
                    <EquipmentManagement
                        equipment={equipment}
                        onAdd={handleAddEquipment}
                        onAssign={handleAssignEquipment}
                        onDelete={handleDeleteEquipment}
                        onEdit={handleEditEquipment}
                        clients={clients}
                    />
                </div>
            </div>
        );
    }

    // Default: Company Admin Dashboard - New Overview Page
    return (
        <CompanyAdminOverview
            setActiveTab={setActiveTab}
            setSelectedRequest={setSelectedRequest}
            pending={pending}
            companyMembers={companyMembers}
            processedRequests={processedRequests}
            companyDrivers={companyDrivers}
            regions={regions}
            wasteTypes={wasteTypes}
            user={user}
        />
    );
};

/**
 * CompanyAdminOverview - Wrapper that includes onboarding wizard
 */
const CompanyAdminOverview = ({
    setActiveTab,
    setSelectedRequest,
    pending,
    companyMembers,
    processedRequests,
    companyDrivers,
    regions,
    wasteTypes,
    user,
}) => {
    const [showOnboarding, setShowOnboarding] = useState(false);

    // Check if onboarding should be shown
    useEffect(() => {
        const onboardingKey = `onboarding-${user?.company_code}`;
        const hasSeenOnboarding = localStorage.getItem(onboardingKey);

        // Show onboarding if:
        // 1. User hasn't seen it yet
        // 2. Setup is not complete
        const hasRegions = regions?.length > 0;
        const hasWasteTypes = wasteTypes?.length > 0;
        const hasStaff = companyMembers?.filter(m =>
            m.role === 'manager' || m.role === 'driver'
        ).length > 0;

        const isSetupComplete = hasRegions && hasWasteTypes && hasStaff;

        if (!hasSeenOnboarding && !isSetupComplete) {
            // Delay showing wizard a bit for better UX
            const timer = setTimeout(() => setShowOnboarding(true), 500);
            return () => clearTimeout(timer);
        }
    }, [user?.company_code, regions?.length, wasteTypes?.length, companyMembers]);

    const handleOnboardingClose = () => {
        setShowOnboarding(false);
    };

    const handleOnboardingComplete = ({ skipped }) => {
        const onboardingKey = `onboarding-${user?.company_code}`;
        if (!skipped) {
            localStorage.setItem(onboardingKey, 'completed');
        } else {
            // If skipped, mark with timestamp so we can show again later
            localStorage.setItem(onboardingKey, `skipped-${Date.now()}`);
        }
    };

    // Filter staff for onboarding
    const staff = useMemo(() =>
        companyMembers?.filter(m =>
            m.role === 'manager' || m.role === 'driver' || m.role === 'supervisor'
        ) || [],
        [companyMembers]
    );

    return (
        <>
            <OverviewPage
                onNavigate={(tab, params) => {
                    setActiveTab(tab);
                    if (params?.selectedId) {
                        const req = pending.find(r => r.id === params.selectedId);
                        if (req) setSelectedRequest(req);
                    }
                }}
                companyMembers={companyMembers}
                processedRequests={processedRequests}
                companyDrivers={companyDrivers}
            />

            {/* Onboarding Wizard Modal */}
            <OnboardingWizard
                open={showOnboarding}
                onClose={handleOnboardingClose}
                onComplete={handleOnboardingComplete}
                companyName={user?.company_name || 'Vaša firma'}
                existingRegions={regions || []}
                existingWasteTypes={wasteTypes || []}
                existingStaff={staff}
            />
        </>
    );
};

export default CompanyAdminDashboard;
