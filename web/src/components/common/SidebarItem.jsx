import { memo, useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useHelpMode } from '../../context';

export const SidebarItem = memo(({ icon: Icon, label, active, onClick, badge, isLink, href, helpKey, children, className }) => {
    const [expanded, setExpanded] = useState(false);
    const { isHelpMode } = useHelpMode();

    // Auto-expand if active, child is active, or Help mode is on
    useEffect(() => {
        if (active) setExpanded(true);
        if (children && children.some(c => c.active)) setExpanded(true);
        if (isHelpMode && children) setExpanded(true);
    }, [active, children, isHelpMode]);

    const baseClasses = `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'} ${className || ''}`;

    if (children && children.length > 0) {
        const isActiveGroup = children.some(c => c.active);

        return (
            <div className="space-y-1" data-help={helpKey}>
                <button
                    onClick={() => !isHelpMode && setExpanded(!expanded)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isActiveGroup ? 'text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                >
                    <Icon size={20} className={isActiveGroup ? 'text-emerald-500' : ''} />
                    <span className="flex-1 text-left">{label}</span>
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {expanded && (
                    <div className="pl-4 space-y-1 border-l border-slate-700 ml-4">
                        {children.map((child, idx) => (
                            <SidebarItem
                                key={idx}
                                {...child}
                                className={`!py-2 !pl-3 !text-xs ${child.active ? '!bg-emerald-600/80 !text-white' : '!bg-transparent hover:!bg-slate-700/50'}`}
                                icon={child.icon || Icon}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

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
