import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Share,
  TextInput,
  Animated,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Polyline, Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Shadows, Radii, Spacing } from '../lib/theme';
import { Card } from '../lib/components';
import { API_URL } from '@env';

export default function RideDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { rideId, ride: passedRide } = route.params || {};
  const [ride, setRide] = useState(passedRide || null);
  const [loading, setLoading] = useState(!passedRide);
  const [routeName, setRouteName] = useState(passedRide?.route_name || '');
  const [isFavourite, setIsFavourite] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);
  const [showSharePicker, setShowSharePicker] = useState(false);
  const [groups, setGroups] = useState([]);
  const [sharing, setSharing] = useState(false);
  const animValue = useRef(new Animated.Value(0)).current;

  const serverUrl = (API_URL && API_URL.length > 0) ? API_URL : 'http://localhost:3000';

  useEffect(() => {
    if (!ride && rideId) loadRide();
    if (ride) setupMap();
    Animated.timing(animValue, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const loadRide = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await fetch(`${serverUrl}/api/rides/${rideId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRide(data.ride);
        setRouteName(data.ride.route_name || '');
      }
    } catch (err) {
      console.error('Load ride error:', err);
    } finally {
      setLoading(false);
    }
  };

  const setupMap = () => {
    if (!ride?.geo || ride.geo.length === 0) return;
    const lats = ride.geo.map(p => p.latitude);
    const lngs = ride.geo.map(p => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    setMapRegion({
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) * 0.3 + 0.005,
      longitudeDelta: (maxLng - minLng) * 0.3 + 0.005,
    });
  };

  const saveRouteName = async () => {
    setEditingName(false);
    if (routeName === (ride.route_name || '')) return;
    try {
      const token = await AsyncStorage.getItem('authToken');
      await fetch(`${serverUrl}/api/rides/${ride._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ route_name: routeName }),
      });
      setRide({ ...ride, route_name: routeName });
    } catch (err) {
      console.error('Save route name error:', err);
    }
  };

  const toggleFavourite = async () => {
    const newState = !isFavourite;
    setIsFavourite(newState);
    try {
      const token = await AsyncStorage.getItem('authToken');
      await fetch(`${serverUrl}/api/rides/${ride._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_favourite: newState }),
      });
    } catch (err) {
      setIsFavourite(!newState);
    }
  };

  const loadGroups = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await fetch(`${serverUrl}/api/chat/groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch (err) {
      console.error('Load groups error:', err);
    }
  };

  const openSharePicker = async () => {
    await loadGroups();
    setShowSharePicker(true);
  };

  const shareToGroup = async (group) => {
    setShowSharePicker(false);
    setSharing(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const m = ride.metrics || {};
      const shareText = `🏍️ Ride Summary\n📏 ${m.distance_km?.toFixed(1) || 0} km | ⏱️ ${Math.round(m.duration_minutes || 0)} min | ⚡ ${m.average_speed_kmh?.toFixed(0) || 0} km/h\n🏆 Score: ${Math.round(ride.score || 0)}/100\n⛽ ₹${(ride.fuel_cost || 0).toFixed(0)} fuel\n📍 ${routeName || 'Unnamed route'}`;

      await fetch(`${serverUrl}/api/chat/groups/${group._id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: shareText }),
      });
      Alert.alert('Shared!', `Ride shared to ${group.name}`);
    } catch (err) {
      Alert.alert('Error', 'Failed to share');
    } finally {
      setSharing(false);
    }
  };

  const shareSystem = async () => {
    setShowSharePicker(false);
    const m = ride.metrics || {};
    try {
      await Share.share({
        message: `🏍️ Ride Summary\n\n📏 ${m.distance_km?.toFixed(1) || 0} km\n⏱️ ${Math.round(m.duration_minutes || 0)} min\n⚡ ${m.average_speed_kmh?.toFixed(0) || 0} km/h avg\n🏆 Score: ${Math.round(ride.score || 0)}/100\n⛽ ₹${(ride.fuel_cost || 0).toFixed(0)} fuel\n\nRode on ${new Date(ride.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}\n\nTracked with Freebuff 🚀`,
      });
    } catch (err) {}
  };

  const getScoreTips = () => {
    if (!ride) return [];
    const tips = [];
    const m = ride.metrics || {};
    const score = ride.score || 0;

    if ((m.traffic_stops || 0) > 3) {
      tips.push({ icon: '🚦', title: 'Reduce stops', text: `You had ${m.traffic_stops} stops. Try departing outside peak hours to reduce traffic stops.` });
    }
    if ((m.idle_time_minutes || 0) > (m.duration_minutes || 1) * 0.2) {
      tips.push({ icon: '⏱️', title: 'Less idle time', text: `${Math.round(m.idle_time_minutes || 0)} min idle (${Math.round(((m.idle_time_minutes || 0) / (m.duration_minutes || 1)) * 100)}% of ride).` });
    }
    if ((m.top_speed_kmh || 0) > 80) {
      tips.push({ icon: '⚡', title: 'Watch your speed', text: `Top speed was ${m.top_speed_kmh?.toFixed(0)} km/h. Consistent moderate speed scores better.` });
    }
    if (score < 50) {
      tips.push({ icon: '🎯', title: 'Focus on smoothness', text: 'Gradual acceleration and braking are the biggest score boosters.' });
    } else if (score < 75) {
      tips.push({ icon: '📈', title: 'Good progress', text: 'You\'re doing well. Try reducing stops further for an even better score.' });
    } else {
      tips.push({ icon: '🌟', title: 'Great ride!', text: 'Excellent score! Keep maintaining consistent speed and smooth braking.' });
    }
    if (tips.length === 0) {
      tips.push({ icon: '📊', title: 'Keep riding', text: 'More rides will unlock personalized tips based on your patterns.' });
    }
    return tips;
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }
  if (!ride) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ ...Typography.h3, marginBottom: 12 }}>Ride not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 12 }}>
          <Text style={{ color: Colors.primary, fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const m = ride.metrics || {};
  const geo = ride.geo || [];
  const tips = getScoreTips();
  const startTime = new Date(ride.start_time);
  const endTime = new Date(ride.end_time);

  return (
    <View style={styles.container}>
      {/* Map — fills top portion, interactive */}
      {geo.length > 0 && mapRegion && (
        <View style={[styles.mapContainer, { height: 220, paddingTop: insets.top }]}>
          <MapView
            style={styles.map}
            region={mapRegion}
            scrollEnabled={true}
            zoomEnabled={true}
            pitchEnabled={true}
            rotateEnabled={true}
          >
            <Polyline
              coordinates={geo.map(p => ({ latitude: p.latitude, longitude: p.longitude }))}
              strokeWidth={4}
              strokeColor={Colors.primary}
            />
            <Marker coordinate={{ latitude: geo[0].latitude, longitude: geo[0].longitude }} title="Start" pinColor="green" />
            <Marker coordinate={{ latitude: geo[geo.length - 1].latitude, longitude: geo[geo.length - 1].longitude }} title="End" pinColor="red" />
          </MapView>
        </View>
      )}

      {/* Back Button — above everything */}
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 8 }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Text style={styles.backButtonText}>‹</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Score Hero */}
        <Animated.View style={[styles.scoreHero, { opacity: animValue }]}>
          <View style={styles.scoreCircleLarge}>
            <Text style={styles.scoreNumberLarge}>{Math.round(ride.score || 0)}</Text>
            <Text style={styles.scoreUnitLarge}>/100</Text>
          </View>
          <Text style={styles.scoreLabel}>Ride Score</Text>
        </Animated.View>

        {/* Route Name */}
        <Card>
          {editingName ? (
            <View style={styles.routeNameEditRow}>
              <TextInput
                style={styles.routeNameInput}
                value={routeName}
                onChangeText={setRouteName}
                placeholder="Name this route"
                placeholderTextColor={Colors.textMuted}
                autoFocus
                onBlur={saveRouteName}
              />
              <TouchableOpacity onPress={saveRouteName} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>✓</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.routeNameRow} onPress={() => setEditingName(true)}>
              <Text style={styles.routeName}>📍 {routeName || 'Tap to name this route'}</Text>
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
          )}
          <View style={styles.routeMeta}>
            <Text style={styles.routeMetaText}>{startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
            <Text style={styles.routeMetaDot}>·</Text>
            <Text style={styles.routeMetaText}>{startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} → {endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          {ride.bike_name ? <Text style={styles.bikeLabel}>🏍️ {ride.bike_name}</Text> : null}
        </Card>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statIcon}>📏</Text>
            <Text style={styles.statValue}>{m.distance_km?.toFixed(2) || '0.00'}</Text>
            <Text style={styles.statLabel}>km</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statIcon}>⏱️</Text>
            <Text style={styles.statValue}>{Math.round(m.duration_minutes || 0)}</Text>
            <Text style={styles.statLabel}>min</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statIcon}>⚡</Text>
            <Text style={styles.statValue}>{m.average_speed_kmh?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.statLabel}>km/h avg</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statIcon}>🏎️</Text>
            <Text style={styles.statValue}>{m.top_speed_kmh?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.statLabel}>km/h top</Text>
          </Card>
        </View>

        {/* Detailed Metrics */}
        <Card>
          <Text style={styles.cardTitle}>📊 Detailed Metrics</Text>
          <MetricRow icon="🚦" label="Traffic Stops" value={`${m.traffic_stops || 0} stops`} />
          <MetricRow icon="😴" label="Idle Time" value={`${Math.round(m.idle_time_minutes || 0)} min`} />
          <MetricRow icon="⛽" label="Fuel Cost" value={`₹${(ride.fuel_cost || 0).toFixed(1)}`} />
          <MetricRow icon="📅" label="Total Duration" value={`${Math.round(m.duration_minutes || 0)} min`} />
          <MetricRow icon="📏" label="Distance" value={`${m.distance_km?.toFixed(2) || '0.00'} km`} />
          <MetricRow icon="🌡️" label="Avg Speed" value={`${m.average_speed_kmh?.toFixed(1) || '0.0'} km/h`} />
          <MetricRow icon="🏎️" label="Top Speed" value={`${m.top_speed_kmh?.toFixed(1) || '0.0'} km/h`} />
        </Card>

        {/* Score Breakdown */}
        <Card>
          <Text style={styles.cardTitle}>🏆 Score Breakdown</Text>
          <ScoreBar
            label="Smooth Acceleration"
            description="Low idle time = smooth riding"
            score={ride.score_breakdown?.smooth_acceleration ?? 0}
            max={25}
          />
          <ScoreBar
            label="Consistency"
            description="Fewer stops = more consistent"
            score={ride.score_breakdown?.consistency ?? 0}
            max={25}
          />
          <ScoreBar
            label="Completion"
            description="Distance covered vs expected commute"
            score={ride.score_breakdown?.completion ?? 0}
            max={25}
          />
          <ScoreBar
            label="Time Efficiency"
            description="Avg speed near 30 km/h urban ideal"
            score={ride.score_breakdown?.time_efficiency ?? 0}
            max={25}
          />
        </Card>

        {/* Score Tips */}
        <Card>
          <Text style={styles.cardTitle}>💡 Tips to Improve</Text>
          {tips.map((tip, idx) => (
            <View key={idx} style={styles.tipRow}>
              <Text style={styles.tipIcon}>{tip.icon}</Text>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipText}>{tip.text}</Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.favBtn, isFavourite && styles.favBtnActive]}
            onPress={toggleFavourite}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnIcon}>{isFavourite ? '⭐' : '☆'}</Text>
            <Text style={[styles.actionBtnLabel, isFavourite && styles.favBtnLabelActive]}>{isFavourite ? 'Favourited' : 'Favourite'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.shareBtn]} onPress={openSharePicker} activeOpacity={0.7}>
            <Text style={styles.actionBtnIcon}>📤</Text>
            <Text style={[styles.actionBtnLabel, { color: '#fff' }]}>Share</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Share Picker Modal */}
      <Modal visible={showSharePicker} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.shareModal}>
          <View style={[styles.shareHeader, { paddingTop: insets.top + Spacing.md }]}>
            <TouchableOpacity onPress={() => setShowSharePicker(false)}>
              <Text style={styles.shareCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.shareTitle}>Share Ride</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.shareList} showsVerticalScrollIndicator={false}>
            {/* Share to group */}
            {groups.length > 0 && (
              <>
                <Text style={styles.shareSectionTitle}>Share to a Group</Text>
                {groups.map((group) => (
                  <TouchableOpacity
                    key={group._id}
                    style={styles.shareGroupCard}
                    onPress={() => shareToGroup(group)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.shareGroupEmoji}>{group.avatar_emoji || '🏍️'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shareGroupName}>{group.name}</Text>
                      <Text style={styles.shareGroupMembers}>{group.members?.length || 0} members</Text>
                    </View>
                    <Text style={styles.shareGroupArrow}>›</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            <Text style={styles.shareSectionTitle}>Share Externally</Text>
            <TouchableOpacity style={styles.shareOption} onPress={shareSystem} activeOpacity={0.7}>
              <Text style={styles.shareOptionIcon}>📱</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.shareOptionTitle}>System Share</Text>
                <Text style={styles.shareOptionDesc}>WhatsApp, Messages, Email, etc.</Text>
              </View>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function MetricRow({ icon, label, value }) {
  return (
    <View style={metricStyles.row}>
      <Text style={metricStyles.icon}>{icon}</Text>
      <Text style={metricStyles.label}>{label}</Text>
      <Text style={metricStyles.value}>{value}</Text>
    </View>
  );
}

function ScoreBar({ label, description, score, max }) {
  const percent = max > 0 ? Math.min(100, (score / max) * 100) : 0;
  return (
    <View style={scoreBarStyles.container}>
      <View style={scoreBarStyles.header}>
        <Text style={scoreBarStyles.label}>{label}</Text>
        <Text style={scoreBarStyles.value}>{score.toFixed(0)}/{max}</Text>
      </View>
      {description ? <Text style={scoreBarStyles.desc}>{description}</Text> : null}
      <View style={scoreBarStyles.bar}>
        <View style={[scoreBarStyles.fill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  mapContainer: { position: 'relative', zIndex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  backButton: {
    position: 'absolute', left: 16, width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', ...Shadows.medium, zIndex: 10,
  },
  backButtonText: { fontSize: 28, color: Colors.text, fontWeight: '300', marginTop: -2 },
  scrollContainer: { flex: 1, zIndex: 2 },
  scrollContent: { paddingHorizontal: Spacing.lg },
  scoreHero: { alignItems: 'center', marginBottom: 20 },
  scoreCircleLarge: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: Colors.primary + '12', borderWidth: 4, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', ...Shadows.primary,
  },
  scoreNumberLarge: { fontSize: 40, fontWeight: '800', color: Colors.primary },
  scoreUnitLarge: { fontSize: 14, color: Colors.primary, fontWeight: '600', marginTop: -4 },
  scoreLabel: { ...Typography.body, marginTop: 8, fontWeight: '600' },
  routeNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  routeName: { ...Typography.h3, fontSize: 15, flex: 1 },
  editIcon: { fontSize: 14 },
  routeNameEditRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  routeNameInput: { ...Typography.h3, fontSize: 15, flex: 1, borderBottomWidth: 1, borderBottomColor: Colors.primary, paddingBottom: 2 },
  saveBtn: { padding: 8 },
  saveBtnText: { fontSize: 18, color: Colors.primary, fontWeight: '700' },
  routeMeta: { flexDirection: 'row', alignItems: 'center' },
  routeMetaText: { ...Typography.caption, fontSize: 12 },
  routeMetaDot: { marginHorizontal: 6, color: Colors.textMuted },
  bikeLabel: { ...Typography.small, marginTop: 6, color: Colors.primary, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 },
  statCard: { width: '48%', alignItems: 'center', paddingVertical: 14, marginBottom: 8 },
  statIcon: { fontSize: 22, marginBottom: 6 },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  statLabel: { ...Typography.small, marginTop: 2 },
  cardTitle: { ...Typography.h3, fontSize: 15, marginBottom: 12 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface, borderRadius: Radii.lg, paddingVertical: 14, ...Shadows.medium,
  },
  favBtnActive: { backgroundColor: Colors.primary + '15' },
  shareBtn: { backgroundColor: Colors.primary },
  actionBtnIcon: { fontSize: 18, marginRight: 8 },
  actionBtnLabel: { ...Typography.label, fontWeight: '700' },
  favBtnLabelActive: { color: Colors.primary },
  tipRow: { flexDirection: 'row', marginBottom: 14 },
  tipIcon: { fontSize: 20, marginRight: 12, marginTop: 2 },
  tipContent: { flex: 1 },
  tipTitle: { ...Typography.label, fontWeight: '700', marginBottom: 2 },
  tipText: { ...Typography.caption, fontSize: 12, lineHeight: 18 },
  // Share modal
  shareModal: { flex: 1, backgroundColor: Colors.background },
  shareHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  shareCancel: { color: Colors.textSecondary, fontSize: 16 },
  shareTitle: { ...Typography.h3 },
  shareList: { paddingHorizontal: Spacing.lg, paddingTop: 12 },
  shareSectionTitle: { ...Typography.label, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 8 },
  shareGroupCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: Radii.lg, padding: 14, marginBottom: 8, ...Shadows.small,
  },
  shareGroupEmoji: { fontSize: 24, marginRight: 12 },
  shareGroupName: { ...Typography.h3, fontSize: 15 },
  shareGroupMembers: { ...Typography.small, marginTop: 2 },
  shareGroupArrow: { fontSize: 22, color: Colors.textMuted },
  shareOption: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: Radii.lg, padding: 14, marginBottom: 8, ...Shadows.small,
  },
  shareOptionIcon: { fontSize: 24, marginRight: 12 },
  shareOptionTitle: { ...Typography.h3, fontSize: 15 },
  shareOptionDesc: { ...Typography.small, marginTop: 2 },
});

const metricStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  icon: { fontSize: 16, marginRight: 10 },
  label: { flex: 1, ...Typography.body, fontSize: 14, fontWeight: '500' },
  value: { ...Typography.body, fontWeight: '700', color: Colors.primary, fontSize: 14 },
});

const scoreBarStyles = StyleSheet.create({
  container: { marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  label: { ...Typography.body, fontSize: 13, fontWeight: '600' },
  value: { ...Typography.body, fontSize: 13, fontWeight: '700', color: Colors.primary },
  desc: { ...Typography.caption, fontSize: 11, marginBottom: 6 },
  bar: { height: 8, backgroundColor: Colors.borderLight, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
});
