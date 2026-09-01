import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../lib/theme';
import { API_URL } from '@env';

export default function MonthlyWrappedScreen() {
  const [wrapped, setWrapped] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);

  const serverUrl = (API_URL && API_URL.length > 0) ? API_URL : 'http://localhost:3000';

  const loadWrapped = async (month = null, year = null) => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) return;

      let url = `${serverUrl}/api/community/wrapped`;
      if (month) url += `?month=${month}&year=${year}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (res.ok) {
        const data = await res.json();
        setWrapped(data.wrapped);
      } else {
        console.warn('No data for this month');
        setWrapped(null);
      }
    } catch (err) {
      console.error('Load wrapped error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const now = new Date();
    setSelectedMonth(now.getMonth() + 1);
    loadWrapped();
  }, []);

  const handleMonthChange = (direction) => {
    let newMonth = selectedMonth + direction;
    let year = new Date().getFullYear();

    if (newMonth > 12) {
      newMonth = 1;
      year += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      year -= 1;
    }

    setSelectedMonth(newMonth);
    loadWrapped(newMonth, year);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!wrapped) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>📦 Monthly Wrapped</Text>
        <Text style={styles.noData}>No data for this month yet. Start riding to generate your monthly summary!</Text>
      </ScrollView>
    );
  }

  const monthName = new Date(2024, selectedMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadWrapped(); }} />}
    >
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={() => handleMonthChange(-1)}>
          <Text style={styles.navButton}>◀️</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{monthName}</Text>
        <TouchableOpacity onPress={() => handleMonthChange(1)}>
          <Text style={styles.navButton}>▶️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Your Riding Story</Text>
        <Text style={styles.heroStat}>{wrapped.total_rides}</Text>
        <Text style={styles.heroLabel}>rides this month</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📏</Text>
          <Text style={styles.statValue}>{wrapped.total_distance_km.toFixed(0)}</Text>
          <Text style={styles.statLabel}>km covered</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>⏱️</Text>
          <Text style={styles.statValue}>{Math.round(wrapped.total_riding_time_minutes)}</Text>
          <Text style={styles.statLabel}>minutes riding</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>⛽</Text>
          <Text style={styles.statValue}>₹{wrapped.total_fuel_cost.toFixed(0)}</Text>
          <Text style={styles.statLabel}>fuel cost</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📊</Text>
          <Text style={styles.statValue}>{wrapped.average_ride_score.toFixed(0)}</Text>
          <Text style={styles.statLabel}>avg score</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎯 Your Best Rides</Text>
        <View style={styles.cardContent}>
          <View style={styles.recordRow}>
            <Text style={styles.recordLabel}>🏆 Best Ride</Text>
            <Text style={styles.recordValue}>Score: {wrapped.best_ride_score?.toFixed(0) || '--'}</Text>
          </View>
          <View style={styles.recordRow}>
            <Text style={styles.recordLabel}>📍 Most Used Route</Text>
            <Text style={styles.recordValue}>{wrapped.most_used_route}</Text>
          </View>
          <View style={styles.recordRow}>
            <Text style={styles.recordLabel}>🛣️ Longest Ride</Text>
            <Text style={styles.recordValue}>{wrapped.longest_ride_distance?.toFixed(1) || '--'} km</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📈 Your Percentiles</Text>
        <View style={styles.cardContent}>
          <View style={styles.percentileRow}>
            <Text style={styles.percentileLabel}>🎯 Smoothness</Text>
            <View style={styles.percentileBar}>
              <View
                style={[
                  styles.percentileFill,
                  { width: `${wrapped.smoothness_percentile || 0}%` }
                ]}
              />
            </View>
            <Text style={styles.percentileValue}>{wrapped.smoothness_percentile || 0}%</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.shareButton}>
        <Text style={styles.shareButtonText}>📸 Share Your Wrapped</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000'
  },
  navButton: {
    fontSize: 24,
    padding: 8
  },
  noData: {
    textAlign: 'center',
    color: Colors.muted,
    marginTop: 40,
    fontSize: 14
  },
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center'
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8
  },
  heroStat: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff'
  },
  heroLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4
  },
  statLabel: {
    fontSize: 11,
    color: Colors.muted,
    textAlign: 'center'
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12
  },
  cardContent: {},
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)'
  },
  recordLabel: {
    fontSize: 14,
    color: '#000'
  },
  recordValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary
  },
  percentileRow: {
    marginBottom: 16
  },
  percentileLabel: {
    fontSize: 14,
    color: '#000',
    marginBottom: 8
  },
  percentileBar: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4
  },
  percentileFill: {
    height: '100%',
    backgroundColor: Colors.primary
  },
  percentileValue: {
    fontSize: 12,
    color: Colors.muted
  },
  shareButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 30
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  }
});
