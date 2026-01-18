import { useMemo, useState } from 'react';
import { useData } from '../../context';
import HeroSlider from './HeroSlider';
import StatsCards from './StatsCards';
import RequestsFeed from './RequestsFeed';
import DriversRow from './DriversRow';
import LiveMapPreview from './LiveMapPreview';
import DriverInfoModal from './DriverInfoModal';

const OverviewPage = ({
  onNavigate,
  // Optional overrides from Dashboard
  companyMembers: propMembers,
  processedRequests: propProcessed,
  companyDrivers: propDrivers,
}) => {
  const { pickupRequests = [], driverAssignments = [], driverLocations = [] } = useData();

  // State for driver info modal
  const [selectedDriver, setSelectedDriver] = useState(null);

  // Use props if provided, otherwise defaults
  const companyMembers = propMembers || [];
  const processedRequests = propProcessed || [];
  const companyDrivers = propDrivers || companyMembers.filter(m => m.role === 'driver');

  // Calculate stats
  const stats = useMemo(() => {
    // Count active drivers based on assignments
    const busyDriverIds = new Set(
      driverAssignments
        .filter(a => ['assigned', 'in_progress', 'picked_up'].includes(a.status))
        .map(a => a.driver_id)
    );

    const totalDrivers = companyDrivers.length;
    const activeDrivers = busyDriverIds.size;

    // Count processed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const processedToday = processedRequests.filter((r) => {
      const processedAt = new Date(r.processed_at);
      return processedAt >= today;
    }).length;

    return {
      pendingRequests: pickupRequests.length,
      activeDrivers,
      totalDrivers,
      processedToday,
      trend: null,
    };
  }, [pickupRequests, companyDrivers, processedRequests, driverAssignments]);

  // Get drivers for display with status from assignments
  const drivers = useMemo(() => {
    const busyDriverIds = new Set(
      driverAssignments
        .filter(a => ['assigned', 'in_progress', 'picked_up'].includes(a.status))
        .map(a => a.driver_id)
    );

    return companyDrivers
      .slice(0, 6)
      .map((d) => ({
        ...d,
        status: busyDriverIds.has(d.id) ? 'busy' : 'available',
      }));
  }, [companyDrivers, driverAssignments]);

  // Calculate drivers on field vs at base
  const driversOnField = drivers.filter(
    (d) => d.status === 'busy' || d.status === 'in_progress' || d.status === 'assigned'
  ).length;
  const driversAtBase = drivers.length - driversOnField;

  // Handle navigation
  const handleViewAllRequests = () => {
    onNavigate?.('requests');
  };

  const handleCreateRequest = () => {
    onNavigate?.('requests', { action: 'create' });
  };

  const handleSelectRequest = (request) => {
    onNavigate?.('requests', { selectedId: request.id });
  };

  const handleManageDrivers = () => {
    onNavigate?.('drivers');
  };

  const handleLiveView = () => {
    onNavigate?.('map');
  };

  const handleSelectDriver = (driver) => {
    setSelectedDriver(driver);
  };

  const handleAssignTask = (driver) => {
    // Navigate to drivers page with this driver pre-selected
    onNavigate?.('drivers', { selectedDriverId: driver.id });
  };

  return (
    <div className="h-full overflow-hidden flex flex-col relative">
      {/* Hero Background - Full width, positioned at top */}
      <div className="absolute inset-x-0 top-0 z-0">
        <HeroSlider pendingCount={stats.pendingRequests} />
      </div>

      {/* Content Layer - Over the hero */}
      <div className="relative z-10 flex-1 flex flex-col min-h-0">
        {/* Spacer to push content below hero text area */}
        <div className="h-[220px] shrink-0" />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col px-5 lg:px-6 pb-5 min-h-0">
          {/* Stats Row - Overlapping hero */}
          <StatsCards stats={stats} />

          {/* Main Grid - Takes all remaining space */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0">
            {/* Left Column: Requests Feed */}
            <div className="lg:col-span-4 xl:col-span-3 min-h-0 flex">
              <RequestsFeed
                requests={pickupRequests}
                assignments={driverAssignments}
                onViewAll={handleViewAllRequests}
                onCreateNew={handleCreateRequest}
                onSelectRequest={handleSelectRequest}
              />
            </div>

            {/* Right Column: Map & Drivers */}
            <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-4 min-h-0">
              {/* Map Container - Takes most of the space */}
              <div className="flex-1 min-h-[250px]">
                <LiveMapPreview
                  drivers={companyDrivers}
                  driverLocations={driverLocations}
                  requests={pickupRequests}
                  driversOnField={driversOnField}
                  driversAtBase={driversAtBase}
                  onLiveView={handleLiveView}
                />
              </div>

              {/* Drivers Row - Auto height */}
              <DriversRow
                drivers={drivers}
                onManage={handleManageDrivers}
                onSelectDriver={handleSelectDriver}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Driver Info Modal */}
      {selectedDriver && (
        <DriverInfoModal
          driver={selectedDriver}
          onClose={() => setSelectedDriver(null)}
          onAssignTask={handleAssignTask}
        />
      )}
    </div>
  );
};

export default OverviewPage;
