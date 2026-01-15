import { memo } from 'react';

export const SidebarItem = memo(({ icon: Icon, label, active, onClick, badge, isLink, href, helpKey }) => {
    const baseClasses = `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${active ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`;

    if (isLink && href) {
        return (
            <a href={href} className={baseClasses} data-help={helpKey}>
                <Icon size={20} />
                <span className="flex-1 text-left">{label}</span>
                {badge > 0 && <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${active ? 'bg-white text-emerald-600' : 'bg-red-500 text-white'}`}>{badge}</span>}
            </a>
        );
    }

    return (
        <button onClick={onClick} className={baseClasses} data-help={helpKey}>
            <Icon size={20} />
            <span className="flex-1 text-left">{label}</span>
            {badge > 0 && <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${active ? 'bg-white text-emerald-600' : 'bg-red-500 text-white'}`}>{badge}</span>}
        </button>
    );
});

export default SidebarItem;
