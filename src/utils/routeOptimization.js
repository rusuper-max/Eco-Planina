/**
 * Route Optimization Utilities for React Native
 * 
 * Uses Nearest Neighbor algorithm to sort waypoints for efficient routing.
 * Opens Google Maps with optimized waypoint order.
 */

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
export const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Nearest Neighbor Algorithm for route optimization
 * Starts from origin and always goes to the closest unvisited point
 * 
 * @param {Object} origin - Starting point { lat, lng }
 * @param {Array} waypoints - Array of { id, lat, lng, ...data }
 * @returns {Array} Sorted waypoints in optimal order
 */
export const optimizeRouteNearestNeighbor = (origin, waypoints) => {
    if (!waypoints || waypoints.length === 0) return [];
    if (waypoints.length === 1) return waypoints;

    const remaining = [...waypoints];
    const optimized = [];
    let currentPoint = origin;

    while (remaining.length > 0) {
        // Find nearest unvisited point
        let nearestIdx = 0;
        let nearestDist = Infinity;

        for (let i = 0; i < remaining.length; i++) {
            const dist = haversineDistance(
                currentPoint.lat, currentPoint.lng,
                remaining[i].lat, remaining[i].lng
            );
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestIdx = i;
            }
        }

        // Move to nearest point
        const nearest = remaining.splice(nearestIdx, 1)[0];
        optimized.push(nearest);
        currentPoint = { lat: nearest.lat, lng: nearest.lng };
    }

    return optimized;
};

/**
 * Calculate total route distance
 * @param {Object} origin - Starting point { lat, lng }
 * @param {Array} waypoints - Ordered waypoints
 * @returns {number} Total distance in km
 */
export const calculateRouteDistance = (origin, waypoints) => {
    if (!waypoints || waypoints.length === 0) return 0;

    let total = 0;
    let current = origin;

    for (const wp of waypoints) {
        total += haversineDistance(current.lat, current.lng, wp.lat, wp.lng);
        current = { lat: wp.lat, lng: wp.lng };
    }

    return total;
};

/**
 * Generate Google Maps URL with multiple waypoints
 * @param {Object} origin - Starting point { lat, lng } (optional, uses first waypoint if not provided)
 * @param {Array} waypoints - Ordered waypoints [{ lat, lng }, ...]
 * @returns {string} Google Maps directions URL
 */
export const generateGoogleMapsUrl = (origin, waypoints) => {
    if (!waypoints || waypoints.length === 0) return null;

    // If no origin, use current location (Google will ask for permission)
    const originStr = origin
        ? `${origin.lat},${origin.lng}`
        : 'Current+Location';

    // Last waypoint is the destination
    const destination = waypoints[waypoints.length - 1];
    const destStr = `${destination.lat},${destination.lng}`;

    // All except last are waypoints
    const waypointStrs = waypoints.slice(0, -1).map(wp => `${wp.lat},${wp.lng}`);

    // Build URL
    let url = `https://www.google.com/maps/dir/?api=1`;
    url += `&origin=${originStr}`;
    url += `&destination=${destStr}`;
    url += `&travelmode=driving`;

    if (waypointStrs.length > 0) {
        url += `&waypoints=${waypointStrs.join('|')}`;
    }

    return url;
};

/**
 * Main function: Optimize route and return result with URL
 * @param {Array} requests - Array of requests with latitude/longitude
 * @param {Object} driverLocation - Driver's current location (optional)
 * @returns {Object} { url, distance, waypoints, waypointCount, error }
 */
export const getOptimizedRoute = (requests, driverLocation = null) => {
    // Filter requests with valid coordinates
    const validRequests = requests.filter(r =>
        r.latitude && r.longitude &&
        !isNaN(parseFloat(r.latitude)) && !isNaN(parseFloat(r.longitude))
    );

    if (validRequests.length === 0) {
        return { error: 'Nema zahteva sa validnim koordinatama' };
    }

    // Convert to waypoints format
    const waypoints = validRequests.map(r => ({
        id: r.id,
        lat: parseFloat(r.latitude),
        lng: parseFloat(r.longitude),
        name: r.client_name || 'Nepoznat klijent',
        address: r.client_address || ''
    }));

    // Use driver location or first waypoint as origin
    const origin = driverLocation ||
        (waypoints.length > 0 ? { lat: waypoints[0].lat, lng: waypoints[0].lng } : null);

    // Optimize route using Nearest Neighbor
    const optimizedWaypoints = optimizeRouteNearestNeighbor(origin, waypoints);

    // Calculate total distance
    const totalDistance = calculateRouteDistance(origin, optimizedWaypoints);

    // Generate Google Maps URL
    const url = generateGoogleMapsUrl(driverLocation, optimizedWaypoints);

    return {
        url,
        distance: totalDistance,
        waypoints: optimizedWaypoints,
        waypointCount: optimizedWaypoints.length
    };
};

export default {
    haversineDistance,
    optimizeRouteNearestNeighbor,
    calculateRouteDistance,
    generateGoogleMapsUrl,
    getOptimizedRoute
};
