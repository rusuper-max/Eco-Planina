import { supabase } from '../config/supabase';

/**
 * Upload an image/file to Supabase Storage
 * @param {File} file - File object to upload
 * @param {string} folder - Folder path within bucket (default: 'uploads')
 * @param {string} bucket - Storage bucket name (default: 'receipts')
 * @returns {Promise<string>} Public URL of uploaded file
 */
export const uploadImage = async (file, folder = 'uploads', bucket = 'receipts') => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return publicUrl;
};
