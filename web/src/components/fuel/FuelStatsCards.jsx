import { Fuel, TrendingUp, Gauge, DollarSign, Truck } from 'lucide-react';

/**
 * FuelStatsCards - Kartice sa statistikom goriva
 */
export const FuelStatsCards = ({ stats = [], vehicles = [] }) => {
    // Calculate totals across all vehicles
    const totals = stats.reduce((acc, s) => ({
        totalLiters: acc.totalLiters + parseFloat(s.total_liters || 0),
        totalCost: acc.totalCost + parseFloat(s.total_cost || 0),
        refuelCount: acc.refuelCount + parseInt(s.refuel_count || 0)
    }), { totalLiters: 0, totalCost: 0, refuelCount: 0 });

    // Calculate average consumption (weighted by kilometers)
    const avgConsumption = stats.length > 0
        ? stats.filter(s => s.avg_consumption_per_100km).reduce((sum, s) => sum + parseFloat(s.avg_consumption_per_100km), 0) / stats.filter(s => s.avg_consumption_per_100km).length
        : null;

    // Find vehicle with best and worst consumption
    const sortedByConsumption = stats
        .filter(s => s.avg_consumption_per_100km)
        .sort((a, b) => parseFloat(a.avg_consumption_per_100km) - parseFloat(b.avg_consumption_per_100km));

    const bestVehicle = sortedByConsumption[0];
    const worstVehicle = sortedByConsumption[sortedByConsumption.length - 1];

    const formatCurrency = (amount) => {
        if (!amount) return '-';
        return parseFloat(amount).toLocaleString('sr-RS', { minimumFractionDigits: 0 }) + ' RSD';
    };

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Liters */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-4 border border-amber-200">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                        <Fuel size={24} className="text-white" />
                    </div>
                    <div>
                        <p className="text-sm text-amber-700">Ukupno goriva</p>
                        <p className="text-2xl font-bold text-amber-900">
                            {totals.totalLiters.toFixed(0)} L
                        </p>
                    </div>
                </div>
            </div>

            {/* Total Cost */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-4 border border-emerald-200">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                        <DollarSign size={24} className="text-white" />
                    </div>
                    <div>
                        <p className="text-sm text-emerald-700">Ukupni troškovi</p>
                        <p className="text-xl font-bold text-emerald-900">
                            {formatCurrency(totals.totalCost)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Average Consumption */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                        <Gauge size={24} className="text-white" />
                    </div>
                    <div>
                        <p className="text-sm text-blue-700">Prosečna potrošnja</p>
                        <p className="text-2xl font-bold text-blue-900">
                            {avgConsumption ? `${avgConsumption.toFixed(1)} L/100km` : '-'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Active Vehicles */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 border border-purple-200">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                        <Truck size={24} className="text-white" />
                    </div>
                    <div>
                        <p className="text-sm text-purple-700">Vozila sa zapisima</p>
                        <p className="text-2xl font-bold text-purple-900">
                            {stats.length} / {vehicles.length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Best/Worst consumption - only show if we have data */}
            {bestVehicle && worstVehicle && bestVehicle.vehicle_id !== worstVehicle.vehicle_id && (
                <>
                    <div className="col-span-2 lg:col-span-2 bg-white rounded-2xl p-4 border border-slate-100">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp size={18} className="text-emerald-600" />
                            <span className="text-sm font-medium text-slate-600">Najefikasnije vozilo</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-slate-800">{bestVehicle.registration}</p>
                                <p className="text-sm text-slate-500">{bestVehicle.brand} {bestVehicle.model}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-bold text-emerald-600">
                                    {parseFloat(bestVehicle.avg_consumption_per_100km).toFixed(1)} L/100km
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="col-span-2 lg:col-span-2 bg-white rounded-2xl p-4 border border-slate-100">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp size={18} className="text-red-600 rotate-180" />
                            <span className="text-sm font-medium text-slate-600">Najviše troši</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-slate-800">{worstVehicle.registration}</p>
                                <p className="text-sm text-slate-500">{worstVehicle.brand} {worstVehicle.model}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-bold text-red-600">
                                    {parseFloat(worstVehicle.avg_consumption_per_100km).toFixed(1)} L/100km
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default FuelStatsCards;
