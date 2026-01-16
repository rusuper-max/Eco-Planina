import { memo } from 'react';

/**
 * EmptyState - Prikazuje lepo dizajnirano prazno stanje sa ikonom
 * @param {LucideIcon} icon - Lucide ikona za prikaz
 * @param {string} title - Naslov praznog stanja
 * @param {string} desc - Opis praznog stanja
 * @param {string} actionLabel - Tekst za akciono dugme (opciono)
 * @param {function} onAction - Handler za klik na akciono dugme (opciono)
 * @param {string} variant - 'default' | 'subtle' | 'card' stilovi
 */
export const EmptyState = memo(({
    icon: Icon,
    title,
    desc,
    actionLabel,
    onAction,
    variant = 'default'
}) => {
    const containerStyles = {
        default: 'text-center py-16',
        subtle: 'text-center py-12',
        card: 'text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm'
    };

    const iconContainerStyles = {
        default: 'w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl',
        subtle: 'w-16 h-16 bg-slate-100 rounded-xl',
        card: 'w-20 h-20 bg-gradient-to-br from-emerald-50 to-slate-100 rounded-2xl'
    };

    const iconStyles = {
        default: 'text-slate-400',
        subtle: 'text-slate-400',
        card: 'text-emerald-500'
    };

    return (
        <div className={containerStyles[variant]}>
            <div className={`${iconContainerStyles[variant]} flex items-center justify-center mx-auto mb-5 shadow-inner`}>
                <Icon size={variant === 'subtle' ? 32 : 40} className={iconStyles[variant]} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-4">{desc}</p>
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
});

export default EmptyState;
