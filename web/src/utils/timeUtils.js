// Time-related helper functions

/**
 * Calculate remaining time until deadline based on urgency level
 * @param {string} createdAt - ISO date string when request was created
 * @param {string} urgency - Urgency level: '24h', '48h', or '72h'
 * @returns {Object} { text: 'HH:MM:SS', color: 'text-*', bg: 'bg-*', ms: milliseconds }
 */
export const getRemainingTime = (createdAt, urgency) => {
    const hours = urgency === '24h' ? 24 : urgency === '48h' ? 48 : 72;
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

    if (h < 6) return { text, color: 'text-red-600', bg: 'bg-red-100', ms: diff, isOverdue: false };
    if (h < 24) return { text, color: 'text-amber-600', bg: 'bg-amber-100', ms: diff, isOverdue: false };
    return { text, color: 'text-emerald-600', bg: 'bg-emerald-100', ms: diff, isOverdue: false };
};

/**
 * Get current urgency level based on remaining time (not original urgency)
 * Used for dynamic color coding as deadline approaches
 * @param {string} createdAt - ISO date string when request was created
 * @param {string} originalUrgency - Original urgency level: '24h', '48h', or '72h'
 * @returns {string} Current urgency: '24h', '48h', or '72h'
 */
export const getCurrentUrgency = (createdAt, originalUrgency) => {
    const hours = originalUrgency === '24h' ? 24 : originalUrgency === '48h' ? 48 : 72;
    const deadline = new Date(new Date(createdAt).getTime() + hours * 60 * 60 * 1000);
    const diff = deadline - new Date();
    const remainingHours = diff / (1000 * 60 * 60);

    if (remainingHours <= 0) return '24h';   // Expired = most urgent
    if (remainingHours <= 24) return '24h';  // Less than 24h = urgent (red)
    if (remainingHours <= 48) return '48h';  // Less than 48h = medium (orange)
    return '72h';                             // More than 48h = not urgent (green)
};
