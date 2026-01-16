import { useState, useEffect, useRef } from 'react';
import { X, Truck, Clock, Package, CheckCircle2 } from 'lucide-react';

/**
 * Request status badge with clickable popup showing assignment details
 */
export const RequestStatusBadge = ({ status, driverName, assignment }) => {
    const [showPopup, setShowPopup] = useState(false);
    const [popupPosition, setPopupPosition] = useState('bottom');
    const popupRef = useRef(null);
    const buttonRef = useRef(null);

    const configs = {
        'not_assigned': { label: 'Nije dodeljeno', shortLabel: 'N/D', bg: 'bg-slate-100', color: 'text-slate-500', icon: null },
        'assigned': { label: 'Dodeljeno', shortLabel: 'Čeka', bg: 'bg-blue-100', color: 'text-blue-700', icon: '⏳' },
        'in_progress': { label: 'U toku', shortLabel: 'U toku', bg: 'bg-blue-100', color: 'text-blue-700', icon: '🚚' },
        'picked_up': { label: 'Preuzeto', shortLabel: 'Preuzeto', bg: 'bg-amber-100', color: 'text-amber-700', icon: '📦' },
        'delivered': { label: 'Dostavljeno', shortLabel: 'Dostav.', bg: 'bg-emerald-100', color: 'text-emerald-700', icon: '✓' }
    };
    const config = configs[status] || configs['not_assigned'];
    const hasDetails = status !== 'not_assigned' && (driverName || assignment);

    // Close popup when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popupRef.current && !popupRef.current.contains(e.target)) {
                setShowPopup(false);
            }
        };
        if (showPopup) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showPopup]);

    // Determine popup position based on available space
    const handleClick = (e) => {
        e.stopPropagation();
        if (!hasDetails) return;

        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            // Store rect for fixed positioning
            popupRef.current = rect;

            const spaceBelow = window.innerHeight - rect.bottom;
            setPopupPosition(spaceBelow < 220 ? 'top' : 'bottom');
        }
        setShowPopup(!showPopup);
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleString('sr-RS', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });
    };

    // Calculate fixed style if popup is shown
    const getFixedStyle = () => {
        if (!popupRef.current) return {};
        const rect = popupRef.current;
        const style = {
            position: 'fixed',
            zIndex: 9999,
            left: rect.left + 'px',
        };

        if (popupPosition === 'top') {
            style.bottom = (window.innerHeight - rect.top + 5) + 'px';
        } else {
            style.top = (rect.bottom + 5) + 'px';
        }
        return style;
    };

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={handleClick}
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.color} ${hasDetails ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                title={hasDetails ? 'Klikni za detalje' : 'Nije dodeljeno vozaču'}
            >
                {config.icon && <span>{config.icon}</span>}
                <span>{config.shortLabel}</span>
            </button>

            {/* Details Popup - uses fixed positioning to escape overflow */}
            {showPopup && hasDetails && (
                <div
                    className="bg-white rounded-xl shadow-xl border border-slate-200 p-3 text-left w-56 animate-in fade-in zoom-in-95 duration-100"
                    style={getFixedStyle()}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.color}`}>
                                {config.label}
                            </span>
                            <button onClick={() => setShowPopup(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={14} />
                            </button>
                        </div>

                        {driverName && (
                            <div className="flex items-center gap-2 text-sm">
                                <Truck size={14} className="text-slate-400" />
                                <span className="text-slate-600">Vozač:</span>
                                <span className="font-medium text-slate-800">{driverName}</span>
                            </div>
                        )}

                        {assignment?.created_at && (
                            <div className="flex items-center gap-2 text-sm">
                                <Clock size={14} className="text-slate-400" />
                                <span className="text-slate-600">Dodeljeno:</span>
                                <span className="text-slate-800">{formatDateTime(assignment.created_at)}</span>
                            </div>
                        )}

                        {assignment?.picked_up_at && (
                            <div className="flex items-center gap-2 text-sm">
                                <Package size={14} className="text-amber-500" />
                                <span className="text-slate-600">Preuzeto:</span>
                                <span className="text-slate-800">{formatDateTime(assignment.picked_up_at)}</span>
                            </div>
                        )}

                        {assignment?.delivered_at && (
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 size={14} className="text-emerald-500" />
                                <span className="text-slate-600">Dostavljeno:</span>
                                <span className="text-slate-800">{formatDateTime(assignment.delivered_at)}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RequestStatusBadge;
