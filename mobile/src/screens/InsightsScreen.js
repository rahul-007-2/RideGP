import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Shadows, Radii, Spacing } from '../lib/theme';
import { BackHeader, Card, EmptyState, Divider } from '../lib/components';
import { API_URL } from '@env';

export default function InsightsScreen({ navigation }) {
  const [commuteInsights, setCommuteInsights] = useState(null);
  const [smartInsights, setSmartInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const serverUrl = (API_URL && API_URL.length > 0) ? API_URL : 'http://localhost:3000';

  const loadInsights = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) return;

      const commuteRes = await fetch(`${serverUrl}/api/community/insights/commute`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (commuteRes.ok) {
        const data = await commuteRes.json();
        setCommuteInsights(data.insights);
      }

      const smartRes = await fetch(`${serverUrl}/api/community/insights/smart`, {
        headers: { Authorization: `Bearer ${authToken}` },
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

  return (
    <View style={styles.container}>
      <BackHeader title="Smart Insights" navigation={navigation} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadInsights(); }} tintColor={Colors.primary} />}
      >
        {/* Commute Insights */}
        {commuteInsights && (
          <Card>
            <Text style={styles.cardTitle}>📊 Commute Insights</Text>

            {commuteInsights.message ? (
              <EmptyState icon="📊" title="Not enough data" message={commuteInsights.message} />
            ) : (
              <>
                <InsightRow
                  icon="🕐"
                  label="Typical Departure"
                  value={commuteInsights.typical_departure_time}
                />
                <Divider />

                {commuteInsights.today_comparison && (
                  <>
                    <Text style={styles.sectionLabel}>Today vs Average</Text>
                    <InsightRow
                      icon="⚡"
                      label="Speed Difference"
                      value={`${commuteInsights.today_comparison.speed_diff_percent > 0 ? '+' : ''}${commuteInsights.today_comparison.speed_diff_percent}%`}
                      valueColor={
                        commuteInsights.today_comparison.speed_diff_percent > 0
                          ? Colors.error
                          : Colors.success
                      }
                    />
                    <InsightRow
                      icon="🛑"
                      label="Traffic Stops"
                      value={`${commuteInsights.today_comparison.stops_diff > 0 ? '+' : ''}${commuteInsights.today_comparison.stops_diff}`}
                      valueColor={
                        commuteInsights.today_comparison.stops_diff < 0
                          ? Colors.success
                          : Colors.error
                      }
                    />
                    <InsightRow
                      icon="⛽"
                      label="Fuel Cost Diff"
                      value={`₹${commuteInsights.today_comparison.fuel_cost_diff}`}
                    />
                    <Divider />
                  </>
                )}

                <InsightRow
                  icon="💰"
                  label="Cost Savings vs Last"
                  value={`₹${commuteInsights.cost_savings_vs_last_ride}`}
                  valueColor={commuteInsights.cost_savings_vs_last_ride > 0 ? Colors.success : Colors.error}
                />
                <InsightRow
                  icon="🚨"
                  label="Peak Traffic Hour"
                  value={commuteInsights.peak_traffic_hour}
                />
                <InsightRow
                  icon="📈"
                  label="Commutes Tracked"
                  value={commuteInsights.total_commutes_tracked}
                />
              </>
            )}
          </Card>
        )}

        {/* Smart Recommendations */}
        {smartInsights && (
          <Card>
            <Text style={styles.cardTitle}>🎯 Smart Recommendations</Text>

            {smartInsights.message ? (
              <EmptyState icon="🎯" title="Not enough data" message={smartInsights.message} />
            ) : (
              <>
                <RecommendationCard
                  icon="🕐"
                  title="Best Departure Time"
                  text={smartInsights.recommended_departure_time}
                />
                <RecommendationCard
                  icon="😴"
                  title="Idle Time"
                  text={smartInsights.idle_time_percentage}
                />
                <RecommendationCard
                  icon="📊"
                  title="Month-over-Month"
                  text={smartInsights.month_over_month_improvement}
                />
              </>
            )}
          </Card>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function InsightRow({ icon, label, value, valueColor }) {
  return (
    <View style={insightStyles.row}>
      <Text style={insightStyles.icon}>{icon}</Text>
      <Text style={insightStyles.label}>{label}</Text>
      <Text style={[insightStyles.value, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function RecommendationCard({ icon, title, text }) {
  return (
    <View style={recStyles.container}>
      <Text style={recStyles.icon}>{icon}</Text>
      <View style={recStyles.content}>
        <Text style={recStyles.title}>{title}</Text>
        <Text style={recStyles.text}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  cardTitle: {
    ...Typography.h3,
    marginBottom: 16,
  },
  sectionLabel: {
    ...Typography.small,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
});

const insightStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  icon: {
    fontSize: 16,
    marginRight: 10,
  },
  label: {
    flex: 1,
    ...Typography.body,
    fontSize: 14,
    fontWeight: '500',
  },
  value: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.primary,
    fontSize: 14,
  },
});

const recStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.borderLight,
    borderRadius: Radii.md,
    padding: 14,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 22,
    marginRight: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    ...Typography.label,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 3,
  },
  text: {
    ...Typography.caption,
    fontSize: 13,
  },
});
