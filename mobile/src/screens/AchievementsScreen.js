import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../lib/theme';
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
  century_club: '💯'
};

export default function AchievementsScreen() {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);

  const serverUrl = (API_URL && API_URL.length > 0) ? API_URL : 'http://localhost:3000';

  const loadAchievements = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) return;

      // Get achievements
      const res = await fetch(`${serverUrl}/api/gamification/achievements`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (res.ok) {
        const data = await res.json();
        setAchievements(data.achievements || []);
        setStats({
          unlockedCount: data.count,
          totalPossible: data.total_possible
        });
      }

      // Check for new achievements
      await fetch(`${serverUrl}/api/gamification/achievements/check`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
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
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAchievements(); }} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>🏆 Achievements</Text>
        {stats && (
          <Text style={styles.progress}>
            {stats.unlockedCount} / {stats.totalPossible} unlocked
          </Text>
        )}
      </View>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${stats ? (stats.unlockedCount / stats.totalPossible) * 100 : 0}%` }
          ]}
        />
      </View>

      <View style={styles.achievementsList}>
        {achievements.length === 0 ? (
          <Text style={styles.noData}>Keep riding to unlock achievements!</Text>
        ) : (
          achievements.map((achievement, idx) => (
            <View key={idx} style={styles.achievementCard}>
              <View style={styles.achievementIcon}>
                <Text style={styles.iconText}>
                  {ACHIEVEMENT_ICONS[achievement.achievement_type] || '⭐'}
                </Text>
              </View>
              <View style={styles.achievementContent}>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                <Text style={styles.achievementDesc}>{achievement.description}</Text>
                <Text style={styles.unlockedDate}>
                  🔓 {new Date(achievement.unblocked_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
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
    marginBottom: 16
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8
  },
  progress: {
    fontSize: 14,
    color: Colors.muted
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 24
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary
  },
  achievementsList: {
    marginBottom: 20
  },
  noData: {
    textAlign: 'center',
    color: Colors.muted,
    marginTop: 40,
    fontSize: 14
  },
  achievementCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  achievementIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(59, 209, 227, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  iconText: {
    fontSize: 24
  },
  achievementContent: {
    flex: 1
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4
  },
  achievementDesc: {
    fontSize: 12,
    color: Colors.muted,
    marginBottom: 4
  },
  unlockedDate: {
    fontSize: 11,
    color: Colors.primary
  }
});
