import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Modal Component with responsive size variants
 * 
 * @param {boolean} open - Whether modal is open
 * @param {function} onClose - Close handler
 * @param {string} title - Modal title
 * @param {string} size - Size variant: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
 * @param {boolean} stickyFooter - If true, children should include a sticky footer
 * @param {React.ReactNode} children - Modal content
 */
export const Modal = ({ open, onClose, title, size = 'md', children }) => {
    if (!open) return null;

    // Size classes - responsive: mobile gets almost full width, desktop gets specified size
    const sizeClasses = {
        sm: 'max-w-sm',           // 384px - confirmations, simple forms
        md: 'max-w-lg',           // 512px - default, medium forms
        lg: 'max-w-2xl',          // 672px - larger forms, settings
        xl: 'max-w-4xl',          // 896px - complex forms, multi-column layouts
        '2xl': 'max-w-5xl',       // 1024px - dashboards, wide content
        full: 'max-w-[95vw]'      // 95% viewport - full-screen experience
    };

    const maxWidthClass = sizeClasses[size] || sizeClasses.md;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Modal Container */}
            <div className={`
                relative bg-white rounded-2xl shadow-2xl 
                w-full ${maxWidthClass} 
                max-h-[95vh] sm:max-h-[90vh] 
                overflow-hidden flex flex-col
            `}>
                {/* Sticky Header */}
                <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center z-10 shrink-0">
                    <h2 className="text-base sm:text-lg font-bold text-slate-800">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};

/**
 * Modal with sticky footer for action buttons
 * Use this when you have forms with Save/Cancel at the bottom
 */
export const ModalWithFooter = ({
    open,
    onClose,
    title,
    size = 'md',
    children,
    footer
}) => {
    if (!open) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        '2xl': 'max-w-5xl',
        full: 'max-w-[95vw]'
    };

    const maxWidthClass = sizeClasses[size] || sizeClasses.md;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div className={`
                relative bg-white rounded-2xl shadow-2xl 
                w-full ${maxWidthClass} 
                max-h-[95vh] sm:max-h-[90vh] 
                overflow-hidden flex flex-col
            `}>
                {/* Header */}
                <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center z-10 shrink-0">
                    <h2 className="text-base sm:text-lg font-bold text-slate-800">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                    {children}
                </div>

                {/* Sticky Footer */}
                {footer && (
                    <div className="sticky bottom-0 bg-white border-t px-4 sm:px-6 py-3 sm:py-4 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default Modal;
