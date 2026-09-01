import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, headerStyle } from '../lib/theme';
import { API_URL } from '@env';

export default function HomeScreen({ navigation, useFocusEffect }) {
  const [user, setUser] = useState(null);
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayRide, setTodayRide] = useState(null);
  const [weeklyStats, setWeeklyStats] = useState(null);

  const serverUrl = (API_URL && API_URL.length > 0) ? API_URL : 'http://localhost:3000';

  const loadDashboardData = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      const userData = await AsyncStorage.getItem('user');

      if (!authToken || !userData) {
        navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
        return;
      }

      setUser(JSON.parse(userData));

      // Get streak info
      const streakRes = await fetch(`${serverUrl}/api/gamification/streak`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (streakRes.ok) {
        setStreak((await streakRes.json()).streak);
      }

      // Get today's ride
      const ridesRes = await fetch(`${serverUrl}/api/rides?limit=1`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (ridesRes.ok) {
        const data = await ridesRes.json();
        const today = new Date();
        const todayRide = data.rides.find(r => {
          const rideDate = new Date(r.start_time);
          return rideDate.getDate() === today.getDate() &&
                 rideDate.getMonth() === today.getMonth() &&
                 rideDate.getFullYear() === today.getFullYear();
        });
        setTodayRide(todayRide);
      }

      // Get this week's stats
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const weeklyRes = await fetch(
        `${serverUrl}/api/rides/history/range?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`,
        { headers: { 'Authorization': `Bearer ${authToken}` } }
      );
      if (weeklyRes.ok) {
        const data = await weeklyRes.json();
        const rides = data.rides || [];
        const stats = {
          total_distance: rides.reduce((sum, r) => sum + (r.metrics?.distance_km || 0), 0),
          total_time: rides.reduce((sum, r) => sum + (r.metrics?.duration_minutes || 0), 0),
          total_cost: rides.reduce((sum, r) => sum + (r.fuel_cost || 0), 0),
          rides_count: rides.length
        };
        setWeeklyStats(stats);
      }
    } catch (err) {
      console.error('Load dashboard error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function handleSignOut() {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
    } catch (err) {
      console.error('Sign out error:', err);
    }
  }

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅 Good morning';
    if (hour < 18) return '☀️ Good afternoon';
    return '🌙 Good evening';
  })();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: Colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={[styles.greeting, headerStyle]}>{greeting}, {user?.name?.split(' ')[0]}!</Text>
        <Text style={styles.subtext}>Let's make today's ride great</Text>
      </View>

      {/* Streak Card */}
      <View style={styles.card}>
        <View style={styles.streakContainer}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <View>
            <Text style={styles.streakNumber}>{streak?.current_streak_count || 0}</Text>
            <Text style={styles.streakLabel}>Day Streak</Text>
          </View>
          <View style={styles.streakBest}>
            <Text style={styles.streakBestNumber}>{streak?.best_streak_count || 0}</Text>
            <Text style={styles.streakBestLabel}>Best</Text>
          </View>
        </View>
      </View>

      {/* Today's Ride Score */}
      {todayRide ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Today's Ride</Text>
          <View style={styles.scoreDisplay}>
            <Text style={styles.scoreNumber}>{Math.round(todayRide.score)}</Text>
            <Text style={styles.scoreLabel}>Score</Text>
          </View>
          <Text style={styles.rideDetail}>
            {todayRide.metrics?.distance_km?.toFixed(1)} km • {todayRide.metrics?.duration_minutes?.toFixed(0)} min
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Today's Ride</Text>
          <Text style={styles.noData}>No rides today yet</Text>
        </View>
      )}

      {/* Weekly Stats */}
      {weeklyStats && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📈 This Week</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{weeklyStats.rides_count}</Text>
              <Text style={styles.statLabel}>Rides</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{weeklyStats.total_distance.toFixed(0)}</Text>
              <Text style={styles.statLabel}>km</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round(weeklyStats.total_time)}</Text>
              <Text style={styles.statLabel}>min</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>₹{weeklyStats.total_cost.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Cost</Text>
            </View>
          </View>
        </View>
      )}

      {/* Navigation Buttons */}
      <View style={styles.buttonGroup}>
        <Button
          title="▶️ Quick Start Ride"
          onPress={() => navigation.navigate('Ride')}
          color={Colors.primary}
        />
      </View>

      <View style={styles.buttonGroup}>
        <Button
          title="📋 Ride History"
          onPress={() => navigation.navigate('History')}
        />
      </View>

      <View style={styles.buttonGroup}>
        <Button
          title="🏆 Achievements"
          onPress={() => navigation.navigate('Achievements')}
        />
      </View>

      <View style={styles.buttonGroup}>
        <Button
          title="👥 Community"
          onPress={() => navigation.navigate('Community')}
        />
      </View>

      <View style={styles.buttonGroup}>
        <Button
          title="📊 Insights"
          onPress={() => navigation.navigate('Insights')}
        />
      </View>

      <View style={styles.buttonGroup}>
        <Button
          title="📦 Monthly Wrapped"
          onPress={() => navigation.navigate('Wrapped')}
        />
      </View>

      <View style={[styles.buttonGroup, { marginBottom: 30 }]}>
        <Button
          title="⚙️ Profile"
          onPress={() => navigation.navigate('Profile')}
        />
      </View>

      <View style={styles.buttonGroup}>
        <Button
          title="🚪 Sign Out"
          onPress={handleSignOut}
          color="#ff3b30"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12
  },
  header: {
    marginBottom: 24
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4
  },
  subtext: {
    fontSize: 14,
    color: Colors.muted
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000'
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  streakEmoji: {
    fontSize: 40,
    marginRight: 16
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primary
  },
  streakLabel: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 4
  },
  streakBest: {
    alignItems: 'center'
  },
  streakBestNumber: {
    fontSize: 20,
    fontWeight: '600'
  },
  streakBestLabel: {
    fontSize: 11,
    color: Colors.muted,
    marginTop: 2
  },
  scoreDisplay: {
    alignItems: 'center',
    marginBottom: 12
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.primary
  },
  scoreLabel: {
    fontSize: 14,
    color: Colors.muted,
    marginTop: 4
  },
  rideDetail: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.muted
  },
  noData: {
    textAlign: 'center',
    color: Colors.muted,
    padding: 16
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap'
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.02)'
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary
  },
  statLabel: {
    fontSize: 11,
    color: Colors.muted,
    marginTop: 4
  },
  buttonGroup: {
    marginBottom: 12
  }
});
