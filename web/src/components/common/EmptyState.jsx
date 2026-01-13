import { memo } from 'react';

export const EmptyState = memo(({ icon: Icon, title, desc }) => (
    <div className="text-center py-16">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
            <Icon size={40} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-500">{desc}</p>
    </div>
));

export default EmptyState;
