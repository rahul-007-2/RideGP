import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Shadows, Radii, Spacing } from '../lib/theme';
import { Card, EmptyState } from '../lib/components';
import { API_URL } from '@env';

// All possible achievements with descriptions and unlock criteria
const ALL_ACHIEVEMENTS = [
  { type: 'first_ride', icon: '🎉', title: 'First Ride', desc: 'Complete your first tracked ride', color: '#FF6B6B', category: 'Getting Started' },
  { type: 'early_bird', icon: '🌅', title: 'Early Bird', desc: 'Start 5 rides before 8 AM', color: '#FF9F43', category: 'Habits' },
  { type: 'smooth_operator', icon: '🎯', title: 'Smooth Operator', desc: 'Score 90+ on a ride', color: '#0A84FF', category: 'Skill' },
  { type: 'fuel_saver', icon: '⛽', title: 'Fuel Saver', desc: 'Keep fuel cost under ₹20 for 5 rides', color: '#2ED573', category: 'Efficiency' },
  { type: 'route_master', icon: '🗺️', title: 'Route Master', desc: 'Ride the same route 10 times', color: '#A855F7', category: 'Exploration' },
  { type: 'consistent_commuter', icon: '📅', title: 'Commuter', desc: 'Ride 5 days in a row', color: '#FF6B6B', category: 'Habits' },
  { type: 'night_rider', icon: '🌙', title: 'Night Rider', desc: 'Complete 5 rides after 8 PM', color: '#1A1D26', category: 'Habits' },
  { type: 'speed_demon', icon: '⚡', title: 'Speed Demon', desc: 'Hit a top speed of 60+ km/h', color: '#FF4757', category: 'Skill' },
  { type: 'distance_warrior', icon: '🛣️', title: 'Distance Warrior', desc: 'Ride 100 km total', color: '#0A84FF', category: 'Milestones' },
  { type: 'environmental_champion', icon: '♻️', title: 'Eco Champion', desc: 'Save 5L of fuel vs driving', color: '#2ED573', category: 'Efficiency' },
  { type: 'century_club', icon: '💯', title: 'Century Club', desc: 'Complete 100 rides', color: '#FF9F43', category: 'Milestones' },
  { type: 'streak_master', icon: '🔥', title: 'Streak Master', desc: 'Maintain a 7-day streak', color: '#FF4757', category: 'Habits' },
  { type: 'score_champion', icon: '🏆', title: 'Score Champion', desc: 'Maintain avg score of 80+ over 20 rides', color: '#FFD700', category: 'Skill' },
  { type: 'garage_pride', icon: '🏍️', title: 'Garage Pride', desc: 'Add 3 bikes to your garage', color: '#A855F7', category: 'Profile' },
  { type: 'social_rider', icon: '👥', title: 'Social Rider', desc: 'Join a group and send 10 messages', color: '#0A84FF', category: 'Social' },
  { type: 'wrapped_fan', icon: '📦', title: 'Wrapped Fan', desc: 'View your monthly wrapped 3 times', color: '#FF9F43', category: 'Engagement' },
];

const CATEGORIES = ['All', 'Milestones', 'Skill', 'Habits', 'Efficiency', 'Social'];

export default function AchievementsScreen() {
  const insets = useSafeAreaInsets();
  const [unlockedTypes, setUnlockedTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const serverUrl = (API_URL && API_URL.length > 0) ? API_URL : 'http://localhost:3000';

  const loadAchievements = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) return;

      // Trigger server-side check first
      await fetch(`${serverUrl}/api/gamification/achievements/check`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      // Then fetch unlocked
      const res = await fetch(`${serverUrl}/api/gamification/achievements`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const types = (data.achievements || []).map(a => a.achievement_type);
        setUnlockedTypes(types);
      }
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

  const totalUnlocked = unlockedTypes.length;
  const totalPossible = ALL_ACHIEVEMENTS.length;
  const progressPercent = totalPossible > 0 ? Math.round((totalUnlocked / totalPossible) * 100) : 0;

  const filtered = selectedCategory === 'All'
    ? ALL_ACHIEVEMENTS
    : ALL_ACHIEVEMENTS.filter(a => a.category === selectedCategory);

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
            <View style={{ flex: 1 }}>
              <Text style={styles.progressTitle}>Your Collection</Text>
              <Text style={styles.progressSubtitle}>
                {totalUnlocked} of {totalPossible} unlocked
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

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryContainer}>
          {CATEGORIES.map((cat) => (
            <View
              key={cat}
              style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
            >
              <Text
                style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                {cat}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Achievement Grid */}
        {filtered.map((achievement, idx) => {
          const isUnlocked = unlockedTypes.includes(achievement.type);
          return (
            <View
              key={idx}
              style={[styles.achievementCard, !isUnlocked && styles.achievementLocked]}
            >
              <View style={[styles.achievementIcon, { backgroundColor: isUnlocked ? achievement.color + '18' : Colors.borderLight }]}>
                <Text style={[styles.iconText, !isUnlocked && styles.iconTextLocked]}>
                  {isUnlocked ? achievement.icon : '🔒'}
                </Text>
              </View>
              <View style={styles.achievementContent}>
                <View style={styles.achievementTitleRow}>
                  <Text style={[styles.achievementTitle, !isUnlocked && styles.textLocked]}>
                    {achievement.title}
                  </Text>
                  {isUnlocked && (
                    <View style={[styles.unlockedBadge, { backgroundColor: achievement.color + '20' }]}>
                      <Text style={[styles.unlockedBadgeText, { color: achievement.color }]}>✓ Unlocked</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.achievementDesc, !isUnlocked && styles.textLocked]}>
                  {achievement.desc}
                </Text>
                <Text style={styles.categoryTag}>{achievement.category}</Text>
              </View>
            </View>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  title: { ...Typography.h1 },
  scrollContent: { paddingHorizontal: Spacing.lg },
  progressCard: { marginBottom: Spacing.lg },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  progressTitle: { ...Typography.h3 },
  progressSubtitle: { ...Typography.caption, marginTop: 2 },
  progressRing: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center',
  },
  progressPercent: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  progressBar: { height: 6, backgroundColor: Colors.borderLight, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  categoryScroll: { marginBottom: 16 },
  categoryContainer: { gap: 8 },
  categoryPill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radii.full,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
  },
  categoryPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  categoryTextActive: { color: '#fff' },
  achievementCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: 14, marginBottom: 10, ...Shadows.small,
  },
  achievementLocked: { opacity: 0.65 },
  achievementIcon: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  iconText: { fontSize: 26 },
  iconTextLocked: { fontSize: 22, opacity: 0.5 },
  achievementContent: { flex: 1 },
  achievementTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  achievementTitle: { ...Typography.h3, fontSize: 15 },
  textLocked: { color: Colors.textMuted },
  unlockedBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radii.full },
  unlockedBadgeText: { fontSize: 10, fontWeight: '700' },
  achievementDesc: { ...Typography.caption, fontSize: 12, marginBottom: 4 },
  categoryTag: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
});
