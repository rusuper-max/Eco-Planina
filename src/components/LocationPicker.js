import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

const LocationPicker = ({ visible, onClose, onSelect, initialLocation }) => {
    const [loading, setLoading] = useState(true);

    // Default to Belgrade if no location provided
    // Use Number() to handle potential string values from database
    const centerLat = initialLocation?.lat ? Number(initialLocation.lat) : 44.8176;
    const centerLng = initialLocation?.lng ? Number(initialLocation.lng) : 20.4633;

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
        
        .center-marker {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -100%);
          z-index: 1000;
          pointer-events: none;
          font-size: 40px;
          margin-top: -10px;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div class="center-marker">📍</div>
      
      <script>
        var map = L.map('map', {
          zoomControl: false,
          attributionControl: false
        }).setView([${centerLat}, ${centerLng}], 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map);

        // Notify React Native about map center changes
        map.on('moveend', function() {
          var center = map.getCenter();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'move',
            lat: center.lat,
            lng: center.lng
          }));
        });
        
        // Initial position
        setTimeout(function() {
          var center = map.getCenter();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'move',
            lat: center.lat,
            lng: center.lng
          }));
        }, 500);

      </script>
    </body>
    </html>
  `;

    // Track current center
    const [currentLocation, setCurrentLocation] = useState({
        lat: centerLat,
        lng: centerLng
    });

    const handleMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'move') {
                setCurrentLocation({ lat: data.lat, lng: data.lng });
            }
        } catch (error) {
            console.error('Error parsing map message:', error);
        }
    };

    const handleConfirm = async () => {
        // Reverse geocode to get address
        try {
            setLoading(true);
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentLocation.lat}&lon=${currentLocation.lng}&zoom=18&addressdetails=1`,
                {
                    headers: {
                        'User-Agent': 'EcoLogistics/1.0'
                    }
                }
            );
            const data = await response.json();
            onSelect({
                lat: currentLocation.lat,
                lng: currentLocation.lng,
                address: data.display_name || 'Selected Location'
            });
        } catch (error) {
            // Fallback if geocoding fails
            onSelect({
                lat: currentLocation.lat,
                lng: currentLocation.lng,
                address: `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Text style={styles.closeText}>Otkaži</Text>
                    </TouchableOpacity>
                    <Text style={styles.minititle}>Pomeri mapu da izabereš</Text>
                    <View style={{ width: 60 }} />
                </View>

                <View style={styles.mapContainer}>
                    <WebView
                        source={{ html: htmlContent }}
                        style={styles.webview}
                        onMessage={handleMessage}
                        onLoadEnd={() => setLoading(false)}
                    />
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                        <Text style={styles.confirmText}>Potvrdi Lokaciju</Text>
                    </TouchableOpacity>
                </View>

                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#10B981" />
                    </View>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    header: {
        height: 60,
        backgroundColor: 'white',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        marginTop: 40, // Safe area
    },
    minititle: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    closeText: {
        color: '#EF4444',
        fontSize: 16,
    },
    mapContainer: {
        flex: 1,
    },
    webview: {
        flex: 1,
    },
    footer: {
        padding: 20,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingBottom: 40,
    },
    confirmBtn: {
        backgroundColor: '#10B981',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
    }
});

export default LocationPicker;
