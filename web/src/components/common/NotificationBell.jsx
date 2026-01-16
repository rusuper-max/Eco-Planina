import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

const NotificationBell = () => {
    const {
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAllNotifications,
        getNotificationIcon,
        formatTime,
    } = useNotifications();

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle notification click
    const handleNotificationClick = async (notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }

        // Navigate based on notification type and data
        if (notification.data?.request_id) {
            // Could navigate to request details
            // navigate(`/requests/${notification.data.request_id}`);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Notifikacije"
            >
                <Bell size={22} />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-16 sm:top-auto sm:mt-2 w-auto sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-[9999] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                        <h3 className="font-semibold text-gray-900">Notifikacije</h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    title="Oznaci sve kao procitano"
                                >
                                    <CheckCheck size={14} />
                                    <span className="hidden sm:inline">Procitaj sve</span>
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={() => {
                                        if (confirm('Obrisati sve notifikacije?')) {
                                            clearAllNotifications();
                                        }
                                    }}
                                    className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
                                    title="Obrisi sve"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 px-4 text-gray-500">
                                <Bell size={32} className="mb-2 opacity-50" />
                                <p className="text-sm">Nema notifikacija</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${!notification.is_read ? 'bg-blue-50/50' : ''
                                            }`}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        {/* Icon */}
                                        <span className="text-xl flex-shrink-0 mt-0.5">
                                            {getNotificationIcon(notification.type)}
                                        </span>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                                    {notification.title}
                                                </p>
                                                <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                                                    {formatTime(notification.created_at)}
                                                </span>
                                            </div>
                                            {notification.message && (
                                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {!notification.is_read && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        markAsRead(notification.id);
                                                    }}
                                                    className="p-1 text-gray-400 hover:text-green-600 rounded"
                                                    title="Oznaci kao procitano"
                                                >
                                                    <Check size={14} />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteNotification(notification.id);
                                                }}
                                                className="p-1 text-gray-400 hover:text-red-600 rounded"
                                                title="Obrisi"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-2 bg-gray-50 border-t text-center">
                            <span className="text-xs text-gray-500">
                                {notifications.length} notifikacija
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
