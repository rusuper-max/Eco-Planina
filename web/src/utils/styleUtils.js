/**
 * Get color classes for fill level indicators
 * @param {number|string|null} fillLevel - Fill percentage (0-100)
 * @returns {Object} { bg: 'bg-*', text: 'text-*', hex: '#...' }
 */
export const getFillLevelColor = (fillLevel) => {
    if (fillLevel === null || fillLevel === undefined || fillLevel === '') {
        return { bg: 'bg-blue-500', text: 'text-blue-600', hex: '#3B82F6' };
    }
    const level = parseInt(fillLevel);
    if (level >= 100) return { bg: 'bg-red-500', text: 'text-red-600', hex: '#EF4444' };
    if (level >= 75) return { bg: 'bg-amber-500', text: 'text-amber-600', hex: '#F59E0B' };
    return { bg: 'bg-emerald-500', text: 'text-emerald-600', hex: '#10B981' };
};
