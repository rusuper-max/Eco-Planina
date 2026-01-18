import { Clock, MapPin, Plus, ArrowRight } from 'lucide-react';
import { RequestStatusBadge } from '../common';

const RequestsFeed = ({ requests = [], assignments = [], onViewAll, onCreateNew, onSelectRequest }) => {
  // Get assignment status for a request
  const getAssignmentStatus = (requestId) => {
    const assignment = assignments.find(a => a.request_id === requestId);
    if (!assignment) return null;
    return {
      status: assignment.status,
      driverName: assignment.driver?.name,
    };
  };

  // Status badge styles


  const getUrgencyStyle = (urgency) => {
    switch (urgency) {
      case 'high':
        return {
          strip: 'bg-red-500',
          badge: 'bg-red-50 text-red-600 border-red-100',
          label: 'Hitno',
        };
      case 'normal':
        return {
          strip: 'bg-amber-500',
          badge: 'bg-amber-50 text-amber-600 border-amber-100',
          label: null,
        };
      default:
        return {
          strip: 'bg-emerald-500',
          badge: 'bg-emerald-50 text-emerald-600 border-emerald-100',
          label: null,
        };
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `pre ${diffMins} min`;
    if (diffHours < 24) return `pre ${diffHours}h`;
    return `pre ${diffDays}d`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col w-full h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          Dolazni Zahtevi
        </h3>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            Vidi sve
          </button>
        )}
      </div>

      {/* Request List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
        {requests.length > 0 ? (
          requests.slice(0, 10).map((req) => {
            const urgencyStyle = getUrgencyStyle(req.urgency);
            const assignmentInfo = getAssignmentStatus(req.id);
            const assignment = assignments.find(a => a.request_id === req.id);
            // Default to 'not_assigned' if no assignment found, effectively hiding badge via RequestStatusBadge logic if desired, 
            // OR we want to show "Nije dodeljeno"?
            // RequestStatusBadge handles 'not_assigned' by default.

            // Note: RequestStatusBadge expects `status`, `driverName`, `assignment`
            const status = assignmentInfo ? assignmentInfo.status : 'not_assigned';
            const driverName = assignmentInfo ? assignmentInfo.driverName : null;

            return (
              <div
                key={req.id}
                onClick={() => onSelectRequest?.(req)}
                className="group bg-white border border-slate-200 p-4 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
              >
                {/* Urgency Strip */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${urgencyStyle.strip}`}
                />

                <div className="pl-3">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-slate-800 text-sm group-hover:text-emerald-700 transition-colors truncate">
                        {req.client_name || 'Nepoznat klijent'}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 truncate">
                        <MapPin size={12} /> {req.client_address || 'Bez adrese'}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] px-2.5 py-1 font-bold rounded-full uppercase tracking-wider border ${urgencyStyle.badge} ml-2 shrink-0`}
                    >
                      {urgencyStyle.label || req.waste_label || req.waste_type}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                      <Clock size={12} /> {formatTime(req.created_at)}
                    </span>
                    <div className="flex items-center gap-2">
                      {/* Status Badge */}
                      <RequestStatusBadge
                        status={status}
                        driverName={driverName}
                        assignment={assignment}
                      />
                      <button className="text-slate-300 group-hover:text-emerald-600 transition-colors">
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-60">
            <div className="w-16 h-16 mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <Clock size={28} className="text-slate-400" />
            </div>
            <p className="font-bold text-slate-600 text-base">Nema novih zahteva</p>
            <p className="text-sm text-slate-400 mt-1">
              Trenutno nemate zahteva na čekanju.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Action */}
      {onCreateNew && (
        <div className="p-4 border-t border-slate-100 bg-white">
          <button
            onClick={onCreateNew}
            className="w-full py-3 text-sm bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10"
          >
            <Plus size={18} /> Kreiraj Ručno
          </button>
        </div>
      )}
    </div>
  );
};

export default RequestsFeed;
