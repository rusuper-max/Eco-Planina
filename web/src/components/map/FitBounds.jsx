import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * Component to auto-fit map bounds to markers - only on initial load
 */
export const FitBounds = ({ positions }) => {
    const map = useMap();
    const initialFitDone = useRef(false);

    useEffect(() => {
        // Only fit bounds once on initial load when we have positions
        if (!initialFitDone.current && positions && positions.length > 0) {
            setTimeout(() => {
                const bounds = L.latLngBounds(positions);
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
                initialFitDone.current = true;
            }, 100);
        }
    }, [map, positions]);

    return null;
};

export default FitBounds;
