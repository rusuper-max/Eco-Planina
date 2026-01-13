import { useState } from 'react';
import { Plus, Box, Edit3, Trash2 } from 'lucide-react';
import { Modal, EmptyState, ImageUploader } from '../common';

/**
 * Equipment Management - CRUD for equipment items
 */
export const EquipmentManagement = ({ equipment, onAdd, onAssign, onDelete, onEdit, clients }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newEquipment, setNewEquipment] = useState({ name: '', description: '', customImage: null });
    const [editingEquipment, setEditingEquipment] = useState(null);
    const [assigningEquipment, setAssigningEquipment] = useState(null);

    const handleAdd = () => {
        if (newEquipment.name) {
            onAdd(newEquipment);
            setNewEquipment({ name: '', description: '', customImage: null });
            setShowAddForm(false);
        }
    };

    const handleEdit = () => {
        if (editingEquipment && editingEquipment.name) {
            onEdit(editingEquipment);
            setEditingEquipment(null);
        }
    };

    const startEdit = (eq) => {
        setEditingEquipment({ ...eq });
        setShowAddForm(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">Oprema</h2>
                <button onClick={() => { setShowAddForm(true); setEditingEquipment(null); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-sm">
                    <Plus size={18} /> Dodaj opremu
                </button>
            </div>

            {showAddForm && (
                <div className="bg-white rounded-2xl border p-6 space-y-4">
                    <h3 className="font-semibold">Nova oprema</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Naziv opreme</label>
                                <input
                                    type="text"
                                    value={newEquipment.name}
                                    onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
                                    placeholder="npr. Kontejner za karton, Presa #1, Kanta za plastiku..."
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Opis (opciono)</label>
                                <textarea
                                    value={newEquipment.description}
                                    onChange={(e) => setNewEquipment({ ...newEquipment, description: e.target.value })}
                                    placeholder="Dodatan opis opreme..."
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                    rows={2}
                                />
                            </div>
                        </div>
                        <div>
                            <ImageUploader
                                currentImage={newEquipment.customImage}
                                onUpload={(url) => setNewEquipment({ ...newEquipment, customImage: url })}
                                onRemove={() => setNewEquipment({ ...newEquipment, customImage: null })}
                                label="Slika opreme (opciono)"
                                bucket="assets"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleAdd} disabled={!newEquipment.name} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-medium">Sačuvaj</button>
                        <button onClick={() => { setShowAddForm(false); setNewEquipment({ name: '', description: '', customImage: null }); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-medium">Otkaži</button>
                    </div>
                </div>
            )}

            {/* Edit Form */}
            {editingEquipment && (
                <div className="bg-white rounded-2xl border p-6 space-y-4 border-blue-200">
                    <h3 className="font-semibold text-blue-700">Izmeni opremu</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Naziv opreme</label>
                                <input
                                    type="text"
                                    value={editingEquipment.name}
                                    onChange={(e) => setEditingEquipment({ ...editingEquipment, name: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Opis (opciono)</label>
                                <textarea
                                    value={editingEquipment.description || ''}
                                    onChange={(e) => setEditingEquipment({ ...editingEquipment, description: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                    rows={2}
                                />
                            </div>
                        </div>
                        <div>
                            <ImageUploader
                                currentImage={editingEquipment.customImage}
                                onUpload={(url) => setEditingEquipment({ ...editingEquipment, customImage: url })}
                                onRemove={() => setEditingEquipment({ ...editingEquipment, customImage: null })}
                                label="Slika opreme (opciono)"
                                bucket="assets"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium">Sačuvaj izmene</button>
                        <button onClick={() => setEditingEquipment(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-medium">Otkaži</button>
                    </div>
                </div>
            )}

            {assigningEquipment && (
                <Modal open={!!assigningEquipment} onClose={() => setAssigningEquipment(null)} title="Dodeli opremu klijentu">
                    <div className="space-y-4">
                        <p className="text-slate-600">Dodeljivanje: <strong>{assigningEquipment.name}</strong></p>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {clients?.map(client => (
                                <button
                                    key={client.id}
                                    onClick={() => { onAssign(assigningEquipment.id, client.id); setAssigningEquipment(null); }}
                                    className="w-full p-4 bg-slate-50 hover:bg-emerald-50 rounded-xl text-left flex items-center gap-3"
                                >
                                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold">
                                        {client.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-medium">{client.name}</p>
                                        <p className="text-sm text-slate-500">{client.address || 'Bez adrese'}</p>
                                    </div>
                                </button>
                            ))}
                            {(!clients || clients.length === 0) && <p className="text-center text-slate-500 py-4">Nema dostupnih klijenata</p>}
                        </div>
                    </div>
                </Modal>
            )}

            {!equipment?.length ? (
                <EmptyState icon={Box} title="Nema opreme" desc="Dodajte prvu opremu klikom na dugme iznad" />
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {equipment.map(eq => (
                        <div key={eq.id} className="bg-white rounded-2xl border p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    {eq.customImage ? (
                                        <img src={eq.customImage} alt={eq.name} className="w-12 h-12 object-cover rounded-xl" />
                                    ) : (
                                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                                            <Box size={24} className="text-slate-400" />
                                        </div>
                                    )}
                                    <div>
                                        <h4 className="font-bold">{eq.name}</h4>
                                    </div>
                                </div>
                            </div>
                            {eq.description && <p className="text-sm text-slate-600 mb-3">{eq.description}</p>}
                            {eq.assigned_to_name && (
                                <div className="px-3 py-2 bg-emerald-50 rounded-lg mb-3">
                                    <p className="text-xs text-emerald-600">Dodeljeno:</p>
                                    <p className="text-sm font-medium text-emerald-700">{eq.assigned_to_name}</p>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <button onClick={() => setAssigningEquipment(eq)} className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">
                                    {eq.assigned_to ? 'Promeni' : 'Dodeli'}
                                </button>
                                <button onClick={() => startEdit(eq)} className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Izmeni">
                                    <Edit3 size={18} />
                                </button>
                                <button onClick={() => onDelete(eq.id)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg" title="Obriši">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EquipmentManagement;
