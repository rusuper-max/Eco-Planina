import { useState, useEffect } from 'react';
import { getRemainingTime } from '../../utils/timeUtils';

/**
 * Self-updating countdown timer component
 * Prevents full page re-renders by managing its own state
 */
export const CountdownTimer = ({ createdAt, urgency }) => {
    const [, setTick] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const rem = getRemainingTime(createdAt, urgency);
    return <span className={`text-sm font-mono font-bold ${rem.color}`}>⏱ {rem.text}</span>;
};

export default CountdownTimer;
