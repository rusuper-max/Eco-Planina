import React, { useState, useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';

const CountdownTimer = ({ createdAt, maxPickupHours = 48 }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [isExpired, setIsExpired] = useState(false);
    const [isUrgent, setIsUrgent] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            if (!createdAt) return;

            const created = new Date(createdAt);

            // Koristi maxPickupHours iz company settings
            const hoursToAdd = maxPickupHours || 48;

            const deadline = new Date(created.getTime() + hoursToAdd * 60 * 60 * 1000);
            const now = new Date();
            const diff = deadline - now;

            if (diff <= 0) {
                setIsExpired(true);
                // Prikaži koliko kasni
                const overdue = Math.abs(diff);
                const h = Math.floor(overdue / (1000 * 60 * 60));
                const m = Math.floor((overdue % (1000 * 60 * 60)) / (1000 * 60));
                if (h >= 24) {
                    const days = Math.floor(h / 24);
                    setTimeLeft(`-${days}d ${h % 24}h`);
                } else if (h > 0) {
                    setTimeLeft(`-${h}h ${m}m`);
                } else {
                    setTimeLeft(`-${m}m`);
                }
                return;
            }

            setIsExpired(false);
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            setTimeLeft(`${hours}h ${minutes}m`);

            // Dinamičke granice na osnovu maxPickupHours
            // Hitno: preostalo manje od 25% vremena
            const urgentThreshold = hoursToAdd * 0.25;
            setIsUrgent(hours < urgentThreshold);
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 60000); // Update every minute

        return () => clearInterval(timer);
    }, [createdAt, maxPickupHours]);

    return (
        <Text style={[
            styles.timer,
            isExpired ? styles.expired : null,
            !isExpired && isUrgent ? styles.urgent : null
        ]}>
            {timeLeft}
        </Text>
    );
};

const styles = StyleSheet.create({
    timer: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#10B981', // Default green
    },
    expired: {
        color: '#EF4444', // Red
    },
    urgent: {
        color: '#F59E0B', // Orange
    }
});

export default CountdownTimer;
