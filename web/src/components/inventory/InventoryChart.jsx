import { useMemo } from 'react';
import { TrendingUp, ArrowDownToLine, ArrowUpFromLine, Calendar } from 'lucide-react';

/**
 * InventoryChart - Jednostavan grafikon ulaza/izlaza kroz vreme
 * Koristi čist CSS umesto eksterne biblioteke
 */
export const InventoryChart = ({ transactions = [], days = 14 }) => {
    // Group transactions by day
    const chartData = useMemo(() => {
        const now = new Date();
        const result = [];

        // Create array of last N days
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const dateStr = date.toISOString().split('T')[0];
            const dayName = date.toLocaleDateString('sr-RS', { weekday: 'short' });
            const dayNum = date.getDate();

            result.push({
                date: dateStr,
                label: `${dayNum}`,
                dayName,
                in: 0,
                out: 0
            });
        }

        // Sum transactions per day
        transactions.forEach(tx => {
            const txDate = tx.created_at?.split('T')[0];
            const dayData = result.find(d => d.date === txDate);
            if (dayData) {
                const qty = parseFloat(tx.quantity_kg) || 0;
                if (tx.transaction_type === 'in' || tx.transaction_type === 'adjustment_in') {
                    dayData.in += qty;
                } else if (tx.transaction_type === 'out' || tx.transaction_type === 'adjustment_out') {
                    dayData.out += qty;
                }
            }
        });

        return result;
    }, [transactions, days]);

    // Find max value for scaling
    const maxValue = useMemo(() => {
        let max = 0;
        chartData.forEach(d => {
            if (d.in > max) max = d.in;
            if (d.out > max) max = d.out;
        });
        return max || 100; // Minimum scale
    }, [chartData]);

    // Calculate totals
    const totals = useMemo(() => {
        return chartData.reduce((acc, d) => ({
            in: acc.in + d.in,
            out: acc.out + d.out
        }), { in: 0, out: 0 });
    }, [chartData]);

    const getBarHeight = (value) => {
        return Math.max(2, (value / maxValue) * 100); // Min 2% height for visibility
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <TrendingUp className="text-emerald-600" size={20} />
                    <h3 className="font-semibold text-slate-800">Ulazi / Izlazi</h3>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Calendar size={14} />
                    <span>Poslednjih {days} dana</span>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <ArrowDownToLine size={18} className="text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-xs text-emerald-600">Ukupno ulaza</p>
                        <p className="text-lg font-bold text-emerald-700">{totals.in.toFixed(1)} kg</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <ArrowUpFromLine size={18} className="text-blue-600" />
                    </div>
                    <div>
                        <p className="text-xs text-blue-600">Ukupno izlaza</p>
                        <p className="text-lg font-bold text-blue-700">{totals.out.toFixed(1)} kg</p>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="relative">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-6 w-10 flex flex-col justify-between text-xs text-slate-400">
                    <span>{maxValue >= 1000 ? `${(maxValue/1000).toFixed(1)}t` : `${maxValue.toFixed(0)}kg`}</span>
                    <span>{maxValue >= 1000 ? `${(maxValue/2000).toFixed(1)}t` : `${(maxValue/2).toFixed(0)}kg`}</span>
                    <span>0</span>
                </div>

                {/* Bars container */}
                <div className="ml-12 flex items-end gap-1 h-40 border-b border-l border-slate-200">
                    {chartData.map((day, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group">
                            {/* Bars */}
                            <div className="flex items-end gap-0.5 w-full h-full pb-1">
                                {/* In bar */}
                                <div
                                    className="flex-1 bg-emerald-400 rounded-t transition-all hover:bg-emerald-500"
                                    style={{ height: `${getBarHeight(day.in)}%` }}
                                    title={`Ulaz: ${day.in.toFixed(1)} kg`}
                                />
                                {/* Out bar */}
                                <div
                                    className="flex-1 bg-blue-400 rounded-t transition-all hover:bg-blue-500"
                                    style={{ height: `${getBarHeight(day.out)}%` }}
                                    title={`Izlaz: ${day.out.toFixed(1)} kg`}
                                />
                            </div>

                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                                <div className="bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                    <p className="text-emerald-300">Ulaz: {day.in.toFixed(1)} kg</p>
                                    <p className="text-blue-300">Izlaz: {day.out.toFixed(1)} kg</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* X-axis labels */}
                <div className="ml-12 flex gap-1 mt-1">
                    {chartData.map((day, idx) => (
                        <div key={idx} className="flex-1 text-center">
                            <span className="text-xs text-slate-400">{day.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-emerald-400 rounded" />
                    <span className="text-xs text-slate-600">Ulaz</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-blue-400 rounded" />
                    <span className="text-xs text-slate-600">Izlaz</span>
                </div>
            </div>
        </div>
    );
};

export default InventoryChart;
