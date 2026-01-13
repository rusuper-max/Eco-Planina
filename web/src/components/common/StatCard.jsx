import { memo } from 'react';

export const StatCard = memo(({ label, value, subtitle, icon, onClick }) => (
    <div
        onClick={onClick}
        className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all' : ''}`}
    >
        <div className="flex justify-between items-start">
            <div>
                <p className="text-slate-500 text-sm">{label}</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-1">{value}</h3>
                {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">{icon}</div>
        </div>
    </div>
));

export default StatCard;
