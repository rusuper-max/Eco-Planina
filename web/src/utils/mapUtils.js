import L from 'leaflet';

// Fix Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Urgency colors for markers
export const URGENCY_COLORS = { '24h': '#EF4444', '48h': '#F59E0B', '72h': '#10B981' };

// Waste type emoji icons
export const WASTE_ICONS_MAP = { cardboard: '📦', glass: '🍾', plastic: '♻️', trash: '🗑️' };

/**
 * Create a simple colored Leaflet icon
 * @param {string} color - Color name: 'red', 'orange', 'green', etc.
 * @returns {L.Icon} Leaflet icon
 */
export const createIcon = (color) => new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Pre-created urgency icons
export const urgencyIcons = {
    '24h': createIcon('red'),
    '48h': createIcon('orange'),
    '72h': createIcon('green')
};

// Urgency level to human-readable label
const URGENCY_LABELS = {
    '24h': 'Hitno',
    '48h': 'Srednje',
    '72h': 'OK'
};

/**
 * Create a custom styled marker icon with emoji and urgency badge
 * @param {string} urgency - Urgency level: '24h', '48h', or '72h'
 * @param {string} iconEmoji - Emoji to display in marker
 * @param {boolean} isClient - If true, uses blue color for client markers
 * @returns {L.DivIcon} Custom Leaflet div icon
 */
export const createCustomIcon = (urgency, iconEmoji, isClient = false) => {
    const color = isClient ? '#3B82F6' : (URGENCY_COLORS[urgency] || '#10B981');
    const icon = iconEmoji || (isClient ? '🏢' : '📦');
    // Use human-readable labels instead of "24h/48h/72h"
    const badge = isClient ? '' : (URGENCY_LABELS[urgency] || '');

    return L.divIcon({
        className: 'custom-marker',
        html: `
            <div class="marker-container">
                ${!isClient ? `<div class="pulse-ring" style="border-color: ${color};"></div>` : ''}
                <div class="marker-pin" style="background-color: ${color};">
                    <span class="marker-icon">${icon}</span>
                </div>
                ${badge ? `<div class="urgency-badge" style="background-color: ${color};">${badge}</div>` : ''}
            </div>
        `,
        iconSize: [50, 60],
        iconAnchor: [25, 50],
        popupAnchor: [0, -50]
    });
};

// Inject marker styles into document head (only once)
const injectMarkerStyles = () => {
    if (document.getElementById('marker-styles')) return;

    const style = document.createElement('style');
    style.id = 'marker-styles';
    style.textContent = `
        .custom-marker { background: transparent !important; border: none !important; }
        .marker-container { position: relative; width: 50px; height: 60px; }
        .pulse-ring {
            position: absolute;
            width: 40px; height: 40px;
            border-radius: 50%;
            border: 3px solid;
            top: 5px; left: 5px;
            animation: pulse 1.5s ease-out infinite;
        }
        @keyframes pulse {
            0% { transform: scale(1); opacity: 0.8; }
            100% { transform: scale(2); opacity: 0; }
        }
        .marker-pin {
            position: absolute;
            width: 40px; height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            top: 5px; left: 5px;
        }
        .marker-icon { font-size: 20px; }
        .urgency-badge {
            position: absolute;
            bottom: 0; left: 50%;
            transform: translateX(-50%);
            padding: 2px 8px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: bold;
            color: white;
            white-space: nowrap;
        }
    `;
    document.head.appendChild(style);
};

// Auto-inject styles on module load
injectMarkerStyles();

// Export for manual use if needed
export const markerStyles = { inject: injectMarkerStyles };

// Generate stable position from string (address or id)
export const getStablePosition = (id, baseLatitude = 44.8, baseLongitude = 20.45) => {
    // Create a simple hash from the id string
    let hash = 0;
    const str = String(id);
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // Use hash to generate stable offsets - smaller spread (0.1 degrees ~ 10km) so markers stay visible
    const latOffset = ((Math.abs(hash) % 1000) / 1000 - 0.5) * 0.1;
    const lngOffset = ((Math.abs(hash >> 10) % 1000) / 1000 - 0.5) * 0.1;
    return [baseLatitude + latOffset, baseLongitude + lngOffset];
};
