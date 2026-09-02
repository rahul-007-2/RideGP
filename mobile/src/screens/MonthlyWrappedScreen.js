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
import { BackHeader, Card, PrimaryButton, EmptyState } from '../lib/components';
import { API_URL } from '@env';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function MonthlyWrappedScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [wrapped, setWrapped] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);

  const serverUrl = (API_URL && API_URL.length > 0) ? API_URL : 'http://localhost:3000';

  const loadWrapped = async (month = null, year = null) => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) return;

      let url = `${serverUrl}/api/community/wrapped`;
      if (month) url += `?month=${month}&year=${year}`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.ok) {
        const data = await res.json();
        setWrapped(data.wrapped);
      } else {
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
    setSelectedYear(now.getFullYear());
    loadWrapped();
  }, []);

  const handleMonthChange = (direction) => {
    let newMonth = selectedMonth + direction;
    let year = selectedYear;
    if (newMonth > 12) { newMonth = 1; year += 1; }
    else if (newMonth < 1) { newMonth = 12; year -= 1; }
    setSelectedMonth(newMonth);
    setSelectedYear(year);
    setLoading(true);
    loadWrapped(newMonth, year);
  };

  if (loading && !wrapped) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  const bikeStats = wrapped?.bike_stats || [];

  return (
    <View style={styles.container}>
      <BackHeader title="Monthly Wrapped" navigation={navigation} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadWrapped(); }} tintColor={Colors.primary} />}
      >
        {/* Month Selector */}
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={() => handleMonthChange(-1)} style={styles.monthNavBtn} activeOpacity={0.6}>
            <Text style={styles.monthNavText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.monthInfo}>
            <Text style={styles.monthName}>{MONTHS[selectedMonth - 1]}</Text>
            <Text style={styles.monthYear}>{selectedYear}</Text>
          </View>
          <TouchableOpacity onPress={() => handleMonthChange(1)} style={styles.monthNavBtn} activeOpacity={0.6}>
            <Text style={styles.monthNavText}>›</Text>
          </TouchableOpacity>
        </View>

        {!wrapped ? (
          <EmptyState icon="📦" title="No data this month" message="Start riding to generate your monthly summary" />
        ) : (
          <>
            {/* Hero Card */}
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>Your Riding Story</Text>
              <Text style={styles.heroStat}>{wrapped.total_rides}</Text>
              <Text style={styles.heroSubtext}>rides this month</Text>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <Card style={styles.statCard}>
                <Text style={styles.statIcon}>📏</Text>
                <Text style={styles.statValue}>{wrapped.total_distance_km.toFixed(0)}</Text>
                <Text style={styles.statLabel}>km covered</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statIcon}>⏱️</Text>
                <Text style={styles.statValue}>{Math.round(wrapped.total_riding_time_minutes)}</Text>
                <Text style={styles.statLabel}>min riding</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statIcon}>⛽</Text>
                <Text style={styles.statValue}>₹{wrapped.total_fuel_cost.toFixed(0)}</Text>
                <Text style={styles.statLabel}>fuel cost</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statIcon}>📊</Text>
                <Text style={styles.statValue}>{wrapped.average_ride_score.toFixed(0)}</Text>
                <Text style={styles.statLabel}>avg score</Text>
              </Card>
            </View>

            {/* Bike-wise Breakdown */}
            {bikeStats.length > 0 && (
              <Card>
                <Text style={styles.cardTitle}>🏍️ Garage Breakdown</Text>

                {wrapped.most_ridden_bike && (
                  <View style={styles.highlightRow}>
                    <Text style={styles.highlightLabel}>🏆 Most Ridden</Text>
                    <Text style={styles.highlightValue}>{wrapped.most_ridden_bike}</Text>
                  </View>
                )}
                {wrapped.best_scoring_bike && (
                  <View style={styles.highlightRow}>
                    <Text style={styles.highlightLabel}>⭐ Best Score</Text>
                    <Text style={styles.highlightValue}>{wrapped.best_scoring_bike}</Text>
                  </View>
                )}

                {bikeStats.map((bike, idx) => (
                  <View key={idx} style={styles.bikeBreakdownCard}>
                    <View style={styles.bikeBreakdownHeader}>
                      <Text style={styles.bikeBreakdownName}>🏍️ {bike.bike_name}</Text>
                      <Text style={styles.bikeBreakdownShare}>{bike.distance_share}% of total</Text>
                    </View>
                    <View style={styles.bikeBreakdownStats}>
                      <View style={styles.bikeStat}>
                        <Text style={styles.bikeStatValue}>{bike.rides}</Text>
                        <Text style={styles.bikeStatLabel}>rides</Text>
                      </View>
                      <View style={styles.bikeStat}>
                        <Text style={styles.bikeStatValue}>{bike.total_distance_km.toFixed(0)} km</Text>
                        <Text style={styles.bikeStatLabel}>distance</Text>
                      </View>
                      <View style={styles.bikeStat}>
                        <Text style={styles.bikeStatValue}>{bike.avg_score.toFixed(0)}</Text>
                        <Text style={styles.bikeStatLabel}>avg score</Text>
                      </View>
                      <View style={styles.bikeStat}>
                        <Text style={styles.bikeStatValue}>₹{bike.total_fuel_cost.toFixed(0)}</Text>
                        <Text style={styles.bikeStatLabel}>fuel</Text>
                      </View>
                    </View>
                    {/* Share bar */}
                    <View style={styles.shareBar}>
                      <View style={[styles.shareBarFill, { width: `${bike.distance_share}%` }]} />
                    </View>
                  </View>
                ))}
              </Card>
            )}

            {/* Best Rides */}
            <Card>
              <Text style={styles.cardTitle}>🎯 Your Best Rides</Text>
              <RecordRow icon="🏆" label="Best Ride" value={`Score: ${wrapped.best_ride_score?.toFixed(0) || '--'}`} />
              <RecordRow icon="📍" label="Most Used Route" value={wrapped.most_used_route} />
              <RecordRow icon="🛣️" label="Longest Ride" value={`${wrapped.longest_ride_distance?.toFixed(1) || '--'} km`} />
            </Card>

            {/* Percentiles */}
            <Card>
              <Text style={styles.cardTitle}>📈 Your Percentiles</Text>
              <PercentileRow label="🎯 Smoothness" percent={wrapped.smoothness_percentile || 0} />
            </Card>

            <PrimaryButton title="📸 Share Your Wrapped" onPress={() => {}} icon="📸" style={{ marginBottom: 100 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function RecordRow({ icon, label, value }) {
  return (
    <View style={rowStyles.container}>
      <Text style={rowStyles.icon}>{icon}</Text>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  );
}

function PercentileRow({ label, percent }) {
  return (
    <View style={pStyles.container}>
      <Text style={pStyles.label}>{label}</Text>
      <View style={pStyles.bar}><View style={[pStyles.fill, { width: `${percent}%` }]} /></View>
      <Text style={pStyles.value}>{percent}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: Spacing.lg },
  monthSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: 14, ...Shadows.small },
  monthNavBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  monthNavText: { fontSize: 26, color: Colors.text, fontWeight: '300' },
  monthInfo: { alignItems: 'center' },
  monthName: { ...Typography.h2 },
  monthYear: { ...Typography.caption },
  heroCard: { backgroundColor: Colors.primary, borderRadius: Radii.xl, padding: 28, alignItems: 'center', marginBottom: 16, ...Shadows.primary },
  heroLabel: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginBottom: 8 },
  heroStat: { fontSize: 56, fontWeight: '800', color: '#fff' },
  heroSubtext: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16, gap: 8 },
  statCard: { width: '47%', alignItems: 'center', paddingVertical: 16, marginBottom: 0 },
  statIcon: { fontSize: 24, marginBottom: 8 },
  statValue: { ...Typography.statSmall },
  statLabel: { ...Typography.small, marginTop: 2 },
  cardTitle: { ...Typography.h3, marginBottom: 14 },
  highlightRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  highlightLabel: { ...Typography.body, fontSize: 14, fontWeight: '500' },
  highlightValue: { ...Typography.body, fontWeight: '700', color: Colors.primary, fontSize: 14 },
  bikeBreakdownCard: { backgroundColor: Colors.borderLight, borderRadius: Radii.md, padding: 14, marginBottom: 10 },
  bikeBreakdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  bikeBreakdownName: { ...Typography.label, fontWeight: '700', color: Colors.text, fontSize: 14 },
  bikeBreakdownShare: { ...Typography.small, fontSize: 11, color: Colors.primary, fontWeight: '600' },
  bikeBreakdownStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  bikeStat: { alignItems: 'center' },
  bikeStatValue: { fontSize: 14, fontWeight: '700', color: Colors.text },
  bikeStatLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  shareBar: { height: 4, backgroundColor: Colors.borderLight, borderRadius: 2, overflow: 'hidden' },
  shareBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
});

const rowStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  icon: { fontSize: 16, marginRight: 10 },
  label: { flex: 1, ...Typography.body, fontSize: 14, fontWeight: '500' },
  value: { ...Typography.body, fontWeight: '700', color: Colors.primary, fontSize: 14 },
});

const pStyles = StyleSheet.create({
  container: { marginBottom: 12 },
  label: { ...Typography.body, fontSize: 14, fontWeight: '500', marginBottom: 8 },
  bar: { height: 8, backgroundColor: Colors.borderLight, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  fill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  value: { ...Typography.small },
});
