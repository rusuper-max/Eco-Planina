import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const OfflineContext = createContext(null);

// Storage keys
const OFFLINE_QUEUE_KEY = 'ecologistics_offline_queue';
const CACHED_DATA_KEY = 'ecologistics_cached_data';

// Cache keys for specific data types
export const CACHE_KEYS = {
  PICKUP_REQUESTS: 'pickup_requests',
  CLIENT_REQUESTS: 'client_requests',
  DRIVER_ASSIGNMENTS: 'driver_assignments',
  DRIVER_HISTORY: 'driver_history',
  COMPANY_CLIENTS: 'company_clients',
  CONVERSATIONS: 'conversations',
  USER_PROFILE: 'user_profile',
};

// Action types that can be queued
export const OFFLINE_ACTIONS = {
  ADD_PICKUP_REQUEST: 'ADD_PICKUP_REQUEST',
  UPDATE_PICKUP_REQUEST: 'UPDATE_PICKUP_REQUEST',
  DELETE_PICKUP_REQUEST: 'DELETE_PICKUP_REQUEST',
  UPDATE_ASSIGNMENT_STATUS: 'UPDATE_ASSIGNMENT_STATUS',
  SEND_MESSAGE: 'SEND_MESSAGE',
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  UPDATE_LOCATION: 'UPDATE_LOCATION',
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
};

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [queue, setQueue] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [cachedData, setCachedData] = useState({});
  const syncInProgress = useRef(false);
  const actionHandlers = useRef({});

  // Initialize: Load queue from storage and start network listener
  useEffect(() => {
    loadQueueFromStorage();
    loadCachedData();

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable;
      setIsConnected(state.isConnected);
      setIsOnline(online);

      // When coming back online, try to sync
      if (online && !syncInProgress.current) {
        syncQueue();
      }
    });

    // Initial network check
    NetInfo.fetch().then(state => {
      const online = state.isConnected && state.isInternetReachable;
      setIsConnected(state.isConnected);
      setIsOnline(online);
    });

    return () => unsubscribe();
  }, []);

  // Load offline queue from AsyncStorage
  const loadQueueFromStorage = async () => {
    try {
      const stored = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setQueue(parsed);
        console.log(`[Offline] Loaded ${parsed.length} queued actions from storage`);
      }
    } catch (error) {
      console.error('[Offline] Error loading queue:', error);
    }
  };

  // Save queue to AsyncStorage
  const saveQueueToStorage = async (newQueue) => {
    try {
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(newQueue));
    } catch (error) {
      console.error('[Offline] Error saving queue:', error);
    }
  };

  // Load cached data from AsyncStorage
  const loadCachedData = async () => {
    try {
      const stored = await AsyncStorage.getItem(CACHED_DATA_KEY);
      if (stored) {
        setCachedData(JSON.parse(stored));
      }
    } catch (error) {
      console.error('[Offline] Error loading cached data:', error);
    }
  };

  // Save cached data to AsyncStorage
  const saveCachedData = async (data) => {
    try {
      await AsyncStorage.setItem(CACHED_DATA_KEY, JSON.stringify(data));
      setCachedData(data);
    } catch (error) {
      console.error('[Offline] Error saving cached data:', error);
    }
  };

  // Register action handlers (called from AppContext)
  const registerActionHandler = useCallback((actionType, handler) => {
    actionHandlers.current[actionType] = handler;
  }, []);

  // Add action to queue
  const addToQueue = useCallback(async (actionType, payload, metadata = {}) => {
    const action = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: actionType,
      payload,
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString(),
        attempts: 0,
      },
    };

    const newQueue = [...queue, action];
    setQueue(newQueue);
    await saveQueueToStorage(newQueue);

    console.log(`[Offline] Added to queue: ${actionType}`, action.id);
    return action;
  }, [queue]);

  // Remove action from queue
  const removeFromQueue = useCallback(async (actionId) => {
    const newQueue = queue.filter(a => a.id !== actionId);
    setQueue(newQueue);
    await saveQueueToStorage(newQueue);
  }, [queue]);

  // Execute a single action
  const executeAction = async (action) => {
    const handler = actionHandlers.current[action.type];
    if (!handler) {
      console.error(`[Offline] No handler for action type: ${action.type}`);
      return { success: false, error: 'No handler' };
    }

    try {
      const result = await handler(action.payload);
      return { success: true, result };
    } catch (error) {
      console.error(`[Offline] Action failed: ${action.type}`, error);
      return { success: false, error: error.message };
    }
  };

  // Sync all queued actions
  const syncQueue = useCallback(async () => {
    if (syncInProgress.current || queue.length === 0) {
      return;
    }

    // Check if online
    const state = await NetInfo.fetch();
    if (!state.isConnected || !state.isInternetReachable) {
      console.log('[Offline] Cannot sync - no connection');
      return;
    }

    syncInProgress.current = true;
    setIsSyncing(true);
    console.log(`[Offline] Starting sync of ${queue.length} actions`);

    const remainingQueue = [];
    const maxAttempts = 3;

    for (const action of queue) {
      const result = await executeAction(action);

      if (result.success) {
        console.log(`[Offline] Synced: ${action.type} (${action.id})`);
      } else {
        action.metadata.attempts += 1;
        action.metadata.lastError = result.error;
        action.metadata.lastAttempt = new Date().toISOString();

        if (action.metadata.attempts < maxAttempts) {
          remainingQueue.push(action);
          console.log(`[Offline] Retry later: ${action.type} (attempt ${action.metadata.attempts})`);
        } else {
          console.log(`[Offline] Giving up on: ${action.type} after ${maxAttempts} attempts`);
          // Could notify user here about failed action
        }
      }
    }

    setQueue(remainingQueue);
    await saveQueueToStorage(remainingQueue);
    setLastSyncTime(new Date().toISOString());
    setIsSyncing(false);
    syncInProgress.current = false;

    console.log(`[Offline] Sync complete. Remaining: ${remainingQueue.length}`);
  }, [queue]);

  // Manual sync trigger
  const manualSync = useCallback(async () => {
    if (!isOnline) {
      return { success: false, message: 'Nema internet konekcije' };
    }
    await syncQueue();
    return { success: true, message: `Sinhronizovano ${queue.length} akcija` };
  }, [isOnline, queue, syncQueue]);

  // Cache data for offline access
  const cacheData = useCallback(async (key, data) => {
    const newCachedData = {
      ...cachedData,
      [key]: {
        data,
        cachedAt: new Date().toISOString(),
      },
    };
    await saveCachedData(newCachedData);
  }, [cachedData]);

  // Get cached data
  const getCachedData = useCallback((key) => {
    return cachedData[key]?.data || null;
  }, [cachedData]);

  // Check if cached data is stale (older than maxAge in minutes)
  const isCacheStale = useCallback((key, maxAgeMinutes = 30) => {
    const cached = cachedData[key];
    if (!cached) return true;

    const cachedAt = new Date(cached.cachedAt);
    const now = new Date();
    const diffMinutes = (now - cachedAt) / (1000 * 60);
    return diffMinutes > maxAgeMinutes;
  }, [cachedData]);

  // Clear all cached data
  const clearCache = useCallback(async () => {
    await AsyncStorage.removeItem(CACHED_DATA_KEY);
    setCachedData({});
  }, []);

  // Clear all queued actions
  const clearQueue = useCallback(async () => {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
    setQueue([]);
  }, []);

  const value = {
    // Network state
    isOnline,
    isConnected,

    // Queue state
    queue,
    queueLength: queue.length,
    isSyncing,
    lastSyncTime,

    // Queue operations
    addToQueue,
    removeFromQueue,
    syncQueue,
    manualSync,
    clearQueue,
    registerActionHandler,

    // Cache operations
    cacheData,
    getCachedData,
    isCacheStale,
    clearCache,
    cachedData,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export default OfflineContext;
