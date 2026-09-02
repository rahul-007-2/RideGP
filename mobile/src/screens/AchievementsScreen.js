import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Shadows, Radii, Spacing } from '../lib/theme';
import { Card, EmptyState, Badge } from '../lib/components';
import { API_URL } from '@env';

const ACHIEVEMENT_ICONS = {
  early_bird: '🌅',
  smooth_operator: '🎯',
  fuel_saver: '⛽',
  route_master: '🗺️',
  consistent_commuter: '📅',
  night_rider: '🌙',
  speed_demon: '🏍️',
  distance_warrior: '🛣️',
  environmental_champion: '♻️',
  century_club: '💯',
};

const ACHIEVEMENT_COLORS = {
  early_bird: '#FF9F43',
  smooth_operator: '#0A84FF',
  fuel_saver: '#2ED573',
  route_master: '#A855F7',
  consistent_commuter: '#FF6B6B',
  night_rider: '#1A1D26',
  speed_demon: '#FF4757',
  distance_warrior: '#0A84FF',
  environmental_champion: '#2ED573',
  century_club: '#FF9F43',
};

export default function AchievementsScreen() {
  const insets = useSafeAreaInsets();
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);

  const serverUrl = (API_URL && API_URL.length > 0) ? API_URL : 'http://localhost:3000';

  const loadAchievements = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) return;

      const res = await fetch(`${serverUrl}/api/gamification/achievements`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        setAchievements(data.achievements || []);
        setStats({ unlockedCount: data.count, totalPossible: data.total_possible });
      }

      await fetch(`${serverUrl}/api/gamification/achievements/check`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch (err) {
      console.error('Load achievements error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAchievements();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const progressPercent = stats ? Math.round((stats.unlockedCount / stats.totalPossible) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <Text style={styles.title}>Achievements</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAchievements(); }} tintColor={Colors.primary} />}
      >
        {/* Progress Card */}
        <Card style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressTitle}>Your Progress</Text>
              <Text style={styles.progressSubtitle}>
                {stats?.unlockedCount || 0} of {stats?.totalPossible || 0} unlocked
              </Text>
            </View>
            <View style={styles.progressRing}>
              <Text style={styles.progressPercent}>{progressPercent}%</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
        </Card>

        {/* Achievements List */}
        {achievements.length === 0 ? (
          <EmptyState
            icon="🏆"
            title="No achievements yet"
            message="Keep riding to unlock your first achievement!"
          />
        ) : (
          achievements.map((achievement, idx) => {
            const color = ACHIEVEMENT_COLORS[achievement.achievement_type] || Colors.primary;
            return (
              <Card key={idx} style={styles.achievementCard}>
                <View style={styles.achievementRow}>
                  <View style={[styles.achievementIcon, { backgroundColor: color + '15' }]}>
                    <Text style={styles.iconText}>
                      {ACHIEVEMENT_ICONS[achievement.achievement_type] || '⭐'}
                    </Text>
                  </View>
                  <View style={styles.achievementContent}>
                    <View style={styles.achievementTitleRow}>
                      <Text style={styles.achievementTitle}>{achievement.title}</Text>
                      <Badge text="Unlocked" color={color} small />
                    </View>
                    <Text style={styles.achievementDesc}>{achievement.description}</Text>
                    <Text style={styles.unlockedDate}>
                      🔓 {new Date(achievement.unblocked_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>
              </Card>
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    ...Typography.h1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  progressCard: {
    marginBottom: Spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  progressTitle: {
    ...Typography.h3,
  },
  progressSubtitle: {
    ...Typography.caption,
    marginTop: 2,
  },
  progressRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  achievementCard: {
    marginBottom: 10,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconText: {
    fontSize: 26,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  achievementTitle: {
    ...Typography.h3,
    fontSize: 15,
  },
  achievementDesc: {
    ...Typography.caption,
    fontSize: 12,
    marginBottom: 4,
  },
  unlockedDate: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500',
  },
});
