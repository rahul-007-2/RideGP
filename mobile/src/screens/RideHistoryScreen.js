import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../lib/theme';
import { API_URL } from '@env';

export default function RideHistoryScreen({ navigation }) {
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
        headers: { 'Authorization': `Bearer ${authToken}` }
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
    setSelectedRides(prev =>
      prev.includes(rideId)
        ? prev.filter(id => id !== rideId)
        : [...prev, rideId]
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
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ rideIds: selectedRides })
      });

      if (res.ok) {
        const comparison = await res.json();
        navigation.navigate('RideComparison', { comparison });
      }
    } catch (err) {
      console.error('Compare error:', err);
      alert('Failed to compare rides');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📋 Ride History</Text>
        {selectedRides.length > 1 && (
          <TouchableOpacity style={styles.compareButton} onPress={handleCompare}>
            <Text style={styles.compareButtonText}>Compare ({selectedRides.length})</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRides(); }} />}
      >
        {rides.length === 0 ? (
          <Text style={styles.noData}>No rides yet. Start your first ride!</Text>
        ) : (
          rides.map((ride) => (
            <TouchableOpacity
              key={ride._id}
              style={[
                styles.rideCard,
                selectedRides.includes(ride._id) && styles.rideCardSelected
              ]}
              onPress={() => toggleRideSelection(ride._id)}
            >
              <View style={styles.rideHeader}>
                <Text style={styles.rideDate}>
                  {new Date(ride.start_time).toLocaleDateString()} {new Date(ride.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={styles.rideScore}>{ride.score ? Math.round(ride.score) : '--'}</Text>
              </View>

              <View style={styles.rideDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>📏</Text>
                  <Text style={styles.detailValue}>{ride.metrics?.distance_km?.toFixed(1) || 0} km</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>⏱️</Text>
                  <Text style={styles.detailValue}>{Math.round(ride.metrics?.duration_minutes || 0)} min</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>⚡</Text>
                  <Text style={styles.detailValue}>{ride.metrics?.average_speed_kmh?.toFixed(0) || 0} km/h</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>⛽</Text>
                  <Text style={styles.detailValue}>₹{ride.fuel_cost?.toFixed(0) || 0}</Text>
                </View>
              </View>

              {ride.route_name && (
                <Text style={styles.routeName}>📍 {ride.route_name}</Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000'
  },
  compareButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  compareButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12
  },
  listContainer: {
    flex: 1
  },
  noData: {
    textAlign: 'center',
    color: Colors.muted,
    marginTop: 40,
    fontSize: 14
  },
  rideCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  rideCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(59, 209, 227, 0.05)'
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  rideDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000'
  },
  rideScore: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary
  },
  rideDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  detailItem: {
    alignItems: 'center',
    flex: 1
  },
  detailLabel: {
    fontSize: 14,
    marginBottom: 2
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000'
  },
  routeName: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 4
  }
});
