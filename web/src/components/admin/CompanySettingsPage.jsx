import { useState, useEffect } from 'react';
import { Settings, Clock, Save, RefreshCw, CheckCircle, Building2 } from 'lucide-react';
import { useCompany } from '../../context/CompanyContext';
import { useAuth } from '../../context';
import toast from 'react-hot-toast';

const PRESET_HOURS = [24, 48, 72, 96, 120, 168]; // Common options (up to 7 days)

export const CompanySettingsPage = () => {
    const { fetchMaxPickupHours, updateMaxPickupHours, updateCompanyName, fetchCompanyDetails } = useCompany();
    const { companyCode, companyName, setCompanyName } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [maxHours, setMaxHours] = useState(48);
    const [editingName, setEditingName] = useState(false);
    const [newCompanyName, setNewCompanyName] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const hours = await fetchMaxPickupHours();
            setMaxHours(hours);
            setNewCompanyName(companyName || '');
        } catch (err) {
            console.error('Error loading settings:', err);
        }
        setLoading(false);
    };

    const handleSaveMaxHours = async () => {
        setSaving(true);
        try {
            await updateMaxPickupHours(maxHours);
            toast.success('Maksimalno vreme za preuzimanje sačuvano');
        } catch (err) {
            toast.error('Greška: ' + err.message);
        }
        setSaving(false);
    };

    const handleSaveCompanyName = async () => {
        if (!newCompanyName.trim()) {
            toast.error('Naziv firme ne može biti prazan');
            return;
        }
        setSaving(true);
        try {
            await updateCompanyName(newCompanyName.trim());
            setEditingName(false);
            toast.success('Naziv firme ažuriran');
        } catch (err) {
            toast.error('Greška: ' + err.message);
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <RefreshCw className="animate-spin text-emerald-600" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                    <Settings size={24} className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Podešavanja firme</h1>
                    <p className="text-slate-500">Konfigurisanje parametara za {companyName}</p>
                </div>
            </div>

            {/* Company Name Card */}
            <div className="bg-white rounded-2xl border p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Building2 size={20} className="text-purple-600" />
                    <h2 className="text-lg font-semibold">Naziv firme</h2>
                </div>

                {editingName ? (
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={newCompanyName}
                            onChange={(e) => setNewCompanyName(e.target.value)}
                            className="flex-1 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 outline-none"
                            placeholder="Unesite naziv firme..."
                        />
                        <button
                            onClick={handleSaveCompanyName}
                            disabled={saving}
                            className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                            Sačuvaj
                        </button>
                        <button
                            onClick={() => { setEditingName(false); setNewCompanyName(companyName || ''); }}
                            className="px-4 py-2 border rounded-xl hover:bg-slate-50"
                        >
                            Otkaži
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        <span className="text-lg font-medium text-slate-700">{companyName}</span>
                        <button
                            onClick={() => setEditingName(true)}
                            className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-sm"
                        >
                            Izmeni
                        </button>
                    </div>
                )}
            </div>

            {/* Max Pickup Hours Card */}
            <div className="bg-white rounded-2xl border p-6">
                <div className="flex items-center gap-3 mb-2">
                    <Clock size={20} className="text-emerald-600" />
                    <h2 className="text-lg font-semibold">Maksimalno vreme za preuzimanje</h2>
                </div>
                <p className="text-slate-500 text-sm mb-6">
                    Svaki zahtev klijenta mora biti preuzet u okviru ovog vremena. Ovo vreme će se koristiti za prikaz hitnosti zahteva.
                </p>

                {/* Preset buttons */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
                    {PRESET_HOURS.map(hours => (
                        <button
                            key={hours}
                            onClick={() => setMaxHours(hours)}
                            className={`p-3 rounded-xl border-2 text-center transition-all ${maxHours === hours
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 hover:border-emerald-300'
                                }`}
                        >
                            <span className="text-lg font-bold block">{hours}h</span>
                            <span className="text-xs text-slate-500">
                                {hours < 24 ? `${hours}h` : hours === 24 ? '1 dan' : hours === 48 ? '2 dana' : hours === 72 ? '3 dana' : hours === 96 ? '4 dana' : hours === 120 ? '5 dana' : '7 dana'}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Custom input */}
                <div className="flex items-center gap-4 mb-6">
                    <span className="text-sm text-slate-600">Ili unesite prilagođenu vrednost:</span>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min="1"
                            max="720"
                            value={maxHours}
                            onChange={(e) => setMaxHours(Math.max(1, Math.min(720, parseInt(e.target.value) || 48)))}
                            className="w-24 px-3 py-2 border rounded-xl text-center font-bold focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
                        />
                        <span className="text-slate-600">sati</span>
                    </div>
                </div>

                {/* Info box */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <CheckCircle size={20} className="text-emerald-600 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-medium text-emerald-800">
                                Trenutno podešeno: {maxHours} sati ({(maxHours / 24).toFixed(1)} dana)
                            </p>
                            <p className="text-emerald-700 mt-1">
                                Zahtevi će postajati crveni (hitni) kada preostane manje od {Math.round(maxHours * 0.25)} sati.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Save button */}
                <button
                    onClick={handleSaveMaxHours}
                    disabled={saving}
                    className="w-full md:w-auto px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                >
                    {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                    Sačuvaj podešavanje
                </button>
            </div>

            {/* Company Code Info */}
            <div className="bg-slate-50 rounded-2xl border p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-slate-700">ECO Kod firme</h3>
                        <p className="text-sm text-slate-500">Koristite ovaj kod za registraciju novih korisnika</p>
                    </div>
                    <code className="text-lg font-bold text-emerald-700 bg-emerald-100 px-4 py-2 rounded-xl">
                        {companyCode}
                    </code>
                </div>
            </div>
        </div>
    );
};

export default CompanySettingsPage;
