import { useMemo } from 'react';
import { AlertTriangle, Package, TrendingDown } from 'lucide-react';

/**
 * LowStockAlert - Komponenta za prikaz upozorenja o niskom stanju zaliha
 */
export const LowStockAlert = ({
    inventoryItems = [],
    wasteTypes = [],
    thresholds = {}, // { [wasteTypeId]: minQuantityKg }
    defaultThreshold = 100 // Default 100kg
}) => {
    // Find items below threshold
    const lowStockItems = useMemo(() => {
        const result = [];

        // Group by waste type
        const byWasteType = {};
        inventoryItems.forEach(item => {
            const wtId = item.waste_type_id;
            if (!byWasteType[wtId]) {
                byWasteType[wtId] = {
                    waste_type: item.waste_type,
                    total_kg: 0,
                    warehouses: []
                };
            }
            byWasteType[wtId].total_kg += parseFloat(item.quantity_kg) || 0;
            byWasteType[wtId].warehouses.push({
                name: item.inventory?.name,
                quantity: parseFloat(item.quantity_kg) || 0
            });
        });

        // Check against thresholds
        Object.entries(byWasteType).forEach(([wtId, data]) => {
            const threshold = thresholds[wtId] || defaultThreshold;
            if (data.total_kg < threshold && data.total_kg >= 0) {
                result.push({
                    ...data,
                    threshold,
                    percentage: threshold > 0 ? Math.round((data.total_kg / threshold) * 100) : 0
                });
            }
        });

        return result.sort((a, b) => a.percentage - b.percentage);
    }, [inventoryItems, thresholds, defaultThreshold]);

    if (lowStockItems.length === 0) {
        return null;
    }

    return (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="text-amber-600" size={20} />
                <h3 className="font-semibold text-amber-800">Nizak nivo zaliha</h3>
                <span className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full text-xs font-medium">
                    {lowStockItems.length}
                </span>
            </div>

            <div className="space-y-2">
                {lowStockItems.map((item, idx) => (
                    <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-white rounded-xl border border-amber-100"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                item.percentage < 25 ? 'bg-red-100' :
                                item.percentage < 50 ? 'bg-amber-100' :
                                'bg-yellow-100'
                            }`}>
                                {item.waste_type?.icon ? (
                                    <span className="text-lg">{item.waste_type.icon}</span>
                                ) : (
                                    <Package size={18} className={
                                        item.percentage < 25 ? 'text-red-600' :
                                        item.percentage < 50 ? 'text-amber-600' :
                                        'text-yellow-600'
                                    } />
                                )}
                            </div>
                            <div>
                                <p className="font-medium text-slate-800">
                                    {item.waste_type?.label || item.waste_type?.name || 'Nepoznato'}
                                </p>
                                <p className="text-xs text-slate-500">
                                    Min: {item.threshold.toFixed(0)} kg
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className={`font-bold ${
                                item.percentage < 25 ? 'text-red-600' :
                                item.percentage < 50 ? 'text-amber-600' :
                                'text-yellow-600'
                            }`}>
                                {item.total_kg.toFixed(1)} kg
                            </p>
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                <TrendingDown size={12} />
                                <span>{item.percentage}%</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <p className="text-xs text-amber-600 mt-3">
                Naručite zalihe da biste izbegli prekide u radu
            </p>
        </div>
    );
};

export default LowStockAlert;
