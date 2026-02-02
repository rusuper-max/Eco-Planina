import { useMemo, useState } from 'react';
import { TrendingUp, ArrowDownToLine, ArrowUpFromLine, Calendar, ChevronDown } from 'lucide-react';

/**
 * InventoryChart - Jednostavan grafikon ulaza/izlaza kroz vreme
 * Koristi čist CSS umesto externe biblioteke
 */
export const InventoryChart = ({ transactions = [], days: initialDays = 14 }) => {
    const [days, setDays] = useState(initialDays);

    const periodOptions = [
        { value: 7, label: '7 dana' },
        { value: 14, label: '14 dana' },
        { value: 30, label: '30 dana' },
        { value: 90, label: '3 meseca' },
        { value: 365, label: 'Godinu dana' },
        { value: 9999, label: 'Sve vreme' }
    ];
    // Group transactions by day/week/month depending on period
    const chartData = useMemo(() => {
        const now = new Date();
        const result = [];

        // For "all time", find earliest transaction
        let actualDays = days;
        if (days === 9999 && transactions.length > 0) {
            const dates = transactions.map(tx => new Date(tx.created_at)).filter(d => !isNaN(d));
            if (dates.length > 0) {
                const earliest = new Date(Math.min(...dates));
                actualDays = Math.ceil((now - earliest) / (1000 * 60 * 60 * 24)) + 1;
            }
        }

        // Determine grouping: daily (<=30), weekly (<=90), monthly (>90)
        const groupBy = actualDays <= 30 ? 'day' : actualDays <= 90 ? 'week' : 'month';

        if (groupBy === 'day') {
            // Daily grouping
            for (let i = actualDays - 1; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);

                const dateStr = date.toISOString().split('T')[0];
                const dayNum = date.getDate();

                result.push({
                    date: dateStr,
                    label: `${dayNum}`,
                    in: 0,
                    out: 0
                });
            }
        } else if (groupBy === 'week') {
            // Weekly grouping
            const weeks = Math.ceil(actualDays / 7);
            for (let i = weeks - 1; i >= 0; i--) {
                const weekStart = new Date(now);
                weekStart.setDate(weekStart.getDate() - (i * 7) - 6);
                weekStart.setHours(0, 0, 0, 0);

                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);

                result.push({
                    dateStart: weekStart.toISOString().split('T')[0],
                    dateEnd: weekEnd.toISOString().split('T')[0],
                    label: `${weekStart.getDate()}.${weekStart.getMonth() + 1}`,
                    in: 0,
                    out: 0
                });
            }
        } else {
            // Monthly grouping
            const months = Math.ceil(actualDays / 30);
            for (let i = Math.min(months, 12) - 1; i >= 0; i--) {
                const monthDate = new Date(now);
                monthDate.setMonth(monthDate.getMonth() - i);
                monthDate.setDate(1);
                monthDate.setHours(0, 0, 0, 0);

                const monthEnd = new Date(monthDate);
                monthEnd.setMonth(monthEnd.getMonth() + 1);
                monthEnd.setDate(0);

                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec'];

                result.push({
                    dateStart: monthDate.toISOString().split('T')[0],
                    dateEnd: monthEnd.toISOString().split('T')[0],
                    label: monthNames[monthDate.getMonth()],
                    in: 0,
                    out: 0
                });
            }
        }

        // Sum transactions
        transactions.forEach(tx => {
            const txDate = tx.created_at?.split('T')[0];
            if (!txDate) return;

            let dayData;
            if (groupBy === 'day') {
                dayData = result.find(d => d.date === txDate);
            } else {
                dayData = result.find(d => txDate >= d.dateStart && txDate <= d.dateEnd);
            }

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
                <div className="relative">
                    <select
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="appearance-none pl-7 pr-8 py-1.5 text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                        {periodOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>
                                {opt.value === 9999 ? 'Sve vreme' : `Poslednjih ${opt.label}`}
                            </option>
                        ))}
                    </select>
                    <Calendar size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
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
