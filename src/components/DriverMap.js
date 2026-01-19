import React, { useMemo } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

const COLORS = {
  primary: '#10B981',
  blue: '#3B82F6',
  red: '#EF4444',
  orange: '#F59E0B',
  purple: '#8B5CF6',
  white: '#FFFFFF',
};

// Helper za odredjivanje boje na osnovu preostalog vremena
const getUrgencyColor = (createdAt, maxPickupHours = 48) => {
  if (!createdAt) return '#3B82F6';
  const created = new Date(createdAt);
  const hoursToAdd = maxPickupHours || 48;
  const deadline = new Date(created.getTime() + hoursToAdd * 60 * 60 * 1000);
  const now = new Date();
  const diff = deadline - now;
  if (diff <= 0) return '#EF4444';
  const hoursLeft = diff / (1000 * 60 * 60);
  const percentLeft = hoursLeft / hoursToAdd;
  if (percentLeft <= 0.25) return '#EF4444';
  if (percentLeft <= 0.50) return '#F59E0B';
  return '#10B981';
};

const WASTE_ICONS = {
  cardboard: '📦',
  glass: '🍾',
  plastic: '♻️',
  trash: '🗑️',
};

/**
 * DriverMap - Map component for driver view showing:
 * - Driver's current location (blue truck icon)
 * - Assigned requests (with urgency colors)
 */
