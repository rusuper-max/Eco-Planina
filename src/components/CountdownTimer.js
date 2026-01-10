import React, { useState, useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';

const CountdownTimer = ({ createdAt, urgency }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [isExpired, setIsExpired] = useState(false);
    const [isUrgent, setIsUrgent] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            if (!createdAt) return;

            const created = new Date(createdAt);
            let hoursToAdd = 24;
            if (urgency === '48h') hoursToAdd = 48;
            if (urgency === '72h') hoursToAdd = 72;

            const deadline = new Date(created.getTime() + hoursToAdd * 60 * 60 * 1000);
            const now = new Date();
            const diff = deadline - now;

            if (diff <= 0) {
                setIsExpired(true);
                setTimeLeft('ISTEKLO');
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            setTimeLeft(`${hours}h ${minutes}m`);

            // Mark as urgent if less than 4 hours left
            if (hours < 4) {
                setIsUrgent(true);
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 60000); // Update every minute

        return () => clearInterval(timer);
    }, [createdAt, urgency]);

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
