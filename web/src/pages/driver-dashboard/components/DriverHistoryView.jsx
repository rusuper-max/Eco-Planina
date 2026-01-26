/**
 * DriverHistoryView - Istorija prikaz za vozače
 * Ekstraktovano iz DriverDashboard.jsx
 */
import React from 'react';
import { History, RefreshCw } from 'lucide-react';
import { EmptyState } from '../../../components/common';
import { HistoryCard } from './HistoryCard';

export const DriverHistoryView = ({
    historyRequests,
    loadingHistory,
    wasteTypes
}) => {
    return (
        <div className="flex-1 overflow-y-auto">
            <div className="p-4 border-b bg-white sticky top-0">
                <h2 className="font-bold text-slate-800">Istorija dostava</h2>
                <p className="text-sm text-slate-500">Poslednjih 50 dostavljenih zahteva - klikni za detalje</p>
            </div>
            {loadingHistory ? (
                <div className="flex items-center justify-center h-64">
                    <RefreshCw className="animate-spin text-emerald-600" size={32} />
                </div>
            ) : historyRequests.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                    <EmptyState
                        icon={History}
                        title="Nema zavrsenih dostava"
                        desc="Vasa istorija ce se pojaviti ovde nakon sto zavrsavate dostave"
                    />
                </div>
            ) : (
                <div className="p-4 space-y-3 max-w-2xl mx-auto">
                    {historyRequests.map(item => (
                        <HistoryCard key={item.id} item={item} wasteTypes={wasteTypes} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default DriverHistoryView;
