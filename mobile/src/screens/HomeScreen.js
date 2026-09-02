import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Shadows, Radii, Spacing } from '../lib/theme';
import { Card, EmptyState } from '../lib/components';
import { API_URL } from '@env';

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
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
        navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Auth' }] });
        return;
      }

      setUser(JSON.parse(userData));

      const streakRes = await fetch(`${serverUrl}/api/gamification/streak`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (streakRes.ok) setStreak((await streakRes.json()).streak);

      const ridesRes = await fetch(`${serverUrl}/api/rides?limit=1`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (ridesRes.ok) {
        const data = await ridesRes.json();
        const today = new Date();
        const todayRide = data.rides.find((r) => {
          const rideDate = new Date(r.start_time);
          return (
            rideDate.getDate() === today.getDate() &&
            rideDate.getMonth() === today.getMonth() &&
            rideDate.getFullYear() === today.getFullYear()
          );
        });
        setTodayRide(todayRide);
      }

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const weeklyRes = await fetch(
        `${serverUrl}/api/rides/history/range?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      if (weeklyRes.ok) {
        const data = await weeklyRes.json();
        const rides = data.rides || [];
        setWeeklyStats({
          total_distance: rides.reduce((sum, r) => sum + (r.metrics?.distance_km || 0), 0),
          total_time: rides.reduce((sum, r) => sum + (r.metrics?.duration_minutes || 0), 0),
          total_cost: rides.reduce((sum, r) => sum + (r.fuel_cost || 0), 0),
          rides_count: rides.length,
        });
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

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const greetingEmoji = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅';
    if (hour < 18) return '☀️';
    return '🌙';
  })();

  // Find active bike name
  const activeBike = user?.bikes?.find(b => b.bike_id === user?.active_bike_id);
  const bikeDisplayName = activeBike ? (activeBike.nickname || `${activeBike.make} ${activeBike.model}`.trim() || 'My Bike') : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + Spacing.lg }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Greeting */}
      <View style={styles.heroSection}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{greetingEmoji} {greeting}</Text>
          <Text style={styles.userName}>{user?.name?.split(' ')[0] || 'Rider'}</Text>
          {bikeDisplayName && (
            <View style={styles.bikePill}>
              <Text style={styles.bikePillText}>🏍️ {bikeDisplayName}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.avatar}
          onPress={() => navigation.navigate('ProfileTab')}
          activeOpacity={0.7}
        >
          <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
        </TouchableOpacity>
      </View>

      {/* Streak Hero Card */}
      <Card style={styles.streakCard}>
        <View style={styles.streakRow}>
          <View>
            <Text style={styles.streakEmoji}>🔥</Text>
          </View>
          <View style={styles.streakInfo}>
            <Text style={styles.streakCount}>{streak?.current_streak_count || 0}</Text>
            <Text style={styles.streakLabel}>Day Streak</Text>
          </View>
          <View style={styles.streakDivider} />
          <View style={styles.streakBest}>
            <Text style={styles.streakBestCount}>{streak?.best_streak_count || 0}</Text>
            <Text style={styles.streakBestLabel}>Best</Text>
          </View>
        </View>
      </Card>

      {/* Today's Ride */}
      <Card>
        <Text style={styles.cardTitle}>Today's Ride</Text>
        {todayRide ? (
          <View style={styles.rideScoreRow}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreNumber}>{Math.round(todayRide.score)}</Text>
              <Text style={styles.scoreUnit}>pts</Text>
            </View>
            <View style={styles.rideMetrics}>
              <View style={styles.rideMetric}>
                <Text style={styles.rideMetricIcon}>📏</Text>
                <Text style={styles.rideMetricValue}>{todayRide.metrics?.distance_km?.toFixed(1)} km</Text>
              </View>
              <View style={styles.rideMetric}>
                <Text style={styles.rideMetricIcon}>⏱️</Text>
                <Text style={styles.rideMetricValue}>{todayRide.metrics?.duration_minutes?.toFixed(0)} min</Text>
              </View>
            </View>
          </View>
        ) : (
          <EmptyState icon="🏍️" title="No rides today" message="Start your first ride to track today's commute" />
        )}
      </Card>

      {/* Weekly Stats */}
      {weeklyStats && (
        <Card>
          <Text style={styles.cardTitle}>This Week</Text>
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
              <Text style={styles.statLabel}>spent</Text>
            </View>
          </View>
        </Card>
      )}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>

      <TouchableOpacity
        style={styles.startRideBtn}
        onPress={() => navigation.navigate('Ride')}
        activeOpacity={0.85}
      >
        <Text style={styles.startRideIcon}>▶️</Text>
        <Text style={styles.startRideText}>Start Ride</Text>
        <Text style={styles.startRideArrow}>›</Text>
      </TouchableOpacity>

      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Community')} activeOpacity={0.7}>
          <Text style={styles.actionEmoji}>👥</Text>
          <Text style={styles.actionLabel}>Community</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Insights')} activeOpacity={0.7}>
          <Text style={styles.actionEmoji}>📊</Text>
          <Text style={styles.actionLabel}>Insights</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Wrapped')} activeOpacity={0.7}>
          <Text style={styles.actionEmoji}>📦</Text>
          <Text style={styles.actionLabel}>Wrapped</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Groups')} activeOpacity={0.7}>
          <Text style={styles.actionEmoji}>👥</Text>
          <Text style={styles.actionLabel}>Groups</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  contentContainer: { paddingHorizontal: Spacing.lg },
  loadingContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  heroSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  greeting: { ...Typography.subtitle, fontSize: 14 },
  userName: { ...Typography.hero, fontSize: 28, marginTop: 2 },
  bikePill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primary + '12', borderRadius: Radii.full,
    paddingHorizontal: 10, paddingVertical: 4, marginTop: 6, alignSelf: 'flex-start',
  },
  bikePillText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.primary },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  streakCard: { backgroundColor: Colors.primary, marginBottom: Spacing.lg },
  streakRow: { flexDirection: 'row', alignItems: 'center' },
  streakEmoji: { fontSize: 36 },
  streakInfo: { marginLeft: 16, flex: 1 },
  streakCount: { fontSize: 36, fontWeight: '800', color: '#fff' },
  streakLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  streakDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 16 },
  streakBest: { alignItems: 'center' },
  streakBestCount: { fontSize: 22, fontWeight: '700', color: '#fff' },
  streakBestLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  cardTitle: { ...Typography.h3, marginBottom: 14 },
  rideScoreRow: { flexDirection: 'row', alignItems: 'center' },
  scoreCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primary + '12', alignItems: 'center', justifyContent: 'center', marginRight: 20 },
  scoreNumber: { fontSize: 26, fontWeight: '800', color: Colors.primary },
  scoreUnit: { fontSize: 10, color: Colors.primary, fontWeight: '600', marginTop: -2 },
  rideMetrics: { flex: 1 },
  rideMetric: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  rideMetricIcon: { fontSize: 14, marginRight: 8 },
  rideMetricValue: { ...Typography.body, fontWeight: '600', fontSize: 14 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { ...Typography.statSmall },
  statLabel: { ...Typography.small, marginTop: 2 },
  sectionTitle: { ...Typography.h3, marginBottom: 12, marginTop: 4 },
  startRideBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, borderRadius: Radii.lg, padding: 18, marginBottom: 12, ...Shadows.primary },
  startRideIcon: { fontSize: 20, marginRight: 12 },
  startRideText: { flex: 1, fontSize: 17, fontWeight: '700', color: '#fff' },
  startRideArrow: { fontSize: 28, color: 'rgba(255,255,255,0.7)', fontWeight: '300' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionCard: { width: '48%', backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: 18, alignItems: 'center', marginBottom: 12, ...Shadows.medium },
  actionEmoji: { fontSize: 28, marginBottom: 8 },
  actionLabel: { ...Typography.label, color: Colors.text, fontWeight: '600' },
});
