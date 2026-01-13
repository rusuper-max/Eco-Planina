import { getFillLevelColor } from '../../utils/styleUtils';

/**
 * Fill level progress bar with dynamic coloring
 * Green < 75%, Orange 75-99%, Red >= 100%
 */
export const FillLevelBar = ({ fillLevel, showLabel = true }) => {
    const colors = getFillLevelColor(fillLevel);
    const displayLevel = fillLevel !== null && fillLevel !== undefined && fillLevel !== '' ? fillLevel : 0;
    const labelText = fillLevel !== null && fillLevel !== undefined && fillLevel !== '' ? `${fillLevel}%` : '-';

    return (
        <div className="flex items-center gap-2">
            <div className="w-12 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${colors.bg}`} style={{ width: `${displayLevel}%` }} />
            </div>
            {showLabel && <span className={`text-xs font-medium ${colors.text}`}>{labelText}</span>}
        </div>
    );
};

export default FillLevelBar;
