import { Clock, Truck, Calendar, ArrowUp, ArrowDown, Minus } from 'lucide-react';

const StatsCards = ({ stats }) => {
  const {
    pendingRequests = 0,
    activeDrivers = 0,
    totalDrivers = 0,
    processedToday = 0,
    trend = null,
  } = stats;

  const cards = [
    {
      label: 'Nedodeljeni zahtevi',
      value: pendingRequests,
      trend: pendingRequests > 0 ? `${pendingRequests} za dodelu` : null,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      icon: Clock,
    },
    {
      label: 'Aktivni vozači',
      value: activeDrivers,
      sub: `/ ${totalDrivers} ukupno`,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      icon: Truck,
    },
    {
      label: 'Obrađeno danas',
      value: processedToday,
      value: processedToday,
      trend: trend, // Now expects a number
      trendLabel: trend !== null ? `${Math.abs(trend)}%` : null,
      trendColor: trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-600' : 'text-slate-400',
      trendIcon: trend > 0 ? ArrowUp : trend < 0 ? ArrowDown : Minus,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      icon: Calendar,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-5 mb-5">
      {cards.map((stat, i) => (
        <div
          key={i}
          className="bg-white/95 backdrop-blur-sm px-5 py-4 rounded-2xl border border-slate-200/50 shadow-lg flex items-center justify-between hover:-translate-y-0.5 transition-transform duration-200 cursor-pointer group"
        >
          <div>
            <p className="text-slate-500 text-sm font-medium mb-1 group-hover:text-emerald-600 transition-colors">
              {stat.label}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-slate-800">{stat.value}</h3>
              {stat.sub && (
                <span className="text-slate-400 text-sm">{stat.sub}</span>
              )}
              {/* Trend visual for Processed Today (or any card with trend number) */}
              {stat.label === 'Obrađeno danas' && stat.trend !== null && (
                <div className={`flex items-center text-xs font-bold px-1.5 py-0.5 rounded-full bg-white/50 border border-slate-100 ${stat.trendColor}`}>
                  <stat.trendIcon size={12} className="mr-0.5" />
                  {stat.trendLabel}
                </div>
              )}
              {/* Fallback for other cards using string trend */}
              {typeof stat.trend === 'string' && (
                <span className="text-slate-400 text-sm">{stat.trend}</span>
              )}
            </div>
          </div>
          <div
            className={`p-3 rounded-xl ${stat.bgColor} ${stat.color} group-hover:scale-110 transition-transform`}
          >
            <stat.icon size={24} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
