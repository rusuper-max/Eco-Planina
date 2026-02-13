/**
 * useDriverHistory - Hook za istoriju dostava vozača
 * Ekstraktovano iz DriverViewScreen.js radi održivosti
 */
import { useState, useCallback } from 'react';

export const useDriverHistory = ({ fetchDriverHistory }) => {
  // History state
  const [historyItems, setHistoryItems] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  // Load history
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const history = await fetchDriverHistory();
      setHistoryItems(history || []);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoadingHistory(false);
    }
  }, [fetchDriverHistory]);

  // Open history detail modal
  const openHistoryDetail = useCallback((item) => {
    setSelectedHistoryItem(item);
  }, []);

  // Close history detail modal
  const closeHistoryDetail = useCallback(() => {
    setSelectedHistoryItem(null);
  }, []);

  // Format date for history
  const formatHistoryDate = useCallback((dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Check if item is retroactive (no assigned_at and no picked_up_at)
  const isRetroactiveItem = useCallback((item) => {
    return item.source === 'processed_request' ||
      (!item.assigned_at && !item.picked_up_at);
  }, []);

  return {
    // State
    historyItems,
    loadingHistory,
    selectedHistoryItem,

    // Actions
    loadHistory,
    openHistoryDetail,
    closeHistoryDetail,

    // Helpers
    formatHistoryDate,
    isRetroactiveItem,
  };
};

export default useDriverHistory;