const DriverMap = ({
  driverLocation,
  assignments = [],
  onMarkerPress,
  maxPickupHours = 48
}) => {
  // Filter assignments that have valid coordinates
  const validAssignments = assignments.filter(
    (a) => a.latitude && a.longitude && !isNaN(a.latitude) && !isNaN(a.longitude)
  );

  // Calculate center - prefer driver location, fallback to assignments or Belgrade
  const center = useMemo(() => {
    if (driverLocation?.coords) {
      return {
        lat: driverLocation.coords.latitude,
        lng: driverLocation.coords.longitude,
      };
    }

    if (validAssignments.length > 0) {
      const lats = validAssignments.map((a) => a.latitude);
      const lngs = validAssignments.map((a) => a.longitude);
      return {
        lat: (Math.min(...lats) + Math.max(...lats)) / 2,
        lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      };
    }

    // Default to Belgrade, Serbia
    return { lat: 44.8176, lng: 20.4633 };
  }, [driverLocation, validAssignments]);

  // Calculate zoom level
  const getZoomLevel = () => {
    if (validAssignments.length === 0) return 14;
    if (validAssignments.length === 1 && !driverLocation) return 15;

    const points = [...validAssignments.map(a => ({ lat: a.latitude, lng: a.longitude }))];
    if (driverLocation?.coords) {
      points.push({ lat: driverLocation.coords.latitude, lng: driverLocation.coords.longitude });
    }

    const lats = points.map(p => p.lat);
    const lngs = points.map(p => p.lng);
    const latSpread = Math.max(...lats) - Math.min(...lats);
    const lngSpread = Math.max(...lngs) - Math.min(...lngs);
    const maxSpread = Math.max(latSpread, lngSpread);

    if (maxSpread > 0.5) return 10;
    if (maxSpread > 0.2) return 12;
    if (maxSpread > 0.05) return 14;
    return 15;
  };

  // Generate driver marker JavaScript
  const driverMarkerJS = driverLocation?.coords ? `
    // Driver location marker (truck icon)
    var driverIcon = L.divIcon({
      className: 'driver-marker',
      html: '<div class="driver-pin"><span>🚛</span></div><div class="driver-badge">Vi ste ovde</div>',
      iconSize: [60, 70],
      iconAnchor: [30, 60]
    });

    var driverMarker = L.marker([${driverLocation.coords.latitude}, ${driverLocation.coords.longitude}], {
      icon: driverIcon,
      zIndexOffset: 1000 // Always on top
    }).addTo(map);

    // Accuracy circle around driver
    L.circle([${driverLocation.coords.latitude}, ${driverLocation.coords.longitude}], {
      color: '#3B82F6',
      fillColor: '#3B82F6',
      fillOpacity: 0.15,
      radius: ${driverLocation.coords.accuracy || 50},
      weight: 2
    }).addTo(map);
  ` : '';

  // Generate assignment markers JavaScript
  const assignmentMarkersJS = validAssignments.map((assignment, index) => {
    const color = getUrgencyColor(assignment.created_at, maxPickupHours);
    const icon = WASTE_ICONS[assignment.waste_type] || '📦';
    const circleRadius = color === '#EF4444' ? 150 : color === '#F59E0B' ? 100 : 60;
    const badgeContent = (assignment.waste_label || assignment.waste_type || 'Zahtev').substring(0, 12);
    const clientName = (assignment.client_name || 'Klijent').substring(0, 15);

    return `
      // Circle for assignment
      L.circle([${assignment.latitude}, ${assignment.longitude}], {
        color: '${color}',
        fillColor: '${color}',
        fillOpacity: 0.2,
        radius: ${circleRadius},
        weight: 2
      }).addTo(map);

      // Assignment marker
      var assignmentIcon${index} = L.divIcon({
        className: 'assignment-marker',
        html: '<div class="pulse-ring" style="border-color: ${color};"></div><div class="marker-pin" style="background-color: ${color};"><span>${icon}</span></div><div class="assignment-info"><div class="assignment-type" style="background-color: ${color};">${badgeContent}</div><div class="assignment-client">${clientName}</div></div>',
        iconSize: [50, 80],
        iconAnchor: [25, 70]
      });

      var assignmentMarker${index} = L.marker([${assignment.latitude}, ${assignment.longitude}], { icon: assignmentIcon${index} })
        .addTo(map)
        .on('click', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'markerClick',
            assignmentId: '${assignment.id}',
            requestId: '${assignment.request_id}'
          }));
        });
    `;
  }).join('\n');

  // Build fit bounds points
  const allPoints = [...validAssignments.map(a => `[${a.latitude}, ${a.longitude}]`)];
  if (driverLocation?.coords) {
    allPoints.push(`[${driverLocation.coords.latitude}, ${driverLocation.coords.longitude}]`);
  }

  // HTML content for the map
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; }
        #map { width: 100%; height: 100%; }

        /* Driver marker styles */
        .driver-marker {
          position: relative;
        }

        .driver-pin {
          position: absolute;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3B82F6, #1D4ED8);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 4px solid white;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.5);
          top: 0;
          left: 5px;
          animation: driverPulse 2s ease-in-out infinite;
        }

        @keyframes driverPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .driver-pin span {
          font-size: 24px;
        }

        .driver-badge {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          padding: 4px 10px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: bold;
          color: white;
          white-space: nowrap;
          background: linear-gradient(135deg, #3B82F6, #1D4ED8);
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
        }

        /* Assignment marker styles */
        .assignment-marker {
          position: relative;
        }

        .pulse-ring {
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 3px solid;
          top: 5px;
          left: 5px;
          animation: pulse 1.5s ease-out infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }

        .marker-pin {
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          top: 5px;
          left: 5px;
        }

        .marker-pin span {
          font-size: 20px;
        }

        .assignment-info {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .assignment-type {
          padding: 2px 6px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: bold;
          color: white;
          white-space: nowrap;
        }

        .assignment-client {
          padding: 2px 6px;
          border-radius: 6px;
          font-size: 9px;
          font-weight: 500;
          color: #374151;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          white-space: nowrap;
        }

        /* Legend */
        .legend {
          position: fixed;
          top: 10px;
          right: 10px;
          background: rgba(255,255,255,0.95);
          padding: 10px 12px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.15);
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          z-index: 1000;
        }

        .legend-title {
          font-size: 11px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
        }

        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .legend-text {
          font-size: 11px;
          color: #6B7280;
        }

        /* No location message */
        .no-location {
          position: fixed;
          bottom: 20px;
          left: 20px;
          right: 20px;
          background: #FEF3C7;
          border: 1px solid #F59E0B;
          padding: 12px 16px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 1001;
        }

        .no-location-icon {
          font-size: 20px;
        }

        .no-location-text {
          font-size: 13px;
          color: #92400E;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>

      <!-- Legend -->
      <div class="legend">
        <div class="legend-title">Legenda:</div>
        <div class="legend-item">
          <div class="legend-dot" style="background: linear-gradient(135deg, #3B82F6, #1D4ED8);"></div>
          <span class="legend-text">Vasa lokacija</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot" style="background: #10B981;"></div>
          <span class="legend-text">Normalno</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot" style="background: #F59E0B;"></div>
          <span class="legend-text">Uskoro istice</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot" style="background: #EF4444;"></div>
          <span class="legend-text">Hitno</span>
        </div>
      </div>

      ${!driverLocation?.coords ? `
        <div class="no-location">
          <span class="no-location-icon">📍</span>
          <span class="no-location-text">Cekamo vasu lokaciju...</span>
        </div>
      ` : ''}

      <script>
        // Initialize map
        var map = L.map('map', {
          zoomControl: true,
          attributionControl: false
        }).setView([${center.lat}, ${center.lng}], ${getZoomLevel()});

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map);

        // Add driver marker
        ${driverMarkerJS}

        // Add assignment markers
        ${assignmentMarkersJS}

        ${allPoints.length > 1 ? `
          // Fit bounds to show all markers
          var bounds = L.latLngBounds([${allPoints.join(',')}]);
          map.fitBounds(bounds, { padding: [60, 60] });
        ` : ''}
      </script>
    </body>
    </html>
  `;

  // Handle messages from WebView
  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerClick') {
        const assignment = assignments.find(a =>
          a.id === data.assignmentId || a.request_id === data.requestId
        );
        if (assignment && onMarkerPress) {
          onMarkerPress(assignment);
        }
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: htmlContent }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Ucitavanje mape...</Text>
          </View>
        )}
        scrollEnabled={false}
        bounces={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E9',
  },
  webview: {
    flex: 1,
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6B7280',
  },
});

export default DriverMap;
