import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch notifications for current user
    const fetchNotifications = useCallback(async () => {
        if (!user?.id) return;

        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            setNotifications(data || []);
            setUnreadCount((data || []).filter(n => !n.is_read).length);
        } catch (error) {
            console.error('[Notifications] Error fetching:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id]);

    // Initial fetch and real-time subscription
    useEffect(() => {
        if (!user?.id) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        fetchNotifications();

        // Real-time subscription for new notifications
        const channelName = `notifications_${user.id}`;
        const subscription = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    console.log('[Notifications] New notification:', payload.new);
                    setNotifications(prev => [payload.new, ...prev]);
                    setUnreadCount(prev => prev + 1);

                    // Play sound if enabled (optional)
                    playNotificationSound();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    setNotifications(prev =>
                        prev.map(n => n.id === payload.new.id ? payload.new : n)
                    );
                    // Recalculate unread count
                    setNotifications(prev => {
                        setUnreadCount(prev.filter(n => !n.is_read).length);
                        return prev;
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
                    setUnreadCount(prev => Math.max(0, prev - 1));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [user?.id, fetchNotifications]);

    // Mark single notification as read
    const markAsRead = async (notificationId) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true, read_at: new Date().toISOString() })
                .eq('id', notificationId);

            if (error) throw error;

            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('[Notifications] Error marking as read:', error);
        }
    };

    // Mark all notifications as read
    const markAllAsRead = async () => {
        if (!user?.id || unreadCount === 0) return;

        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true, read_at: new Date().toISOString() })
                .eq('user_id', user.id)
                .eq('is_read', false);

            if (error) throw error;

            setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: true }))
            );
            setUnreadCount(0);
        } catch (error) {
            console.error('[Notifications] Error marking all as read:', error);
        }
    };

    // Delete a notification
    const deleteNotification = async (notificationId) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notificationId);

            if (error) throw error;

            const notification = notifications.find(n => n.id === notificationId);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            if (notification && !notification.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('[Notifications] Error deleting:', error);
        }
    };

    // Clear all notifications
    const clearAllNotifications = async () => {
        if (!user?.id) return;

        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('user_id', user.id);

            if (error) throw error;

            setNotifications([]);
            setUnreadCount(0);
        } catch (error) {
            console.error('[Notifications] Error clearing all:', error);
        }
    };

    // Play notification sound (optional feature)
    const playNotificationSound = () => {
        try {
            // Check if user has sounds enabled in preferences
            const soundEnabled = localStorage.getItem('notification_sound') !== 'false';
            if (soundEnabled) {
                const audio = new Audio('/notification.mp3');
                audio.volume = 0.3;
                audio.play().catch(() => {
                    // Ignore errors (user hasn't interacted with page yet)
                });
            }
        } catch (e) {
            // Ignore audio errors
        }
    };

    // Get notification icon based on type
    const getNotificationIcon = (type) => {
        const icons = {
            new_request: '📋',
            urgent_request: '🚨',
            request_processed: '✅',
            driver_assigned: '🚚',
            new_assignment: '📦',
            assignment_cancelled: '❌',
            new_client: '👤',
            new_message: '💬',
            reminder: '⏰',
            request_expiring: '⚠️',
        };
        return icons[type] || '🔔';
    };

    // Format notification time
    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Upravo sada';
        if (diffMins < 60) return `Pre ${diffMins} min`;
        if (diffHours < 24) return `Pre ${diffHours}h`;
        if (diffDays < 7) return `Pre ${diffDays} dana`;

        return date.toLocaleDateString('sr-Latn-RS', {
            day: 'numeric',
            month: 'short',
        });
    };

    const value = {
        notifications,
        unreadCount,
        isLoading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAllNotifications,
        getNotificationIcon,
        formatTime,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export default NotificationContext;
