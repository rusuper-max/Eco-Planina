import { supabase } from '../config/supabase';

/**
 * Extract file path from Supabase storage URL
 * @param {string} url - Full public URL
 * @param {string} bucket - Bucket name
 * @returns {string|null} File path within bucket
 */
const extractFilePathFromUrl = (url, bucket) => {
    if (!url) return null;
    try {
        // URL format: https://xxx.supabase.co/storage/v1/object/public/bucket/path/to/file.ext
        const marker = `/storage/v1/object/public/${bucket}/`;
        const idx = url.indexOf(marker);
        if (idx === -1) return null;
        return url.substring(idx + marker.length).split('?')[0]; // Remove query params
    } catch {
        return null;
    }
};

/**
 * Delete a file from Supabase Storage
 * @param {string} url - Public URL of the file to delete
 * @param {string} bucket - Storage bucket name
 */
export const deleteImage = async (url, bucket = 'receipts') => {
    const filePath = extractFilePathFromUrl(url, bucket);
    if (!filePath) return;

    try {
        const { error } = await supabase.storage.from(bucket).remove([filePath]);
        if (error) {
            console.warn('[Storage] Failed to delete old image:', error.message);
        }
    } catch (e) {
        console.warn('[Storage] Error deleting image:', e.message);
    }
};

/**
 * Upload an image/file to Supabase Storage
 * @param {File} file - File object to upload
 * @param {string} folder - Folder path within bucket (default: 'uploads')
 * @param {string} bucket - Storage bucket name (default: 'receipts')
 * @param {string} oldUrl - Optional URL of old image to delete
 * @returns {Promise<string>} Public URL of uploaded file
 */
export const uploadImage = async (file, folder = 'uploads', bucket = 'receipts', oldUrl = null) => {
    // Delete old image if provided
    if (oldUrl) {
        await deleteImage(oldUrl, bucket);
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return publicUrl;
};
