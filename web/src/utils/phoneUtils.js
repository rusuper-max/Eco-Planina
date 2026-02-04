/**
 * Phone number normalization utilities
 * Ensures consistent phone format across the application
 */

// Common country codes for the region
export const COUNTRY_CODES = [
    { code: '+381', country: 'RS', name: 'Srbija', flag: '🇷🇸' },
    { code: '+387', country: 'BA', name: 'Bosna i Hercegovina', flag: '🇧🇦' },
    { code: '+385', country: 'HR', name: 'Hrvatska', flag: '🇭🇷' },
    { code: '+386', country: 'SI', name: 'Slovenija', flag: '🇸🇮' },
    { code: '+382', country: 'ME', name: 'Crna Gora', flag: '🇲🇪' },
    { code: '+389', country: 'MK', name: 'Severna Makedonija', flag: '🇲🇰' },
    { code: '+383', country: 'XK', name: 'Kosovo', flag: '🇽🇰' },
    { code: '+43', country: 'AT', name: 'Austrija', flag: '🇦🇹' },
    { code: '+49', country: 'DE', name: 'Nemačka', flag: '🇩🇪' },
    { code: '+41', country: 'CH', name: 'Švajcarska', flag: '🇨🇭' },
];

/**
 * Normalize phone number to international format
 * @param {string} phone - Phone number (can be with or without country code)
 * @param {string} countryCode - Country code with + (e.g., "+381")
 * @returns {string} Normalized phone in format +XXXXXXXXXXX
 */
export const normalizePhone = (phone, countryCode = '+381') => {
    if (!phone && phone !== 0) return '';

    // Ensure string (Excel may pass numbers instead of strings)
    let cleaned = String(phone).replace(/[^\d+]/g, '');

    // If already has +, assume it's international format
    if (cleaned.startsWith('+')) {
        return cleaned;
    }

    // Remove leading zeros
    cleaned = cleaned.replace(/^0+/, '');

    // If starts with country code without +, add +
    if (cleaned.startsWith('381') || cleaned.startsWith('387') ||
        cleaned.startsWith('385') || cleaned.startsWith('386') ||
        cleaned.startsWith('382') || cleaned.startsWith('389') ||
        cleaned.startsWith('383') || cleaned.startsWith('43') ||
        cleaned.startsWith('49') || cleaned.startsWith('41')) {
        return '+' + cleaned;
    }

    // Add country code
    return countryCode + cleaned;
};

/**
 * Parse phone number to extract country code and local number
 * @param {string} phone - Normalized phone number
 * @returns {{ countryCode: string, localNumber: string, country: object|null }}
 */
export const parsePhone = (phone) => {
    if (!phone) return { countryCode: '+381', localNumber: '', country: null };

    const normalized = normalizePhone(phone);

    // Find matching country code
    for (const cc of COUNTRY_CODES) {
        if (normalized.startsWith(cc.code)) {
            return {
                countryCode: cc.code,
                localNumber: normalized.slice(cc.code.length),
                country: cc
            };
        }
    }

    // Default to Serbia
    return {
        countryCode: '+381',
        localNumber: normalized.replace(/^\+/, ''),
        country: COUNTRY_CODES[0]
    };
};

/**
 * Format phone for display
 * @param {string} phone - Normalized phone number
 * @returns {string} Formatted phone for display
 */
export const formatPhoneForDisplay = (phone) => {
    if (!phone) return '';

    const { countryCode, localNumber, country } = parsePhone(phone);

    // Format based on country
    if (countryCode === '+381' && localNumber.length >= 8) {
        // Serbian format: +381 64 123 4567
        const first = localNumber.slice(0, 2);
        const middle = localNumber.slice(2, 5);
        const last = localNumber.slice(5);
        return `${countryCode} ${first} ${middle} ${last}`;
    }

    // Default format
    return `${countryCode} ${localNumber}`;
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @param {string} countryCode - Country code
 * @returns {{ valid: boolean, error?: string }}
 */
export const validatePhone = (phone, countryCode = '+381') => {
    if (!phone) {
        return { valid: false, error: 'Broj telefona je obavezan' };
    }

    const normalized = normalizePhone(phone, countryCode);
    const digitsOnly = normalized.replace(/\D/g, '');

    // Most phone numbers are 10-15 digits (including country code)
    if (digitsOnly.length < 9) {
        return { valid: false, error: 'Broj telefona je prekratak' };
    }

    if (digitsOnly.length > 15) {
        return { valid: false, error: 'Broj telefona je predugačak' };
    }

    return { valid: true };
};

/**
 * Check if two phone numbers are the same (after normalization)
 * @param {string} phone1 
 * @param {string} phone2 
 * @returns {boolean}
 */
export const phonesMatch = (phone1, phone2) => {
    if (!phone1 || !phone2) return false;
    return normalizePhone(phone1) === normalizePhone(phone2);
};

export default {
    COUNTRY_CODES,
    normalizePhone,
    parsePhone,
    formatPhoneForDisplay,
    validatePhone,
    phonesMatch
};
