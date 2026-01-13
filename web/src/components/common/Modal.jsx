import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const Modal = ({ open, onClose, title, children }) => {
    if (!open) return null;
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                    <h2 className="text-lg font-bold">{title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>,
        document.body
    );
};

export default Modal;
