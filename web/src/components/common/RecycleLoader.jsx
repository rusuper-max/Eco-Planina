import { Recycle } from 'lucide-react';

export const RecycleLoader = ({ size = 24, className = '', text = null }) => {
    return (
        <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
            <Recycle
                size={size}
                className="text-emerald-500 animate-spin"
                style={{ animationDuration: '3s' }} // Slower spin for better visibility
            />
            {text && <span className="text-sm text-slate-500 font-medium">{text}</span>}
        </div>
    );
};

export default RecycleLoader;
