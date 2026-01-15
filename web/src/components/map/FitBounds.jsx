import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * Component to auto-fit map bounds to markers
 * Fits on initial load and when positions change significantly
 */
export const FitBounds = ({ positions, fitOnChange = false, trigger = null, coolDownMs = 1200 }) => {
    const map = useMap();
    const initialFitDone = useRef(false);
    const lastPositionsCount = useRef(0);
    const lastTrigger = useRef(trigger);
    const lastInteraction = useRef(0);

    // Track user interactions to avoid fighting with manual zoom/pan
    useEffect(() => {
        const markInteraction = () => { lastInteraction.current = Date.now(); };
        map.on('zoomstart', markInteraction);
        map.on('movestart', markInteraction);
        return () => {
            map.off('zoomstart', markInteraction);
            map.off('movestart', markInteraction);
        };
    }, [map]);

    useEffect(() => {
        if (!positions || positions.length === 0) return;

        // Fit bounds on initial load
        if (!initialFitDone.current) {
            setTimeout(() => {
                if (Date.now() - lastInteraction.current < coolDownMs) return;
                const bounds = L.latLngBounds(positions);
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
                initialFitDone.current = true;
                lastPositionsCount.current = positions.length;
            }, 100);
        }
        // Fit when positions change size OR trigger changes
        else if (fitOnChange && (positions.length !== lastPositionsCount.current || trigger !== lastTrigger.current)) {
            setTimeout(() => {
                if (Date.now() - lastInteraction.current < coolDownMs) return;
                const bounds = L.latLngBounds(positions);
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
                lastPositionsCount.current = positions.length;
                lastTrigger.current = trigger;
            }, 100);
        }
    }, [map, positions, fitOnChange, trigger, coolDownMs]);

    return null;
};

export default FitBounds;
