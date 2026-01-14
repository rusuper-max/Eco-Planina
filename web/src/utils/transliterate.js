/**
 * Serbian Latin <-> Cyrillic transliteration utilities
 * Enables searching addresses in either script
 */

// Cyrillic to Latin mapping (Serbian specific)
const CYRILLIC_TO_LATIN = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'ђ': 'đ', 'е': 'e',
    'ж': 'ž', 'з': 'z', 'и': 'i', 'ј': 'j', 'к': 'k', 'л': 'l', 'љ': 'lj',
    'м': 'm', 'н': 'n', 'њ': 'nj', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's',
    'т': 't', 'ћ': 'ć', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'č',
    'џ': 'dž', 'ш': 'š',
    // Uppercase
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Ђ': 'Đ', 'Е': 'E',
    'Ж': 'Ž', 'З': 'Z', 'И': 'I', 'Ј': 'J', 'К': 'K', 'Л': 'L', 'Љ': 'Lj',
    'М': 'M', 'Н': 'N', 'Њ': 'Nj', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S',
    'Т': 'T', 'Ћ': 'Ć', 'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'C', 'Ч': 'Č',
    'Џ': 'Dž', 'Ш': 'Š'
};

// Latin to Cyrillic mapping (Serbian specific)
const LATIN_TO_CYRILLIC = {
    'a': 'а', 'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'đ': 'ђ', 'e': 'е',
    'ž': 'ж', 'z': 'з', 'i': 'и', 'j': 'ј', 'k': 'к', 'l': 'л',
    'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п', 'r': 'р', 's': 'с',
    't': 'т', 'ć': 'ћ', 'u': 'у', 'f': 'ф', 'h': 'х', 'c': 'ц', 'č': 'ч',
    'š': 'ш',
    // Uppercase
    'A': 'А', 'B': 'Б', 'V': 'В', 'G': 'Г', 'D': 'Д', 'Đ': 'Ђ', 'E': 'Е',
    'Ž': 'Ж', 'Z': 'З', 'I': 'И', 'J': 'Ј', 'K': 'К', 'L': 'Л',
    'M': 'М', 'N': 'Н', 'O': 'О', 'P': 'П', 'R': 'Р', 'S': 'С',
    'T': 'Т', 'Ć': 'Ћ', 'U': 'У', 'F': 'Ф', 'H': 'Х', 'C': 'Ц', 'Č': 'Ч',
    'Š': 'Ш'
};

// Digraphs that need special handling (Latin to Cyrillic)
const DIGRAPHS_TO_CYRILLIC = {
    'lj': 'љ', 'nj': 'њ', 'dž': 'џ',
    'Lj': 'Љ', 'LJ': 'Љ', 'Nj': 'Њ', 'NJ': 'Њ', 'Dž': 'Џ', 'DŽ': 'Џ'
};

/**
 * Convert Cyrillic text to Latin
 */
export const cyrillicToLatin = (text) => {
    if (!text) return '';
    return text.split('').map(char => CYRILLIC_TO_LATIN[char] || char).join('');
};

/**
 * Convert Latin text to Cyrillic
 */
export const latinToCyrillic = (text) => {
    if (!text) return '';

    let result = text;

    // First handle digraphs
    Object.entries(DIGRAPHS_TO_CYRILLIC).forEach(([latin, cyrillic]) => {
        result = result.replace(new RegExp(latin, 'g'), cyrillic);
    });

    // Then handle single characters
    return result.split('').map(char => LATIN_TO_CYRILLIC[char] || char).join('');
};

/**
 * Normalize text for comparison - converts to Latin lowercase
 * This allows searching regardless of script
 */
export const normalizeForSearch = (text) => {
    if (!text) return '';
    return cyrillicToLatin(text).toLowerCase();
};

/**
 * Check if text matches search query (script-agnostic)
 * Compares both Latin and Cyrillic versions
 */
export const matchesSearch = (text, query) => {
    if (!text || !query) return !query;

    const normalizedText = normalizeForSearch(text);
    const normalizedQuery = normalizeForSearch(query);

    return normalizedText.includes(normalizedQuery);
};

/**
 * Get all possible search variants for a query
 * Returns both Latin and Cyrillic versions for SQL ilike
 */
export const getSearchVariants = (query) => {
    if (!query) return [];

    const latinVersion = cyrillicToLatin(query);
    const cyrillicVersion = latinToCyrillic(query);

    // Remove duplicates
    const variants = [...new Set([query, latinVersion, cyrillicVersion])];
    return variants.filter(v => v && v.trim());
};

export default {
    cyrillicToLatin,
    latinToCyrillic,
    normalizeForSearch,
    matchesSearch,
    getSearchVariants
};
