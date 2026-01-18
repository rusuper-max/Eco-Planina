import { useState } from 'react';
import { Plus, Recycle, Edit3, Trash2, Users, UserPlus } from 'lucide-react';
import { EmptyState, RecycleLoader } from '../common';
import { WasteTypeClientsModal } from './WasteTypeClientsModal';
import { BulkWasteTypeModal } from './BulkWasteTypeModal';
import { uploadImage, deleteImage } from '../../utils/storage';
import toast from 'react-hot-toast';

/**
 * Waste Types Management - CRUD for waste types
 */
export const WasteTypesManagement = ({ wasteTypes, onAdd, onDelete, onEdit, clients = [], onUpdateClientWasteTypes, onBulkUpdate }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingType, setEditingType] = useState(null);
    const [newType, setNewType] = useState({ label: '', icon: '📦', customImage: null });
    const [managingClientsFor, setManagingClientsFor] = useState(null);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [uploading, setUploading] = useState(false);

    const getClientCountForWasteType = (wasteTypeId) => {
        return clients.filter(client => {
            if (!client.allowed_waste_types || client.allowed_waste_types.length === 0) {
                return true;
            }
            return client.allowed_waste_types.includes(wasteTypeId);
        }).length;
    };

    const iconOptions = ['📦', '♻️', '🍾', '🗑️', '🛢️', '📄', '🔋', '💡', '🧴', '🥫', '🪵', '🧱'];

    const handleAdd = () => {
        if (newType.label) {
            onAdd({ ...newType, id: newType.label.toLowerCase().replace(/\s/g, '_') });
            setNewType({ label: '', icon: '📦', customImage: null });
            setShowAddForm(false);
        }
    };

    const handleEdit = () => {
        if (editingType && editingType.label) {
            onEdit(editingType);
            setEditingType(null);
        }
    };

    const startEdit = (wt) => {
        const { custom_image_url, ...rest } = wt;
        setEditingType({
            ...rest,
            customImage: rest.customImage || custom_image_url || null
        });
        setShowAddForm(false);
    };

    // Direct image upload for editing - uploads, deletes old, saves to DB immediately
    const handleEditImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !editingType?.id) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Molimo izaberite sliku');
            return;
        }

        const sizeMB = file.size / 1024 / 1024;
        if (sizeMB > 2) {
            toast.error(`Slika je prevelika: ${sizeMB.toFixed(2)}MB (max 2MB)`);
            return;
        }

        setUploading(true);
        try {
            // Delete old image first if exists
            if (editingType.customImage) {
                await deleteImage(editingType.customImage, 'assets');
            }

            // Upload new image
            const url = await uploadImage(file, 'uploads', 'assets');

            // Update local state and save to DB immediately
            const updated = { ...editingType, customImage: url };
            setEditingType(updated);
            await onEdit(updated);

            toast.success('Slika sačuvana');
        } catch (err) {
            toast.error('Greška: ' + err.message);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    // Direct image upload for new type
    const handleNewImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Molimo izaberite sliku');
            return;
        }

        const sizeMB = file.size / 1024 / 1024;
        if (sizeMB > 2) {
            toast.error(`Slika je prevelika: ${sizeMB.toFixed(2)}MB (max 2MB)`);
            return;
        }

        setUploading(true);
        try {
            const url = await uploadImage(file, 'uploads', 'assets');
            setNewType({ ...newType, customImage: url });
        } catch (err) {
            toast.error('Greška: ' + err.message);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleRemoveEditImage = async () => {
        if (!editingType?.customImage) return;

        setUploading(true);
        try {
            await deleteImage(editingType.customImage, 'assets');
            const updated = { ...editingType, customImage: null };
            setEditingType(updated);
            await onEdit(updated);
            toast.success('Slika uklonjena');
        } catch (err) {
            toast.error('Greška: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold">Vrste robe (otpada)</h2>
                    <p className="text-sm text-slate-500">Upravljajte vrstama otpada koje vaši klijenti mogu da prijavljuju</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowBulkModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-sm">
                        <UserPlus size={18} /> Grupno dodeljivanje
                    </button>
                    <button onClick={() => { setShowAddForm(true); setEditingType(null); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-sm">
                        <Plus size={18} /> Dodaj vrstu
                    </button>
                </div>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="bg-white rounded-2xl border p-6 space-y-4">
                    <h3 className="font-semibold">Nova vrsta robe</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Naziv</label>
                                <input
                                    type="text"
                                    value={newType.label}
                                    onChange={(e) => setNewType({ ...newType, label: e.target.value })}
                                    placeholder="npr. Metal, Elektronski otpad..."
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Ikonica {newType.customImage && <span className="text-slate-400">(zamenjeno slikom)</span>}</label>
                                <div className="flex flex-wrap gap-2">
                                    {iconOptions.map(icon => (
                                        <button
                                            key={icon}
                                            onClick={() => setNewType({ ...newType, icon, customImage: null })}
                                            className={`w-12 h-12 text-2xl rounded-xl border-2 transition-all ${!newType.customImage && newType.icon === icon ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'} ${newType.customImage ? 'opacity-50' : ''}`}
                                        >
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Koristi svoju sliku</label>
                            {newType.customImage ? (
                                <div className="relative inline-block">
                                    <img src={newType.customImage} alt="Preview" className="w-32 h-32 object-cover rounded-xl" />
                                    <button
                                        onClick={() => setNewType({ ...newType, customImage: null })}
                                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                                    >
                                        ×
                                    </button>
                                </div>
                            ) : (
                                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${uploading ? 'bg-slate-50 border-slate-300' : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50'}`}>
                                    <input type="file" accept="image/*" onChange={handleNewImageUpload} className="hidden" disabled={uploading} />
                                    {uploading ? (
                                        <RecycleLoader size={32} className="text-emerald-600" />
                                    ) : (
                                        <>
                                            <span className="text-2xl mb-1">📷</span>
                                            <span className="text-sm text-slate-500">Klikni za upload</span>
                                        </>
                                    )}
                                </label>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-medium">Sačuvaj</button>
                        <button onClick={() => { setShowAddForm(false); setNewType({ label: '', icon: '📦', customImage: null }); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-medium">Otkaži</button>
                    </div>
                </div>
            )}

            {/* Edit Form */}
            {editingType && (
                <div className="bg-white rounded-2xl border p-6 space-y-4 border-blue-200">
                    <h3 className="font-semibold text-blue-700">Izmeni vrstu robe</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Naziv</label>
                                <input
                                    type="text"
                                    value={editingType.label}
                                    onChange={(e) => setEditingType({ ...editingType, label: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Ikonica</label>
                                <div className="flex flex-wrap gap-2">
                                    {iconOptions.map(icon => (
                                        <button
                                            key={icon}
                                            onClick={() => setEditingType({ ...editingType, icon, customImage: null })}
                                            className={`w-12 h-12 text-2xl rounded-xl border-2 transition-all ${!editingType.customImage && editingType.icon === icon ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                                        >
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Koristi svoju sliku</label>
                            {editingType.customImage ? (
                                <div className="relative inline-block">
                                    <img src={editingType.customImage} alt="Preview" className="w-32 h-32 object-cover rounded-xl" />
                                    <button
                                        onClick={handleRemoveEditImage}
                                        disabled={uploading}
                                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 disabled:opacity-50"
                                    >
                                        {uploading ? <RecycleLoader size={12} className="text-white" /> : '×'}
                                    </button>
                                </div>
                            ) : (
                                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${uploading ? 'bg-slate-50 border-slate-300' : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50'}`}>
                                    <input type="file" accept="image/*" onChange={handleEditImageUpload} className="hidden" disabled={uploading} />
                                    {uploading ? (
                                        <RecycleLoader size={32} className="text-blue-600" />
                                    ) : (
                                        <>
                                            <span className="text-2xl mb-1">📷</span>
                                            <span className="text-sm text-slate-500">Klikni za upload</span>
                                        </>
                                    )}
                                </label>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium">Sačuvaj izmene</button>
                        <button onClick={() => setEditingType(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-medium">Otkaži</button>
                    </div>
                </div>
            )}

            {!wasteTypes?.length ? (
                <EmptyState icon={Recycle} title="Nema vrsta robe" desc="Dodajte prvu vrstu robe klikom na dugme iznad" />
            ) : (
                <div className="bg-white rounded-2xl border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 border-b">
                            <tr>
                                <th className="px-6 py-4 text-left">Ikonica</th>
                                <th className="px-6 py-4 text-left">Naziv</th>
                                <th className="px-4 py-4 text-center">Klijenti</th>
                                <th className="px-6 py-4 text-right">Akcije</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {wasteTypes.map(wt => {
                                const clientCount = getClientCountForWasteType(wt.id);
                                return (
                                    <tr key={wt.id} className={`hover:bg-slate-50 ${editingType?.id === wt.id ? 'bg-blue-50' : ''}`}>
                                        <td className="px-6 py-4">
                                            {wt.customImage ? (
                                                <img src={wt.customImage} alt={wt.label} className="w-12 h-12 object-cover rounded-xl" />
                                            ) : (
                                                <span className="text-3xl">{wt.icon}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium">{wt.label}</td>
                                        <td className="px-4 py-4 text-center">
                                            <button
                                                onClick={() => setManagingClientsFor(wt)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors text-sm font-medium"
                                                title="Upravljaj klijentima"
                                            >
                                                <Users size={14} />
                                                {clientCount} {clientCount === 1 ? 'klijent' : clientCount < 5 ? 'klijenta' : 'klijenata'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => startEdit(wt)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Izmeni">
                                                <Edit3 size={18} />
                                            </button>
                                            <button onClick={() => onDelete(wt.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Obriši">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {managingClientsFor && onUpdateClientWasteTypes && (
                <WasteTypeClientsModal
                    wasteType={managingClientsFor}
                    clients={clients}
                    allWasteTypes={wasteTypes}
                    onClose={() => setManagingClientsFor(null)}
                    onSave={onUpdateClientWasteTypes}
                />
            )}

            <BulkWasteTypeModal
                open={showBulkModal}
                onClose={() => setShowBulkModal(false)}
                wasteTypes={wasteTypes}
                clients={clients}
                onBulkUpdate={onBulkUpdate}
            />
        </div>
    );
};

export default WasteTypesManagement;
