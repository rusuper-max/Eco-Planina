/**
 * Utility funkcije za DriverDashboard
 */

// Calculate time difference between two dates
export const getTimeDiff = (start, end) => {
    if (!start || !end) return null;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate - startDate;

    if (diffMs < 0) return null;

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h ${diffMins % 60}min`;
    return `${diffDays}d ${diffHours % 24}h`;
};

// Format date/time for display
export const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('sr-RS', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Format time ago
export const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Upravo';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('sr-RS');
};

// Get role label
export const getRoleLabel = (role) => {
    switch (role) {
        case 'manager': return 'Menadžer';
        case 'client': return 'Klijent';
        case 'admin': return 'Admin';
        case 'developer': return 'Developer';
        default: return role;
    }
};
