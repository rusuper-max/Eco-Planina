/**
 * useRouteOptimization - Hook za optimizaciju rute i selekciju za rutu
 * Ekstraktovano iz DriverViewScreen.js radi održivosti
 */
import { useState, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import { getOptimizedRoute } from '../../../utils/routeOptimization';

export const useRouteOptimization = ({ assignments }) => {
  // Route selection state
  const [selectedForRoute, setSelectedForRoute] = useState(new Set());

  // Toggle request selection for route
  const toggleRouteSelection = useCallback((requestId) => {
    setSelectedForRoute(prev => {
      const next = new Set(prev);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        next.add(requestId);
      }
      return next;
    });
  }, []);

  // Select/deselect all visible requests with valid coordinates
  const toggleSelectAllForRoute = useCallback(() => {
    const validIds = assignments
      .filter(r => r.latitude && r.longitude)
      .map(r => r.id);
    const allSelected = validIds.length > 0 && validIds.every(id => selectedForRoute.has(id));

    if (allSelected) {
      setSelectedForRoute(new Set());
    } else {
      setSelectedForRoute(new Set(validIds));
    }
  }, [assignments, selectedForRoute]);

  // Check if all valid requests are selected
  const allValidSelected = (() => {
    const validIds = assignments.filter(r => r.latitude && r.longitude).map(r => r.id);
    return validIds.length > 0 && validIds.every(id => selectedForRoute.has(id));
  })();

  // Open optimized route in Google Maps
  const handleOpenOptimizedRoute = useCallback(() => {
    const selectedRequests = assignments
      .filter(r => selectedForRoute.has(r.id));

    const result = getOptimizedRoute(selectedRequests);

    if (result.error) {
      Alert.alert('Greška', result.error);
      return;
    }

    // Show route info and open
    Alert.alert(
      'Optimizovana ruta',
      `${result.waypointCount} lokacija, ~${result.distance.toFixed(1)} km`,
      [
        { text: 'Otkaži', style: 'cancel' },
        {
          text: 'Otvori u Google Maps',
          onPress: () => Linking.openURL(result.url)
        }
      ]
    );
  }, [assignments, selectedForRoute]);

  // Clear route selection
  const clearRouteSelection = useCallback(() => {
    setSelectedForRoute(new Set());
  }, []);

  return {
    // State
    selectedForRoute,

    // Computed
    allValidSelected,

    // Actions
    toggleRouteSelection,
    toggleSelectAllForRoute,
    handleOpenOptimizedRoute,
    clearRouteSelection,
  };
};

export default useRouteOptimization;
