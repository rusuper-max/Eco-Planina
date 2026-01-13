import { useState, useEffect, useRef, useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { createIcon } from '../../utils/mapUtils';

/**
 * Draggable marker component for location picking
 */
export const DraggableMarker = ({ position, onPositionChange }) => {
    const [markerPosition, setMarkerPosition] = useState(position);
    const markerRef = useRef(null);

    const eventHandlers = useMemo(() => ({
        dragend(e) {
            const marker = e.target;
            const newPos = marker.getLatLng();
            setMarkerPosition([newPos.lat, newPos.lng]);
            onPositionChange([newPos.lat, newPos.lng]);
        },
    }), [onPositionChange]);

    useEffect(() => {
        setMarkerPosition(position);
    }, [position]);

    const markerIcon = useMemo(() => createIcon('red'), []);

    return (
        <Marker
            position={markerPosition}
            draggable={true}
            eventHandlers={eventHandlers}
            icon={markerIcon}
            ref={markerRef}
        >
            <Popup>Prevuci marker na željenu lokaciju</Popup>
        </Marker>
    );
};

export default DraggableMarker;
