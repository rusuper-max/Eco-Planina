/**
 * useHistoryOperations - Hook za operacije sa istorijom zahteva
 * Ekstraktovano iz Dashboard.jsx
 */
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useHistoryOperations = ({
  fetchProcessedRequests,
  updateProcessedRequest: updateProcessedRequestApi,
  deleteProcessedRequest: deleteProcessedRequestApi
}) => {
  const [processedRequests, setProcessedRequests] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyCount, setHistoryCount] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Load history page
  const loadHistoryPage = useCallback(async (page) => {
    setHistoryLoading(true);
    try {
      const result = await fetchProcessedRequests({ page, pageSize: 10 });
      setProcessedRequests(result.data || []);
      setHistoryCount(result.count || 0);
      setHistoryTotalPages(result.totalPages || 1);
      setHistoryPage(page);
    } catch (error) {
      console.error(error);
    } finally {
      setHistoryLoading(false);
    }
  }, [fetchProcessedRequests]);

  // Edit processed request
  const handleEditProcessedRequest = useCallback(async (id, updates) => {
    try {
      await updateProcessedRequestApi(id, updates);
      const result = await fetchProcessedRequests({ page: historyPage });
      setProcessedRequests(result.data || []);
    } catch (err) {
      toast.error('Greška pri ažuriranju: ' + err.message);
    }
  }, [updateProcessedRequestApi, fetchProcessedRequests, historyPage]);

  // Delete processed request
  const handleDeleteProcessedRequest = useCallback(async (id) => {
    const previous = processedRequests;
    setProcessedRequests(prev => prev.filter(r => r.id !== id)); // Optimistic
    try {
      await deleteProcessedRequestApi(id);
      const result = await fetchProcessedRequests({ page: historyPage });
      setProcessedRequests(result.data || []);
      setHistoryCount(result.count);
      toast.success('Zahtev je obrisan iz istorije');
    } catch (err) {
      setProcessedRequests(previous); // Rollback
      toast.error('Greška pri brisanju: ' + (err.message || 'Nepoznata greška'));
    }
  }, [processedRequests, deleteProcessedRequestApi, fetchProcessedRequests, historyPage]);

  // Refresh history
  const refreshHistory = useCallback(async () => {
    const result = await fetchProcessedRequests({ page: historyPage });
    if (result?.data) {
      setProcessedRequests(result.data);
      setHistoryCount(result.count || 0);
      setHistoryTotalPages(result.totalPages || 1);
    }
  }, [fetchProcessedRequests, historyPage]);

  return {
    processedRequests,
    setProcessedRequests,
    historyPage,
    setHistoryPage,
    historyTotalPages,
    setHistoryTotalPages,
    historyCount,
    setHistoryCount,
    historyLoading,
    setHistoryLoading,
    loadHistoryPage,
    handleEditProcessedRequest,
    handleDeleteProcessedRequest,
    refreshHistory
  };
};

export default useHistoryOperations;
