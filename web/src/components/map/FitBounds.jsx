import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * Component to auto-fit map bounds to markers
 * Fits on initial load and when positions change significantly
 */
export const FitBounds = ({ positions, fitOnChange = false, trigger = null }) => {
    const map = useMap();
    const initialFitDone = useRef(false);
    const lastPositionsCount = useRef(0);
    const lastTrigger = useRef(trigger);

    useEffect(() => {
        if (!positions || positions.length === 0) return;

        // Fit bounds on initial load
        if (!initialFitDone.current) {
            setTimeout(() => {
                const bounds = L.latLngBounds(positions);
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
                initialFitDone.current = true;
                lastPositionsCount.current = positions.length;
            }, 100);
        }
        // Fit when positions change size OR trigger changes
        else if (fitOnChange && (positions.length !== lastPositionsCount.current || trigger !== lastTrigger.current)) {
            setTimeout(() => {
                const bounds = L.latLngBounds(positions);
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
                lastPositionsCount.current = positions.length;
                lastTrigger.current = trigger;
            }, 100);
        }
    }, [map, positions, fitOnChange, trigger]);

    return null;
};

export default FitBounds;
