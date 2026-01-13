import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

/**
 * Delete Confirmation Modal - Generic confirmation modal for delete operations
 */
export const DeleteConfirmationModal = ({ title, warning, expectedInput, onClose, onConfirm, loading }) => {
    const [input, setInput] = useState('');

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-6">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600 mx-auto">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-center mb-2">{title}</h3>
                    <p className="text-slate-500 text-center mb-6">{warning}</p>

                    <div className="mb-6">
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Ukucajte "{expectedInput}" za potvrdu</label>
                        <input
                            type="text"
                            className="w-full px-4 py-3 border-2 border-red-200 rounded-xl focus:border-red-500 focus:ring-0 outline-none font-bold"
                            placeholder={expectedInput}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-slate-700">Odustani</button>
                        <button
                            onClick={onConfirm}
                            disabled={input !== expectedInput || loading}
                            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-red-200"
                        >
                            {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Trajno obriši'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;
