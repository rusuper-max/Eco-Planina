import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Upload, Image, X, Loader2 } from 'lucide-react';
import { uploadImage, deleteImage } from '../../utils/storage';

/**
 * Image upload component with preview and validation
 * @param {string} currentImage - Current image URL (will be deleted when new image is uploaded)
 * @param {function} onUpload - Callback when new image is uploaded
 * @param {function} onRemove - Callback when image is removed
 * @param {string} label - Label text
 * @param {string} bucket - Storage bucket name
 */
export const ImageUploader = ({ currentImage, onUpload, onRemove, label = "Koristi svoju sliku", bucket = 'receipts', deleteOldOnUpload = true }) => {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const resetInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.type = 'text';
            fileInputRef.current.type = 'file';
        }
    };

    const handleFileChange = async (e) => {
        const files = e.target.files;
        const file = files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Molimo izaberite sliku');
            resetInput();
            return;
        }

        const sizeMB = file.size / 1024 / 1024;
        if (sizeMB > 2) {
            toast.error(`Slika "${file.name}" je prevelika: ${sizeMB.toFixed(2)}MB (max 2MB)`);
            resetInput();
            return;
        }

        setUploading(true);
        try {
            const url = await uploadImage(file, 'uploads', bucket, deleteOldOnUpload ? currentImage : null);
            onUpload(url);
        } catch (err) {
            toast.error('Greška pri uploadu: ' + err.message);
        } finally {
            setUploading(false);
            resetInput();
        }
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">{label}</label>
            {currentImage ? (
                <div className="relative inline-block">
                    <img src={`${currentImage}${currentImage.includes('?') ? '&' : '?'}v=${Date.now()}`} alt="Preview" className="w-32 h-32 object-cover rounded-xl" />
                    <button
                        onClick={onRemove}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${uploading ? 'bg-slate-50 border-slate-300' : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50'}`}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={uploading}
                    />
                    {uploading ? (
                        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                    ) : (
                        <>
                            <Upload className="w-8 h-8 text-slate-400 mb-2" />
                            <span className="text-sm text-slate-500">Klikni za upload</span>
                        </>
                    )}
                </label>
            )}
        </div>
    );
};

export default ImageUploader;
