import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Shadows, Radii, Spacing } from '../lib/theme';
import { Card, PrimaryButton, SecondaryButton, EmptyState } from '../lib/components';
import { API_URL } from '@env';

export default function RideHistoryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRides, setSelectedRides] = useState([]);

  const serverUrl = (API_URL && API_URL.length > 0) ? API_URL : 'http://localhost:3000';

  const loadRides = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) return;

      const res = await fetch(`${serverUrl}/api/rides?limit=50`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        setRides(data.rides || []);
      }
    } catch (err) {
      console.error('Load rides error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRides();
  }, []);

  const toggleRideSelection = (rideId) => {
    setSelectedRides((prev) =>
      prev.includes(rideId) ? prev.filter((id) => id !== rideId) : [...prev, rideId]
    );
  };

  const handleCompare = async () => {
    if (selectedRides.length < 2) {
      alert('Select at least 2 rides to compare');
      return;
    }

    try {
      const authToken = await AsyncStorage.getItem('authToken');
      const res = await fetch(`${serverUrl}/api/rides/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ rideIds: selectedRides }),
      });

      if (res.ok) {
        const comparison = await res.json();
        navigation.navigate('RideComparison', { comparison });
      }
    } catch (err) {
      console.error('Compare error:', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <Text style={styles.title}>Ride History</Text>
        {selectedRides.length > 1 && (
          <PrimaryButton
            title={`Compare (${selectedRides.length})`}
            onPress={handleCompare}
            small
            style={{ paddingHorizontal: 14 }}
          />
        )}
        {rides.length > 0 && selectedRides.length === 0 && (
          <Text style={styles.hintText}>Tap a ride for details · Long press to compare</Text>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRides(); }} tintColor={Colors.primary} />
        }
      >
        {rides.length === 0 ? (
          <EmptyState icon="📋" title="No rides yet" message="Start your first ride and it will appear here" />
        ) : (
          rides.map((ride) => {
            const isSelected = selectedRides.includes(ride._id);
            return (
              <TouchableOpacity
                key={ride._id}
                style={[styles.rideCard, isSelected && styles.rideCardSelected]}
                onPress={() => navigation.navigate('RideDetail', { rideId: ride._id, ride })}
                onLongPress={() => toggleRideSelection(ride._id)}
                activeOpacity={0.7}
              >
                <View style={styles.rideHeader}>
                  <View style={styles.rideDateBlock}>
                    <Text style={styles.rideDate}>
                      {new Date(ride.start_time).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.rideTime}>
                      {new Date(ride.start_time).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <View style={[styles.scoreBadge, isSelected && styles.scoreBadgeSelected]}>
                    <Text style={[styles.scoreText, isSelected && styles.scoreTextSelected]}>{ride.score ? Math.round(ride.score) : '--'}</Text>
                    <Text style={[styles.scoreUnit, isSelected && styles.scoreUnitSelected]}>pts</Text>
                  </View>
                </View>

                <View style={styles.rideStatsRow}>
                  <View style={styles.rideStat}>
                    <Text style={styles.rideStatIcon}>📏</Text>
                    <Text style={styles.rideStatValue}>{ride.metrics?.distance_km?.toFixed(1) || 0} km</Text>
                  </View>
                  <View style={styles.rideStat}>
                    <Text style={styles.rideStatIcon}>⏱️</Text>
                    <Text style={styles.rideStatValue}>{Math.round(ride.metrics?.duration_minutes || 0)} min</Text>
                  </View>
                  <View style={styles.rideStat}>
                    <Text style={styles.rideStatIcon}>⚡</Text>
                    <Text style={styles.rideStatValue}>{ride.metrics?.average_speed_kmh?.toFixed(0) || 0} km/h</Text>
                  </View>
                  <View style={styles.rideStat}>
                    <Text style={styles.rideStatIcon}>⛽</Text>
                    <Text style={styles.rideStatValue}>₹{ride.fuel_cost?.toFixed(0) || 0}</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  {ride.bike_name ? (
                    <View style={styles.bikeTag}>
                      <Text style={styles.bikeTagText}>🏍️ {ride.bike_name}</Text>
                    </View>
                  ) : null}
                  {ride.route_name ? (
                    <View style={styles.routeTag}>
                      <Text style={styles.routeTagText}>📍 {ride.route_name}</Text>
                    </View>
                  ) : null}
                </View>

                {isSelected && (
                  <View style={styles.selectedIndicator}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                )}
                {!isSelected && <Text style={styles.chevron}>›</Text>}
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    ...Typography.h1,
  },
  listContainer: {
    paddingHorizontal: Spacing.lg,
  },
  hintText: { ...Typography.small, textAlign: 'center', marginBottom: 8, color: Colors.textMuted },
  rideCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.medium,
  },
  rideCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '05',
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rideDateBlock: {},
  rideDate: {
    ...Typography.h3,
    fontSize: 16,
  },
  rideTime: {
    ...Typography.caption,
    marginTop: 2,
  },
  scoreBadge: {
    backgroundColor: Colors.primary + '12',
    borderRadius: Radii.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  scoreBadgeSelected: {
    backgroundColor: Colors.primary,
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },
  scoreUnit: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: -2,
  },
  rideStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.borderLight,
    borderRadius: Radii.sm,
    padding: 12,
    marginBottom: 8,
  },
  rideStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rideStatIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  rideStatValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  bikeTag: { backgroundColor: Colors.primary + '12', borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 3 },
  bikeTagText: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  routeTag: { backgroundColor: Colors.borderLight, borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 3 },
  routeTagText: { fontSize: 11, fontWeight: '500', color: Colors.textSecondary },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  scoreTextSelected: { color: '#fff' },
  scoreUnitSelected: { color: 'rgba(255,255,255,0.8)' },
  chevron: { position: 'absolute', top: 14, right: 12, fontSize: 22, color: Colors.textMuted, fontWeight: '300' },
});
