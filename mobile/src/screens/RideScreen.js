import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Polyline, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { computeRideMetrics, estimateFuelCost, computeRideScore } from '../lib/rideUtils';
import { FUEL_EFFICIENCY_KM_PER_L, FUEL_PRICE_PER_L, API_URL } from '@env';
import { startBackgroundTracking, stopBackgroundTracking, getInProgressRide, requestTrackingPermissions } from '../lib/background';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Shadows, Radii, Spacing } from '../lib/theme';

export default function RideScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tracking, setTracking] = useState(false);
  const [points, setPoints] = useState([]);
  const [region, setRegion] = useState(null);
  const [saving, setSaving] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [userBikes, setUserBikes] = useState([]);
  const [selectedBike, setSelectedBike] = useState(null);
  const [bgTrackingActive, setBgTrackingActive] = useState(false);
  const foregroundIntervalRef = useRef(null);
  const timerRef = useRef(null);
  const pointsRef = useRef([]);

  const serverUrl = (API_URL && API_URL.length > 0) ? API_URL : 'http://localhost:3000';

  // Keep ref in sync with state for cleanup
  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  useEffect(() => {
    (async () => {
      // Load user's bikes
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const u = JSON.parse(userData);
          const b = u.bikes || [];
          setUserBikes(b);
          const active = b.find(x => x.bike_id === u.active_bike_id) || b[0] || null;
          setSelectedBike(active);
        }
      } catch (e) { console.warn('Load bikes error', e.message); }

      // Request all location permissions (foreground + background)
      const perm = await requestTrackingPermissions();
      if (!perm.granted) {
        const msg = perm.reason === 'background'
          ? 'Background location permission is needed to record your ride even when the app is minimized. Please enable it in Settings.'
          : 'Location permission is required to track rides.';
        Alert.alert('Permission required', msg);
        return;
      }

      // Check for in-progress ride
      const inProg = await getInProgressRide();
      if (inProg && inProg.points && inProg.points.length > 0) {
        Alert.alert('Resume ride', 'An in-progress ride was found. Resume or discard?', [
          {
            text: 'Discard',
            onPress: async () => {
              await AsyncStorage.removeItem('in_progress_ride');
              await stopBackgroundTracking();
            }
          },
          {
            text: 'Resume',
            onPress: () => {
              setPoints(inProg.points);
              pointsRef.current = inProg.points;
              // Auto-start tracking
              startTracking();
            }
          },
        ]);
      }
    })();

    return () => {
      cleanupTracking();
    };
  }, []);

  const cleanupTracking = () => {
    if (foregroundIntervalRef.current) {
      clearInterval(foregroundIntervalRef.current);
      foregroundIntervalRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const sampleLocation = useCallback((loc) => {
    const point = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      timestamp: Date.now(),
      speed_kmh: loc.coords.speed != null ? loc.coords.speed * 3.6 : 0,
    };
    setPoints((prev) => {
      // Deduplicate: skip if last point is < 1 second and < 5 meters ago
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        const dt = (point.timestamp - last.timestamp) / 1000;
        if (dt < 1) return prev;
      }
      return [...prev, point];
    });
    setRegion({ latitude: point.latitude, longitude: point.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
  }, []);

  async function startTracking() {
    // Require at least one bike selected
    if (!selectedBike) {
      Alert.alert(
        'No bike selected',
        'Please add at least one bike in your Profile → Garage and select it before starting a ride.',
        [
          { text: 'Cancel' },
          { text: 'Go to Profile', onPress: () => navigation.navigate('MainTabs', { screen: 'Profile' }) },
        ]
      );
      return;
    }

    setPoints([]);
    pointsRef.current = [];
    setElapsedTime(0);
    setTracking(true);

    // Start timer
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    // Start background tracking (for when user minimizes)
    const bgStarted = await startBackgroundTracking();
    setBgTrackingActive(bgStarted);

    // Also start foreground interval (for live stats when app is open)
    // Take an initial reading
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      sampleLocation(loc);
    } catch (err) {
      console.error('Get initial location error:', err);
    }

    // Foreground polling every 3 seconds — always run this so live stats update
    foregroundIntervalRef.current = setInterval(async () => {
      try {
        const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        sampleLocation(p);
      } catch (err) {
        console.error('Sample location error:', err);
      }
    }, 3000);
  }

  async function stopTracking() {
    cleanupTracking();
    setTracking(false);

    // Stop background task and get its points
    const bgPoints = await stopBackgroundTracking();
    setBgTrackingActive(false);

    // Merge foreground points with background points, deduplicate by timestamp proximity
    const fgPoints = pointsRef.current;
    let allPoints = [...fgPoints];

    if (bgPoints && bgPoints.length > 0) {
      for (const bgPt of bgPoints) {
        // Check if this bg point is already covered by a foreground point
        const isDuplicate = allPoints.some(
          (fgPt) => Math.abs(fgPt.timestamp - bgPt.timestamp) < 2000 // 2 second window
        );
        if (!isDuplicate) {
          allPoints.push({
            latitude: bgPt.latitude,
            longitude: bgPt.longitude,
            timestamp: bgPt.timestamp,
            speed_kmh: bgPt.speed || bgPt.speed_kmh || 0,
          });
        }
      }
      // Sort by timestamp
      allPoints.sort((a, b) => a.timestamp - b.timestamp);
    }

    if (allPoints.length < 2) {
      Alert.alert('No ride recorded', 'Ride was too short to record.');
      setSaving(false);
      return;
    }

    setSaving(true);

    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        Alert.alert('Error', 'Not authenticated');
        setSaving(false);
        return;
      }

      const rawMetrics = computeRideMetrics(allPoints);
      const user = JSON.parse(await AsyncStorage.getItem('user'));

      // Map mobile metrics to server field names
      const metrics = {
        distance_km: rawMetrics.distance_km,
        duration_minutes: Math.round((rawMetrics.duration_s / 60) * 100) / 100,
        average_speed_kmh: rawMetrics.avg_speed_kmh,
        top_speed_kmh: rawMetrics.top_speed_kmh,
        traffic_stops: rawMetrics.stops,
        idle_time_minutes: Math.round((rawMetrics.idle_time_s / 60) * 100) / 100,
        duration_s: rawMetrics.duration_s,
      };

      // Use selected bike's fuel data if available
      const bikeFuelEff = selectedBike?.fuel_efficiency_kmpl || user?.fuel_efficiency_kmpl || 40;
      const bikeFuelPrice = selectedBike?.fuel_price_per_liter || user?.fuel_price_per_liter || 90;
      const fuelCost = estimateFuelCost(metrics.distance_km, bikeFuelEff, bikeFuelPrice);
      const scoreObj = computeRideScore(rawMetrics);
      const score = typeof scoreObj === 'object' ? scoreObj.total_score : scoreObj;
      const scoreBreakdown = typeof scoreObj === 'object' ? scoreObj.breakdown : null;

      const bikeName = selectedBike ? (selectedBike.nickname || `${selectedBike.make} ${selectedBike.model}`.trim() || '') : '';

      const response = await fetch(`${serverUrl}/api/rides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          metrics,
          geo: allPoints,
          fuel_cost: fuelCost,
          score,
          score_breakdown: scoreBreakdown,
          route_name: 'Tracked Route',
          ride_type: 'commute',
          bike_id: selectedBike?.bike_id || null,
          bike_name: bikeName,
        }),
      });

      if (!response.ok) throw new Error('Failed to save ride');
      const rideData = await response.json();

      // Update streak
      await fetch(`${serverUrl}/api/gamification/streak/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ rideDate: new Date().toISOString() }),
      });

      // Check achievements
      await fetch(`${serverUrl}/api/gamification/achievements/check`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      Alert.alert(
        'Ride Saved! 🎉',
        `Distance: ${metrics.distance_km.toFixed(1)} km\nDuration: ${Math.round(metrics.duration_s / 60)} min\nScore: ${Math.round(score)}/100\nFuel Cost: ₹${fuelCost.toFixed(0)}`,
        [{ text: 'OK', onPress: () => navigation.navigate('MainTabs', { screen: 'Home', params: { refreshRide: true } }) }]
      );

      setPoints([]);
      pointsRef.current = [];
      await AsyncStorage.removeItem('in_progress_ride');
    } catch (err) {
      console.error('Save ride error:', err);
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? hrs + 'h ' : ''}${mins}m ${secs}s`;
  };

  const metricsPreview = points.length >= 2 ? computeRideMetrics(points) : null;
  const scorePreview = metricsPreview ? computeRideScore(metricsPreview) : null;

  return (
    <View style={{ flex: 1 }}>
      <MapView style={{ flex: 1 }} region={region} showsUserLocation followsUserLocation>
        {points.length > 0 && (
          <Polyline
            coordinates={points.map((p) => ({ latitude: p.latitude, longitude: p.longitude }))}
            strokeWidth={4}
            strokeColor={Colors.primary}
          />
        )}
        {points.length > 0 && (
          <Marker coordinate={{ latitude: points[0].latitude, longitude: points[0].longitude }} title="Start" pinColor="green" />
        )}
        {points.length > 0 && (
          <Marker
            coordinate={{
              latitude: points[points.length - 1].latitude,
              longitude: points[points.length - 1].longitude,
            }}
            title="Current"
            pinColor="red"
          />
        )}
      </MapView>

      {/* Back Button Overlay */}
      {!tracking && (
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 12 }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
      )}

      {/* Tracking indicator */}
      {tracking && bgTrackingActive && (
        <View style={[styles.bgIndicator, { top: insets.top + 12 }]}>
          <View style={styles.bgDot} />
          <Text style={styles.bgText}>Recording{Platform.OS === 'ios' ? ' — continues in background' : ''}</Text>
        </View>
      )}

      {/* Bottom Panel */}
      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 16 }]}>
        {/* Live Stats */}
        {tracking && (
          <View style={styles.liveStats}>
            <Text style={styles.timer}>{formatTime(elapsedTime)}</Text>
            {metricsPreview && (
              <View style={styles.statsRow}>
                <View style={styles.statPill}>
                  <Text style={styles.statPillText}>📏 {metricsPreview.distance_km.toFixed(2)} km</Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statPillText}>⚡ {metricsPreview.avg_speed_kmh.toFixed(0)} km/h</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Bike Selector — only shown when not tracking */}
        {!tracking && userBikes.length > 0 && (
          <View style={styles.bikeSelector}>
            <Text style={styles.bikeSelectorLabel}>Riding:</Text>
            <View style={styles.bikePills}>
              {userBikes.map((bike) => {
                const isSelected = selectedBike?.bike_id === bike.bike_id;
                const label = bike.nickname || bike.model || bike.make || 'Bike';
                return (
                  <TouchableOpacity
                    key={bike.bike_id}
                    style={[styles.bikePill, isSelected && styles.bikePillActive]}
                    onPress={() => setSelectedBike(bike)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.bikePillText, isSelected && styles.bikePillTextActive]}>🏍️ {label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* No bike warning */}
        {!tracking && userBikes.length === 0 && (
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 13, color: Colors.error, fontWeight: '600' }}>
              ⚠️ Add a bike in Profile → Garage first
            </Text>
          </View>
        )}

        {/* Start/Stop Button */}
        <TouchableOpacity
          style={[styles.actionBtn, tracking ? styles.stopBtn : (!selectedBike ? styles.startBtnDisabled : styles.startBtn)]}
          onPress={() => (tracking ? stopTracking() : startTracking())}
          activeOpacity={0.85}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.actionBtnText}>{tracking ? '⏹  Stop Ride' : '▶  Start Ride'}</Text>
          )}
        </TouchableOpacity>

        {/* Ride Summary after stopping */}
        {metricsPreview && !tracking && !saving && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Ride Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{metricsPreview.distance_km.toFixed(1)}</Text>
                <Text style={styles.summaryLabel}>km</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{Math.round(metricsPreview.duration_s / 60)}</Text>
                <Text style={styles.summaryLabel}>min</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{metricsPreview.avg_speed_kmh.toFixed(0)}</Text>
                <Text style={styles.summaryLabel}>km/h avg</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{scorePreview}</Text>
                <Text style={styles.summaryLabel}>score</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Saving Overlay */}
      {saving && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Saving ride...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.medium,
  },
  backButtonText: {
    fontSize: 28,
    color: Colors.text,
    fontWeight: '300',
    marginTop: -2,
  },
  bgIndicator: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bgDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginRight: 8,
  },
  bgText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    ...Shadows.large,
  },
  liveStats: {
    alignItems: 'center',
    marginBottom: 12,
  },
  timer: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    backgroundColor: Colors.borderLight,
    borderRadius: Radii.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  statPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  bikeSelector: { marginBottom: 10 },
  bikeSelectorLabel: { ...Typography.small, marginBottom: 6 },
  bikePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bikePill: {
    backgroundColor: Colors.borderLight, borderRadius: Radii.full,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  bikePillActive: { backgroundColor: Colors.primary + '15', borderColor: Colors.primary },
  bikePillText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  bikePillTextActive: { color: Colors.primary, fontWeight: '700' },
  actionBtn: {
    borderRadius: Radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtn: {
    backgroundColor: Colors.primary,
    ...Shadows.primary,
  },
  startBtnDisabled: {
    backgroundColor: Colors.primary + '60',
  },
  stopBtn: {
    backgroundColor: Colors.error,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  actionBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  summaryCard: {
    backgroundColor: Colors.borderLight,
    borderRadius: Radii.md,
    padding: 14,
    marginTop: 12,
  },
  summaryTitle: {
    ...Typography.label,
    marginBottom: 10,
    fontSize: 13,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  summaryLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
});
