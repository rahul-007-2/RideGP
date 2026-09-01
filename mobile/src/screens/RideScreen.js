import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { computeRideMetrics, estimateFuelCost, computeRideScore } from '../lib/rideUtils';
import { FUEL_EFFICIENCY_KM_PER_L, FUEL_PRICE_PER_L, API_URL } from '@env';
import { startBackgroundTracking, stopBackgroundTracking, getInProgressRide } from '../lib/background';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../lib/theme';

export default function RideScreen({ navigation }) {
  const [tracking, setTracking] = useState(false);
  const [points, setPoints] = useState([]);
  const [region, setRegion] = useState(null);
  const [saving, setSaving] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const watchRef = useRef(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);

  const serverUrl = (API_URL && API_URL.length > 0) ? API_URL : 'http://localhost:3000';

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Location permission is required to track rides');
      }
      // check for in-progress ride from crash
      const inProg = await getInProgressRide();
      if (inProg && inProg.points && inProg.points.length > 0) {
        Alert.alert('Resume ride', 'An in-progress ride was found. Resume collecting or discard?', [
          { text: 'Discard', onPress: async () => { await AsyncStorage.removeItem('in_progress_ride'); } },
          { text: 'Resume', onPress: () => setPoints(inProg.points) }
        ]);
      }
    })();
    return () => {
      stopTracking();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function sampleLocation(loc) {
    const point = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      timestamp: Date.now(),
      speed_kmh: loc.coords.speed != null ? loc.coords.speed * 3.6 : 0 // m/s to km/h
    };
    setPoints(prev => [...prev, point]);
    setRegion({ latitude: point.latitude, longitude: point.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
  }

  async function startTracking() {
    setPoints([]);
    setElapsedTime(0);
    setTracking(true);
    startTimeRef.current = Date.now();

    // Start timer
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    const started = await startBackgroundTracking();
    if (!started) {
      // fallback to foreground sampling
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
        sampleLocation(loc);
      } catch (err) {
        console.error('Get location error:', err);
      }

      intervalRef.current = setInterval(async () => {
        try {
          const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          sampleLocation(p);
        } catch (err) {
          console.error('Sample location error:', err);
        }
      }, 4000);
    }
  }

  async function stopTracking() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTracking(false);

    // stop background tracking and collect saved points
    const bgPoints = await stopBackgroundTracking();
    const allPoints = (points || []).concat(bgPoints || []);

    if (allPoints.length < 2) {
      return Alert.alert('No ride recorded', 'Ride was too short to record.');
    }

    setSaving(true);

    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        Alert.alert('Error', 'Not authenticated');
        setSaving(false);
        return;
      }

      const metrics = computeRideMetrics(allPoints);
      const user = JSON.parse(await AsyncStorage.getItem('user'));
      const fuelCost = estimateFuelCost(
        metrics.distance_km,
        user?.fuel_efficiency_kmpl || 40,
        user?.fuel_price_per_liter || 90
      );
      const scoreObj = computeRideScore(metrics);

      // Save to backend
      const response = await fetch(`${serverUrl}/api/rides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          metrics,
          geo: allPoints,
          fuel_cost: fuelCost,
          score: scoreObj.total_score,
          route_name: 'Tracked Route',
          ride_type: 'commute'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save ride');
      }

      const data = await response.json();

      // Update streak
      await fetch(`${serverUrl}/api/gamification/streak/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ rideDate: new Date().toISOString() })
      });

      // Check achievements
      await fetch(`${serverUrl}/api/gamification/achievements/check`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      Alert.alert(
        'Ride Saved! 🎉',
        `Distance: ${metrics.distance_km.toFixed(1)} km\nDuration: ${Math.round(metrics.duration_minutes)} min\nScore: ${Math.round(scoreObj.total_score)}/100\nFuel Cost: ₹${fuelCost.toFixed(0)}`,
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );

      setPoints([]);
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
      <MapView
        style={{ flex: 1 }}
        region={region}
        showsUserLocation
        followsUserLocation
      >
        {points.length > 0 && (
          <Polyline
            coordinates={points.map(p => ({ latitude: p.latitude, longitude: p.longitude }))}
            strokeWidth={4}
            strokeColor={Colors.primary}
          />
        )}
        {points.length > 0 && (
          <Marker coordinate={{ latitude: points[0].latitude, longitude: points[0].longitude }} title="Start" pinColor="green" />
        )}
        {points.length > 0 && (
          <Marker coordinate={{ latitude: points[points.length - 1].latitude, longitude: points[points.length - 1].longitude }} title="Current" pinColor="red" />
        )}
      </MapView>

      <View style={[styles.controls, { backgroundColor: Colors.card }]}>
        {tracking && (
          <View style={styles.liveStats}>
            <Text style={styles.timer}>{formatTime(elapsedTime)}</Text>
            {metricsPreview && (
              <View style={styles.statsRow}>
                <Text style={styles.stat}>📏 {metricsPreview.distance_km.toFixed(2)} km</Text>
                <Text style={styles.stat}>⚡ {metricsPreview.average_speed_kmh.toFixed(0)} km/h</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Button
            title={saving ? 'Saving...' : (tracking ? '⏹️ Stop Ride' : '▶️ Start Ride')}
            onPress={() => (tracking ? stopTracking() : startTracking())}
            color={tracking ? '#ff3b30' : Colors.primary}
            disabled={saving}
          />
        </View>

        {metricsPreview && !tracking && (
          <View style={styles.metricsPreview}>
            <Text style={styles.metricsTitle}>Ride Summary</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{metricsPreview.distance_km.toFixed(1)}</Text>
                <Text style={styles.metricLabel}>km</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{Math.round(metricsPreview.duration_minutes)}</Text>
                <Text style={styles.metricLabel}>min</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{metricsPreview.average_speed_kmh.toFixed(0)}</Text>
                <Text style={styles.metricLabel}>avg km/h</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{Math.round(scorePreview?.total_score || 0)}</Text>
                <Text style={styles.metricLabel}>score</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {saving && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Saving ride...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20
  },
  liveStats: {
    marginBottom: 12,
    alignItems: 'center'
  },
  timer: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%'
  },
  stat: {
    fontSize: 12,
    color: '#666'
  },
  buttonContainer: {
    marginBottom: 12
  },
  metricsPreview: {
    backgroundColor: 'rgba(59, 209, 227, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12
  },
  metricsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000'
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  metricItem: {
    alignItems: 'center'
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary
  },
  metricLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14
  }
});
