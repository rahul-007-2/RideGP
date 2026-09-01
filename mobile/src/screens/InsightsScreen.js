import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../lib/theme';
import { API_URL } from '@env';

export default function InsightsScreen() {
  const [commuteInsights, setCommuteInsights] = useState(null);
  const [smartInsights, setSmartInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const serverUrl = (API_URL && API_URL.length > 0) ? API_URL : 'http://localhost:3000';

  const loadInsights = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) return;

      // Get commute insights
      const commuteRes = await fetch(`${serverUrl}/api/community/insights/commute`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (commuteRes.ok) {
        const data = await commuteRes.json();
        setCommuteInsights(data.insights);
      }

      // Get smart insights
      const smartRes = await fetch(`${serverUrl}/api/community/insights/smart`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (smartRes.ok) {
        const data = await smartRes.json();
        setSmartInsights(data.insights);
      }
    } catch (err) {
      console.error('Load insights error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadInsights(); }} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>💡 Smart Insights</Text>
      </View>

      {/* Commute Insights */}
      {commuteInsights && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📊 Commute Insights</Text>

            {commuteInsights.message ? (
              <Text style={styles.noData}>{commuteInsights.message}</Text>
            ) : (
              <>
                <View style={styles.insightRow}>
                  <Text style={styles.insightLabel}>🕐 Typical Departure Time</Text>
                  <Text style={styles.insightValue}>{commuteInsights.typical_departure_time}</Text>
                </View>

                {commuteInsights.today_comparison && (
                  <>
                    <View style={styles.divider} />
                    <Text style={styles.insightSubtitle}>Today vs Your Average</Text>

                    <View style={styles.insightRow}>
                      <Text style={styles.insightLabel}>⚡ Speed Difference</Text>
                      <Text style={[
                        styles.insightValue,
                        { color: commuteInsights.today_comparison.speed_diff_percent > 0 ? '#ff3b30' : Colors.primary }
                      ]}>
                        {commuteInsights.today_comparison.speed_diff_percent > 0 ? '+' : ''}{commuteInsights.today_comparison.speed_diff_percent}%
                      </Text>
                    </View>

                    <View style={styles.insightRow}>
                      <Text style={styles.insightLabel}>🛑 Traffic Stops Difference</Text>
                      <Text style={[
                        styles.insightValue,
                        { color: commuteInsights.today_comparison.stops_diff < 0 ? Colors.primary : '#ff3b30' }
                      ]}>
                        {commuteInsights.today_comparison.stops_diff > 0 ? '+' : ''}{commuteInsights.today_comparison.stops_diff}
                      </Text>
                    </View>

                    <View style={styles.insightRow}>
                      <Text style={styles.insightLabel}>⛽ Fuel Cost Difference</Text>
                      <Text style={styles.insightValue}>
                        ₹{commuteInsights.today_comparison.fuel_cost_diff}
                      </Text>
                    </View>
                  </>
                )}

                <View style={styles.divider} />

                <View style={styles.insightRow}>
                  <Text style={styles.insightLabel}>💰 Cost Savings vs Last Ride</Text>
                  <Text style={[
                    styles.insightValue,
                    { color: commuteInsights.cost_savings_vs_last_ride > 0 ? Colors.primary : '#ff3b30' }
                  ]}>
                    ₹{commuteInsights.cost_savings_vs_last_ride}
                  </Text>
                </View>

                <View style={styles.insightRow}>
                  <Text style={styles.insightLabel}>🚨 Peak Traffic Hour</Text>
                  <Text style={styles.insightValue}>{commuteInsights.peak_traffic_hour}</Text>
                </View>

                <View style={styles.insightRow}>
                  <Text style={styles.insightLabel}>📈 Total Commutes Tracked</Text>
                  <Text style={styles.insightValue}>{commuteInsights.total_commutes_tracked}</Text>
                </View>
              </>
            )}
          </View>
        </>
      )}

      {/* Smart Insights */}
      {smartInsights && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎯 Smart Recommendations</Text>

          {smartInsights.message ? (
            <Text style={styles.noData}>{smartInsights.message}</Text>
          ) : (
            <>
              <View style={styles.recommendationBox}>
                <Text style={styles.recommendationIcon}>🕐</Text>
                <View style={styles.recommendationContent}>
                  <Text style={styles.recommendationTitle}>Best Departure Time</Text>
                  <Text style={styles.recommendationText}>{smartInsights.recommended_departure_time}</Text>
                </View>
              </View>

              <View style={styles.recommendationBox}>
                <Text style={styles.recommendationIcon}>😴</Text>
                <View style={styles.recommendationContent}>
                  <Text style={styles.recommendationTitle}>Idle Time</Text>
                  <Text style={styles.recommendationText}>{smartInsights.idle_time_percentage}</Text>
                </View>
              </View>

              <View style={styles.recommendationBox}>
                <Text style={styles.recommendationIcon}>📊</Text>
                <View style={styles.recommendationContent}>
                  <Text style={styles.recommendationTitle}>Month-over-Month Improvement</Text>
                  <Text style={styles.recommendationText}>{smartInsights.month_over_month_improvement}</Text>
                </View>
              </View>
            </>
          )}
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16
  },
  header: {
    marginBottom: 20
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000'
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12
  },
  noData: {
    textAlign: 'center',
    color: Colors.muted,
    paddingVertical: 20
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)'
  },
  insightLabel: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500'
  },
  insightValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary
  },
  insightSubtitle: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 12,
    marginBottom: 8,
    fontWeight: '600'
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: 12
  },
  recommendationBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(59, 209, 227, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'flex-start'
  },
  recommendationIcon: {
    fontSize: 24,
    marginRight: 12
  },
  recommendationContent: {
    flex: 1
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4
  },
  recommendationText: {
    fontSize: 13,
    color: Colors.muted
  }
});
