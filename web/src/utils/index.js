// Barrel export for utils
export { getRemainingTime, getCurrentUrgency } from './timeUtils';
export {
    createIcon,
    createCustomIcon,
    urgencyIcons,
    URGENCY_COLORS,
    WASTE_ICONS_MAP,
    markerStyles
} from './mapUtils';
export { uploadImage, deleteImage } from './storage';
export { getFillLevelColor } from './styleUtils';
export {
    cyrillicToLatin,
    latinToCyrillic,
    normalizeForSearch,
    matchesSearch,
    getSearchVariants
} from './transliterate';
export {
    COUNTRY_CODES,
    normalizePhone,
    parsePhone,
    formatPhoneForDisplay,
    validatePhone,
    phonesMatch
} from './phoneUtils';
