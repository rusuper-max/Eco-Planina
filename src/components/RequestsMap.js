import React, { useMemo } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

const COLORS = {
  primary: '#10B981',
  red: '#EF4444',
  orange: '#F59E0B',
  white: '#FFFFFF',
};

// Helper za određivanje boje na osnovu preostalog vremena
const getUrgencyColor = (createdAt, maxPickupHours = 48) => {
  if (!createdAt) return '#3B82F6'; // blue default
  const created = new Date(createdAt);
  const hoursToAdd = maxPickupHours || 48;
  const deadline = new Date(created.getTime() + hoursToAdd * 60 * 60 * 1000);
  const now = new Date();
  const diff = deadline - now;
  if (diff <= 0) return '#EF4444'; // red - expired
  const hoursLeft = diff / (1000 * 60 * 60);
  const percentLeft = hoursLeft / hoursToAdd;
  if (percentLeft <= 0.25) return '#EF4444'; // red - urgent
  if (percentLeft <= 0.50) return '#F59E0B'; // orange - warning
  return '#10B981'; // green - normal
};

const WASTE_ICONS = {
  cardboard: '📦',
  glass: '🍾',
  plastic: '♻️',
  trash: '🗑️',
};

const RequestsMap = ({ requests, onMarkerPress, selectedId, mode = 'requests', maxPickupHours = 48 }) => {
  // Filter requests that have valid coordinates
  const validRequests = requests.filter(
    (r) => r.latitude && r.longitude && !isNaN(r.latitude) && !isNaN(r.longitude)
  );

  // Calculate center of all markers
  const center = useMemo(() => {
    if (validRequests.length === 0) {
      // Default to Belgrade, Serbia
      return { lat: 44.8176, lng: 20.4633 };
    }

    const lats = validRequests.map((r) => r.latitude);
    const lngs = validRequests.map((r) => r.longitude);

    return {
      lat: (Math.min(...lats) + Math.max(...lats)) / 2,
      lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    };
  }, [validRequests]);

  // Calculate zoom level based on spread of markers
  const getZoomLevel = () => {
    if (validRequests.length === 0) return 12;
    if (validRequests.length === 1) return 15;

    const lats = validRequests.map((r) => r.latitude);
    const lngs = validRequests.map((r) => r.longitude);
    const latSpread = Math.max(...lats) - Math.min(...lats);
    const lngSpread = Math.max(...lngs) - Math.min(...lngs);
    const maxSpread = Math.max(latSpread, lngSpread);

    if (maxSpread > 0.5) return 10;
    if (maxSpread > 0.2) return 12;
    if (maxSpread > 0.05) return 14;
    return 15;
  };

  // Generate markers JavaScript for Leaflet
  const markersJS = validRequests.map((request, index) => {
    const isClientMode = mode === 'clients';
    const color = isClientMode ? '#3B82F6' : getUrgencyColor(request.created_at, maxPickupHours); // Blue for clients
    const icon = WASTE_ICONS[request.waste_type] || (isClientMode ? '🏢' : '📦');
    // Circle radius based on urgency level
    const urgencyColor = getUrgencyColor(request.created_at, maxPickupHours);
    const circleRadius = isClientMode ? 80 : (urgencyColor === '#EF4444' ? 150 : urgencyColor === '#F59E0B' ? 100 : 60);

    // For clients mode, show client name; for requests mode, show waste type
    const badgeContent = isClientMode
      ? (request.client_name || 'Klijent').substring(0, 15) + ((request.client_name || '').length > 15 ? '...' : '')
      : (request.waste_label || request.waste_type || 'Zahtev').substring(0, 12);

    return `
      // Circle for marker
      L.circle([${request.latitude}, ${request.longitude}], {
        color: '${color}',
        fillColor: '${color}',
        fillOpacity: 0.2,
        radius: ${circleRadius},
        weight: 2
      }).addTo(map);

      // ${isClientMode ? 'Client' : 'Pulsing'} marker
      var markerIcon${index} = L.divIcon({
        className: '${isClientMode ? 'client-marker' : 'pulsing-marker'}',
        html: '${isClientMode ? '' : `<div class="pulse-ring" style="border-color: ${color};"></div>`}<div class="marker-pin" style="background-color: ${color};"><span>${icon}</span></div><div class="${isClientMode ? 'client-badge' : 'urgency-badge'}" style="background-color: ${color};">${badgeContent}</div>',
        iconSize: [50, ${isClientMode ? '70' : '60'}],
        iconAnchor: [25, ${isClientMode ? '60' : '50'}]
      });

      var marker${index} = L.marker([${request.latitude}, ${request.longitude}], { icon: markerIcon${index} })
        .addTo(map)
        .on('click', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'markerClick',
            requestId: '${request.id}'
          }));
        });
    `;
  }).join('\n');

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
        
        /* Pulsing marker styles */
        .pulsing-marker {
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
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
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
        
        .urgency-badge {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          padding: 2px 6px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: bold;
          color: white;
          white-space: nowrap;
        }

        /* Client marker styles */
        .client-marker {
          position: relative;
        }

        .client-badge {
          position: absolute;
          bottom: -5px;
          left: 50%;
          transform: translateX(-50%);
          padding: 3px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
          color: white;
          white-space: nowrap;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        /* Legend */
        .legend {
          position: fixed;
          top: 10px;
          right: 10px;
          background: rgba(255,255,255,0.95);
          padding: 10px 12px;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          z-index: 1000;
        }
        
        .legend-title {
          font-size: 11px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
        }
        
        .legend-items {
          display: flex;
          gap: 10px;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        
        .legend-text {
          font-size: 10px;
          color: #6B7280;
        }

        /* No locations message */
        .no-locations {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255,255,255,0.95);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 1001;
        }
        
        .no-locations-icon {
          font-size: 50px;
          margin-bottom: 10px;
        }
        
        .no-locations-text {
          font-size: 18px;
          font-weight: 600;
          color: #374151;
        }
        
        .no-locations-subtext {
          font-size: 14px;
          color: #6B7280;
          margin-top: 6px;
          text-align: center;
          padding: 0 40px;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      
      <!-- Legend -->
      ${mode === 'clients' ? `
        <div class="legend">
          <div class="legend-title">Klijenti:</div>
          <div class="legend-items">
            <div class="legend-item">
              <div class="legend-dot" style="background: #3B82F6;"></div>
              <span class="legend-text">Lokacija</span>
            </div>
          </div>
        </div>
      ` : `
        <div class="legend">
          <div class="legend-title">Hitnost:</div>
          <div class="legend-items">
            <div class="legend-item">
              <div class="legend-dot" style="background: #EF4444;"></div>
              <span class="legend-text">24h</span>
            </div>
            <div class="legend-item">
              <div class="legend-dot" style="background: #F59E0B;"></div>
              <span class="legend-text">48h</span>
            </div>
            <div class="legend-item">
              <div class="legend-dot" style="background: #10B981;"></div>
              <span class="legend-text">72h</span>
            </div>
          </div>
        </div>
      `}

      ${validRequests.length === 0 ? `
        <div class="no-locations">
          <div class="no-locations-icon">📍</div>
          <div class="no-locations-text">${mode === 'clients' ? 'Nema klijenata sa lokacijama' : 'Nema zahteva sa lokacijama'}</div>
          <div class="no-locations-subtext">${mode === 'clients' ? 'Klijenti će se pojaviti kada se registruju sa lokacijom' : 'Kada klijenti pošalju zahteve, pojaviće se ovde'}</div>
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
        
        // Add markers
        ${markersJS}
        
        ${validRequests.length > 1 ? `
          // Fit bounds to show all markers
          var bounds = L.latLngBounds([
            ${validRequests.map(r => `[${r.latitude}, ${r.longitude}]`).join(',')}
          ]);
          map.fitBounds(bounds, { padding: [50, 50] });
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
        const request = requests.find(r => r.id === data.requestId);
        if (request && onMarkerPress) {
          onMarkerPress(request);
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
            <Text style={styles.loadingText}>Učitavanje mape...</Text>
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

export default RequestsMap;
