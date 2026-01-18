import { Navigation, Settings, Truck } from 'lucide-react';

const MapPreview = ({
  driversOnField = 0,
  driversAtBase = 0,
  onLiveView,
  onSettings
}) => {
  return (
    <div className="h-full bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
      {/* Placeholder Map Background */}
      <div className="absolute inset-0 bg-slate-100">
        <div
          className="w-full h-full opacity-10"
          style={{
            backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Decorative Map Elements */}
        <div className="absolute top-1/4 left-1/3 transform -translate-x-1/2 -translate-y-1/2">
          <div className="relative group/marker cursor-pointer">
            <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center animate-ping absolute top-0 left-0" />
            <div className="w-14 h-14 bg-emerald-600 rounded-full border-[3px] border-white shadow-xl flex items-center justify-center relative z-10 text-white transition-transform group-hover/marker:scale-110">
              <Truck size={22} />
            </div>
          </div>
        </div>

        <div className="absolute bottom-1/3 right-1/4">
          <div className="w-10 h-10 bg-amber-500 rounded-full border-[3px] border-white shadow-xl flex items-center justify-center text-white animate-bounce cursor-pointer hover:bg-amber-600 transition-colors">
            <span className="text-xs font-bold">3</span>
          </div>
        </div>

        {/* Another truck marker */}
        <div className="absolute top-1/2 right-1/3">
          <div className="w-10 h-10 bg-blue-500 rounded-full border-[3px] border-white shadow-xl flex items-center justify-center text-white">
            <Truck size={16} />
          </div>
        </div>
      </div>

      {/* Overlay Controls */}
      <div className="absolute top-6 right-6 flex flex-col gap-2">
        <button
          onClick={onLiveView}
          className="p-3 bg-white rounded-xl shadow-lg border border-slate-100 text-slate-600 hover:text-emerald-600 hover:scale-105 transition-all"
        >
          <Navigation size={20} />
        </button>
        {onSettings && (
          <button
            onClick={onSettings}
            className="p-3 bg-white rounded-xl shadow-lg border border-slate-100 text-slate-600 hover:text-emerald-600 hover:scale-105 transition-all"
          >
            <Settings size={20} />
          </button>
        )}
      </div>

      {/* Bottom Status Bar - Compact */}
      <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-white/50 shadow-lg flex items-center justify-between">
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
            Status Flote
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-bold text-slate-700">
                {driversOnField} na terenu
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-300" />
              <span className="text-xs font-medium text-slate-500">
                {driversAtBase} u bazi
              </span>
            </div>
          </div>
        </div>
        {onLiveView && (
          <button
            onClick={onLiveView}
            className="text-xs font-bold text-white bg-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20"
          >
            Live View &rarr;
          </button>
        )}
      </div>
    </div>
  );
};

export default MapPreview;
