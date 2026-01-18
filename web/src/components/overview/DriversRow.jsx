import { Users, Plus } from 'lucide-react';

const DriversRow = ({ drivers = [], onManage, onAddDriver, onSelectDriver }) => {
  const getStatusStyle = (status) => {
    switch (status) {
      case 'busy':
      case 'in_progress':
      case 'assigned':
        return {
          bg: 'bg-slate-400',
          label: 'Zauzet',
        };
      case 'available':
      default:
        return {
          bg: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
          label: 'Slobodan',
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 shrink-0">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-bold text-slate-800 flex items-center gap-2 text-base">
          <Users size={20} className="text-emerald-600" /> Dostupni Vozači
        </h4>
        {onManage && (
          <button
            onClick={onManage}
            className="text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors"
          >
            Upravljaj →
          </button>
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {drivers.map((driver) => {
          const statusStyle = getStatusStyle(driver.status);
          return (
            <div
              key={driver.id}
              onClick={() => onSelectDriver?.(driver)}
              className="min-w-[180px] p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center gap-3 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-all group"
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md transition-transform group-hover:scale-105 ${statusStyle.bg}`}
              >
                {driver.name?.charAt(0)?.toUpperCase() || 'V'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800 truncate">{driver.name}</p>
                <p className="text-xs text-slate-500 font-medium">
                  {statusStyle.label}
                </p>
              </div>
            </div>
          );
        })}

        {/* Add Driver Button */}
        {onAddDriver && (
          <button
            onClick={onAddDriver}
            className="min-w-[100px] rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-slate-200 text-slate-400 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/20 transition-all"
          >
            <Plus size={24} className="mb-1 opacity-50" />
            <span className="text-xs font-bold">Dodaj</span>
          </button>
        )}

        {/* Empty State */}
        {drivers.length === 0 && !onAddDriver && (
          <div className="w-full text-center py-6 text-slate-400">
            <Users size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nema registrovanih vozača</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriversRow;
