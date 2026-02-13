import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

const NotificationContext = createContext(null);

// Storage key for push token
const PUSH_TOKEN_KEY = 'ecologistics_push_token';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [notification, setNotification] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [userId, setUserId] = useState(null); // app users.id
  const notificationListener = useRef();
  const responseListener = useRef();
  const realtimeChannel = useRef();

  // Resolve current user.id (profile) so we can subscribe to their notifications
  useEffect(() => {
    let active = true;

    const loadUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const authId = session?.user?.id;
      if (!authId) {
        setUserId(null);
        return;
      }
      const { data: userRow, error } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', authId)
        .single();
      if (error) {
        console.error('[Notifications] Failed to load user id:', error);
        return;
      }
      if (active) setUserId(userRow?.id || null);
    };

    loadUserId();

    const { data: authSub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUserId(null);
        return;
      }
      const { data: userRow } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', session.user.id)
        .single();
      setUserId(userRow?.id || null);
    });

    return () => {
      active = false;
      authSub?.subscription?.unsubscribe();
    };
  }, []);

  // Map notification type to android channel id
  const getChannelId = (type) => {
    switch (type) {
      case 'assignment':
      case 'new_assignment':
        return 'assignments';
      case 'unassignment':
      case 'assignment_cancelled':
        return 'unassignments';
      case 'retroactive_assignment':
        return 'retroactive';
      case 'new_message':
      case 'message':
        return 'messages';
      default:
        return 'default';
    }
  };

  // Register for push notifications
  const registerForPushNotifications = useCallback(async () => {
    let token;

    // Check if we're on a physical device (allow emulator for testing)
    if (!Device.isDevice) {
      console.log('[Notifications] Running on emulator - push notifications may be limited');
      // Still try to continue for testing purposes
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    setPermissionStatus(existingStatus);

    // Request permission if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      setPermissionStatus(status);
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission not granted');
      return null;
    }

    // Get Expo push token
    try {
      const projectId = 'f7ec23e5-6fd1-44a2-9273-6e241959e906'; // From app.json
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('[Notifications] Push token:', token);
      setExpoPushToken(token);

      // Store token locally
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    } catch (error) {
      console.error('[Notifications] Error getting push token:', error);
      return null;
    }

    // Configure Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
      });

      // Create channel for driver assignments
      await Notifications.setNotificationChannelAsync('assignments', {
        name: 'Dodeljivanja',
        description: 'Obaveštenja o novim dodeljenim zahtevima',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
      });

      // Create channel for messages
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Poruke',
        description: 'Obaveštenja o novim porukama',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 100],
        lightColor: '#3B82F6',
      });

      // Create channel for unassignments
      await Notifications.setNotificationChannelAsync('unassignments', {
        name: 'Uklanjanja',
        description: 'Obaveštenja kada ste uklonjeni sa zahteva',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#EF4444',
      });

      // Create channel for retroactive assignments
      await Notifications.setNotificationChannelAsync('retroactive', {
        name: 'Naknadne dodele',
        description: 'Obaveštenja o naknadnim dodelama',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 100],
        lightColor: '#F59E0B',
      });
    }

    return token;
  }, []);

  // Save push token to Supabase for this user
  const savePushTokenToServer = useCallback(async (userId, token) => {
    if (!userId || !token) return;

    try {
      // Update user's push_token in the database
      const { error } = await supabase
        .from('users')
        .update({
          push_token: token,
          push_token_updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('[Notifications] Error saving push token:', error);
      } else {
        console.log('[Notifications] Push token saved to server');
      }
    } catch (error) {
      console.error('[Notifications] Error saving push token:', error);
    }
  }, []);

  // Remove push token from server (on logout)
  const removePushTokenFromServer = useCallback(async (userId) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          push_token: null,
          push_token_updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('[Notifications] Error removing push token:', error);
      }
    } catch (error) {
      console.error('[Notifications] Error removing push token:', error);
    }
  }, []);

  // Schedule a local notification
  const scheduleLocalNotification = useCallback(async (title, body, data = {}, channelId = 'default') => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          ...(Platform.OS === 'android' && { channelId }),
        },
        trigger: null, // Immediate notification
      });
    } catch (error) {
      console.error('[Notifications] Error scheduling notification:', error);
    }
  }, []);

  // Real-time subscription to notifications table for the logged-in user (foreground fallback)
  useEffect(() => {
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current);
      realtimeChannel.current = null;
    }
    if (!userId) return;

    const channel = supabase.channel(`rt_notifications_${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        const n = payload.new;
        scheduleLocalNotification(n.title, n.message || n.body, n.data || {}, getChannelId(n.type));
      })
      .subscribe();

    realtimeChannel.current = channel;

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current);
        realtimeChannel.current = null;
      }
    };
  }, [userId, scheduleLocalNotification]);

  // Clear all notifications
  const clearAllNotifications = useCallback(async () => {
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
  }, []);

  // Initialize notification listeners
  useEffect(() => {
    // Listen for incoming notifications while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[Notifications] Received:', notification);
      setNotification(notification);
    });

    // Listen for user interaction with notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[Notifications] User interacted:', response);
      const data = response.notification.request.content.data || {};

      // Navigate based on notification data
      if (data.type === 'assignment' || data.type === 'new_assignment') {
        // Set a nav intent flag in AsyncStorage so relevant screen can consume it
        AsyncStorage.setItem('nav_intent', JSON.stringify({ screen: 'DriverView', request_id: data.request_id }));
      } else if (data.type === 'unassignment') {
        AsyncStorage.setItem('nav_intent', JSON.stringify({ screen: 'DriverView', request_id: data.request_id }));
      } else if ((data.type === 'message' || data.type === 'new_message') && data.conversation_id) {
        AsyncStorage.setItem('nav_intent', JSON.stringify({ screen: 'Chat', conversation_id: data.conversation_id }));
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const value = {
    // Token state
    expoPushToken,
    permissionStatus,
    notification,

    // Actions
    registerForPushNotifications,
    savePushTokenToServer,
    removePushTokenFromServer,
    scheduleLocalNotification,
    clearAllNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
