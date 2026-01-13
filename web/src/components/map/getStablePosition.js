/**
 * Generate stable position from string (address or id)
 * Used for items without coordinates to display them on map
 */
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

export default getStablePosition;
