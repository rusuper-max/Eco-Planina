import { useCallback, useEffect } from 'react';
import { useOffline, OFFLINE_ACTIONS } from '../context/OfflineContext';
import { useAppContext } from '../context/AppContext';

/**
 * Hook that wraps AppContext actions with offline support.
 * When offline, actions are queued and synced when back online.
 */
export const useOfflineActions = () => {
  const { isOnline, addToQueue, registerActionHandler } = useOffline();
  const appContext = useAppContext();
  const {
    addPickupRequest: _addPickupRequest,
    removePickupRequest: _removePickupRequest,
    updateDriverAssignmentStatus: _updateDriverAssignmentStatus,
    sendMessage: _sendMessage,
    updateUserProfile: _updateUserProfile,
    updateClientLocation: _updateClientLocation,
    user,
    companyCode,
  } = appContext;

  // Register action handlers for sync
  useEffect(() => {
    registerActionHandler(OFFLINE_ACTIONS.ADD_PICKUP_REQUEST, async (payload) => {
      return await _addPickupRequest(payload);
    });

    registerActionHandler(OFFLINE_ACTIONS.DELETE_PICKUP_REQUEST, async (payload) => {
      return await _removePickupRequest(payload.id);
    });

    if (_updateDriverAssignmentStatus) {
      registerActionHandler(OFFLINE_ACTIONS.UPDATE_ASSIGNMENT_STATUS, async (payload) => {
        return await _updateDriverAssignmentStatus(payload.assignmentId, payload.status, payload.additionalData);
      });
    }

    if (_sendMessage) {
      registerActionHandler(OFFLINE_ACTIONS.SEND_MESSAGE, async (payload) => {
        return await _sendMessage(payload.recipientId, payload.content);
      });
    }

    if (_updateUserProfile) {
      registerActionHandler(OFFLINE_ACTIONS.UPDATE_PROFILE, async (payload) => {
        return await _updateUserProfile(payload);
      });
    }

    if (_updateClientLocation) {
      registerActionHandler(OFFLINE_ACTIONS.UPDATE_LOCATION, async (payload) => {
        return await _updateClientLocation(payload.latitude, payload.longitude, payload.address);
      });
    }
  }, [
    registerActionHandler,
    _addPickupRequest,
    _removePickupRequest,
    _updateDriverAssignmentStatus,
    _sendMessage,
    _updateUserProfile,
    _updateClientLocation,
  ]);

  /**
   * Add pickup request - works offline
   */
  const addPickupRequest = useCallback(async (request) => {
    if (isOnline) {
      return await _addPickupRequest(request);
    }

    // Queue for later sync
    const queuedAction = await addToQueue(OFFLINE_ACTIONS.ADD_PICKUP_REQUEST, request, {
      userId: user?.id,
      companyCode,
    });

    // Return optimistic result
    return {
      id: `offline_${queuedAction.id}`,
      ...request,
      user_id: user?.id,
      company_code: companyCode,
      status: 'pending',
      created_at: new Date().toISOString(),
      _offline: true,
      _queueId: queuedAction.id,
    };
  }, [isOnline, _addPickupRequest, addToQueue, user, companyCode]);

  /**
   * Remove pickup request - works offline
   */
  const removePickupRequest = useCallback(async (id) => {
    if (isOnline) {
      return await _removePickupRequest(id);
    }

    // Queue for later sync
    await addToQueue(OFFLINE_ACTIONS.DELETE_PICKUP_REQUEST, { id });
    return { success: true, _offline: true };
  }, [isOnline, _removePickupRequest, addToQueue]);

  /**
   * Update driver assignment status - works offline
   */
  const updateDriverAssignmentStatus = useCallback(async (assignmentId, status, additionalData = {}) => {
    if (!_updateDriverAssignmentStatus) {
      throw new Error('updateDriverAssignmentStatus is not available');
    }

    if (isOnline) {
      return await _updateDriverAssignmentStatus(assignmentId, status, additionalData);
    }

    // Queue for later sync
    await addToQueue(OFFLINE_ACTIONS.UPDATE_ASSIGNMENT_STATUS, {
      assignmentId,
      status,
      additionalData,
    });
    return { success: true, _offline: true };
  }, [isOnline, _updateDriverAssignmentStatus, addToQueue]);

  /**
   * Send message - works offline
   */
  const sendMessage = useCallback(async (recipientId, content) => {
    if (!_sendMessage) {
      throw new Error('sendMessage is not available');
    }

    if (isOnline) {
      return await _sendMessage(recipientId, content);
    }

    // Queue for later sync
    const queuedAction = await addToQueue(OFFLINE_ACTIONS.SEND_MESSAGE, {
      recipientId,
      content,
    });

    // Return optimistic result
    return {
      id: `offline_${queuedAction.id}`,
      sender_id: user?.id,
      recipient_id: recipientId,
      content,
      created_at: new Date().toISOString(),
      read: false,
      _offline: true,
    };
  }, [isOnline, _sendMessage, addToQueue, user]);

  /**
   * Update user profile - works offline
   */
  const updateUserProfile = useCallback(async (updates) => {
    if (!_updateUserProfile) {
      throw new Error('updateUserProfile is not available');
    }

    if (isOnline) {
      return await _updateUserProfile(updates);
    }

    // Queue for later sync
    await addToQueue(OFFLINE_ACTIONS.UPDATE_PROFILE, updates);
    return { success: true, _offline: true };
  }, [isOnline, _updateUserProfile, addToQueue]);

  /**
   * Update client location - works offline
   */
  const updateClientLocation = useCallback(async (latitude, longitude, address) => {
    if (!_updateClientLocation) {
      throw new Error('updateClientLocation is not available');
    }

    if (isOnline) {
      return await _updateClientLocation(latitude, longitude, address);
    }

    // Queue for later sync
    await addToQueue(OFFLINE_ACTIONS.UPDATE_LOCATION, {
      latitude,
      longitude,
      address,
    });
    return { success: true, _offline: true };
  }, [isOnline, _updateClientLocation, addToQueue]);

  return {
    // Wrapped offline-capable actions
    addPickupRequest,
    removePickupRequest,
    updateDriverAssignmentStatus,
    sendMessage,
    updateUserProfile,
    updateClientLocation,

    // Pass through original context
    ...appContext,

    // Network state
    isOnline,
  };
};

export default useOfflineActions;
