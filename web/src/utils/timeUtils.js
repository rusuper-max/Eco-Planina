// Time-related helper functions

/**
 * Calculate remaining time until deadline based on max pickup hours
 * @param {string} createdAt - ISO date string when request was created
 * @param {string|number} urgencyOrMaxHours - Legacy urgency ('24h', '48h', '72h', 'standard') or max hours number
 * @param {number} [maxPickupHours] - Optional: company's max pickup hours (default 48)
 * @returns {Object} { text: 'HH:MM:SS', color: 'text-*', bg: 'bg-*', ms: milliseconds }
 */
export const getRemainingTime = (createdAt, urgencyOrMaxHours, maxPickupHours = 48) => {
    // Determine hours - support both legacy urgency strings and new numeric max hours
    let hours;
    if (typeof urgencyOrMaxHours === 'number') {
        hours = urgencyOrMaxHours;
    } else if (urgencyOrMaxHours === 'standard' || urgencyOrMaxHours === null || urgencyOrMaxHours === undefined) {
        hours = maxPickupHours; // Use company's max pickup hours
    } else {
        // Legacy support for '24h', '48h', '72h'
        hours = urgencyOrMaxHours === '24h' ? 24 : urgencyOrMaxHours === '48h' ? 48 : 72;
    }

    const deadline = new Date(new Date(createdAt).getTime() + hours * 60 * 60 * 1000);
    const diff = deadline - new Date();

    // Vreme isteklo - prikaži koliko kasni
    if (diff <= 0) {
        const overdue = Math.abs(diff);
        const h = Math.floor(overdue / (1000 * 60 * 60));
        const m = Math.floor((overdue % (1000 * 60 * 60)) / (1000 * 60));

        let text;
        if (h >= 24) {
            const days = Math.floor(h / 24);
            text = `Kašnjenje ${days}d ${h % 24}h`;
        } else if (h > 0) {
            text = `Kašnjenje ${h}h ${m}m`;
        } else {
            text = `Kašnjenje ${m}m`;
        }

        return { text, color: 'text-red-600', bg: 'bg-red-100', ms: diff, isOverdue: true };
    }

    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    const text = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    // Dinamičke granice na osnovu maxPickupHours
    // Crveno: preostalo manje od 25% vremena
    // Narandžasto: preostalo manje od 50% vremena
    // Zeleno: više od 50% vremena
    const redThreshold = hours * 0.25;    // 25% = crveno (npr. 12h za 48h max)
    const amberThreshold = hours * 0.5;   // 50% = narandžasto (npr. 24h za 48h max)

    if (h < redThreshold) return { text, color: 'text-red-600', bg: 'bg-red-100', ms: diff, isOverdue: false };
    if (h < amberThreshold) return { text, color: 'text-amber-600', bg: 'bg-amber-100', ms: diff, isOverdue: false };
    return { text, color: 'text-emerald-600', bg: 'bg-emerald-100', ms: diff, isOverdue: false };
};

/**
 * Get current urgency level based on remaining time percentage
 * Used for dynamic color coding as deadline approaches
 * @param {string} createdAt - ISO date string when request was created
 * @param {string|number} originalUrgency - Original urgency level or max hours
 * @param {number} [maxPickupHours] - Optional: company's max pickup hours (default 48)
 * @returns {string} Current urgency: 'critical', 'warning', or 'normal'
 */
export const getCurrentUrgency = (createdAt, originalUrgency, maxPickupHours = 48) => {
    // Determine hours
    let hours;
    if (typeof originalUrgency === 'number') {
        hours = originalUrgency;
    } else if (originalUrgency === 'standard' || originalUrgency === null || originalUrgency === undefined) {
        hours = maxPickupHours;
    } else {
        hours = originalUrgency === '24h' ? 24 : originalUrgency === '48h' ? 48 : 72;
    }

    const deadline = new Date(new Date(createdAt).getTime() + hours * 60 * 60 * 1000);
    const diff = deadline - new Date();
    const remainingHours = diff / (1000 * 60 * 60);
    const percentRemaining = (remainingHours / hours) * 100;

    if (remainingHours <= 0) return '24h';      // Expired = most urgent (legacy compatibility)
    if (percentRemaining <= 25) return '24h';   // Less than 25% remaining = urgent (red)
    if (percentRemaining <= 50) return '48h';   // Less than 50% remaining = warning (orange)
    return '72h';                                // More than 50% remaining = normal (green)
};
