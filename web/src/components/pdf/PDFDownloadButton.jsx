/**
 * PDFDownloadButton - Dugme za generisanje i preuzimanje PDF-a
 */
import React, { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { FileDown, Loader2 } from 'lucide-react';

export const PDFDownloadButton = ({
    document,
    fileName = 'document.pdf',
    label = 'Preuzmi PDF',
    className = '',
    iconOnly = false,
    size = 'md'
}) => {
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        setLoading(true);
        try {
            const blob = await pdf(document).toBlob();
            const url = URL.createObjectURL(blob);
            const link = window.document.createElement('a');
            link.href = url;
            link.download = fileName;
            window.document.body.appendChild(link);
            link.click();
            window.document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generating PDF:', error);
        } finally {
            setLoading(false);
        }
    };

    const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-2 text-sm',
        lg: 'px-4 py-2.5 text-base'
    };

    const iconSize = {
        sm: 14,
        md: 16,
        lg: 18
    };

    if (iconOnly) {
        return (
            <button
                onClick={handleDownload}
                disabled={loading}
                className={`p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50 ${className}`}
                title={label}
            >
                {loading ? (
                    <Loader2 size={iconSize[size]} className="animate-spin" />
                ) : (
                    <FileDown size={iconSize[size]} />
                )}
            </button>
        );
    }

    return (
        <button
            onClick={handleDownload}
            disabled={loading}
            className={`inline-flex items-center gap-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium ${sizeClasses[size]} ${className}`}
        >
            {loading ? (
                <Loader2 size={iconSize[size]} className="animate-spin" />
            ) : (
                <FileDown size={iconSize[size]} />
            )}
            {label}
        </button>
    );
};

export default PDFDownloadButton;
