import { useState } from 'react';
import { Plus, Recycle, Edit3, Trash2 } from 'lucide-react';
import { EmptyState, ImageUploader } from '../common';

/**
 * Waste Types Management - CRUD for waste types
 */
export const WasteTypesManagement = ({ wasteTypes, onAdd, onDelete, onEdit }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingType, setEditingType] = useState(null);
    const [newType, setNewType] = useState({ label: '', icon: '📦', customImage: null });

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
            console.log('DEBUG WasteTypesManagement handleEdit - editingType:', editingType);
            console.log('DEBUG WasteTypesManagement handleEdit - customImage:', editingType.customImage);
            console.log('DEBUG WasteTypesManagement handleEdit - all keys:', Object.keys(editingType));
            onEdit(editingType);
            setEditingType(null);
        }
    };

    const startEdit = (wt) => {
        setEditingType({ ...wt });
        setShowAddForm(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold">Vrste robe (otpada)</h2>
                    <p className="text-sm text-slate-500">Upravljajte vrstama otpada koje vaši klijenti mogu da prijavljuju</p>
                </div>
                <button onClick={() => { setShowAddForm(true); setEditingType(null); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-sm">
                    <Plus size={18} /> Dodaj vrstu
                </button>
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
                            <ImageUploader
                                currentImage={newType.customImage}
                                onUpload={(url) => setNewType({ ...newType, customImage: url })}
                                onRemove={() => setNewType({ ...newType, customImage: null })}
                                label="Koristi svoju sliku"
                                bucket="assets"
                            />
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
                            <ImageUploader
                                currentImage={editingType.customImage}
                                onUpload={(url) => setEditingType({ ...editingType, customImage: url })}
                                onRemove={() => setEditingType({ ...editingType, customImage: null })}
                                label="Koristi svoju sliku"
                                bucket="assets"
                            />
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
                                <th className="px-6 py-4 text-right">Akcije</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {wasteTypes.map(wt => (
                                <tr key={wt.id} className={`hover:bg-slate-50 ${editingType?.id === wt.id ? 'bg-blue-50' : ''}`}>
                                    <td className="px-6 py-4">
                                        {wt.customImage ? (
                                            <img src={wt.customImage} alt={wt.label} className="w-12 h-12 object-cover rounded-xl" />
                                        ) : (
                                            <span className="text-3xl">{wt.icon}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-medium">{wt.label}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => startEdit(wt)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Izmeni">
                                            <Edit3 size={18} />
                                        </button>
                                        <button onClick={() => onDelete(wt.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Obriši">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default WasteTypesManagement;
