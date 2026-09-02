import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Shadows, Radii, Spacing } from '../lib/theme';
import { PrimaryButton, DangerButton, SecondaryButton, Card, StatItem } from '../lib/components';
import { API_URL } from '@env';
import { useFocusEffect } from '@react-navigation/native';

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Personal info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Garage
  const [bikes, setBikes] = useState([]);
  const [activeBikeId, setActiveBikeId] = useState(null);
  const [showAddBike, setShowAddBike] = useState(false);
  const [editingBike, setEditingBike] = useState(null);

  // Bike form
  const [bikeNickname, setBikeNickname] = useState('');
  const [bikeMake, setBikeMake] = useState('');
  const [bikeModel, setBikeModel] = useState('');
  const [bikeYear, setBikeYear] = useState('');
  const [bikeColor, setBikeColor] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [fuelEfficiency, setFuelEfficiency] = useState('40');
  const [fuelPrice, setFuelPrice] = useState('90');

  const serverUrl = (API_URL && API_URL.length > 0) ? API_URL : 'http://localhost:3000';

  const loadProfile = async () => {
    try {
      setLoading(true);
      const authToken = await AsyncStorage.getItem('authToken');
      const userData = await AsyncStorage.getItem('user');

      if (!authToken || !userData) {
        navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
        return;
      }

      const u = JSON.parse(userData);
      setUser(u);
      setName(u.name || '');
      setEmail(u.email || '');
      setPhone(u.phone_number || '');
      setBikes(u.bikes || []);
      setActiveBikeId(u.active_bike_id || null);
    } catch (err) {
      console.error('Load profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadProfile(); }, []));

  // ─── Save personal info ────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!name.trim()) { Alert.alert('Validation', 'Name is required'); return; }
    setSaving(true);
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      const res = await fetch(`${serverUrl}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ name: name.trim(), phone_number: phone.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setEditMode(false);
        Alert.alert('Success', 'Profile updated');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Bike CRUD ─────────────────────────────────────────────────
  const resetBikeForm = () => {
    setBikeNickname(''); setBikeMake(''); setBikeModel('');
    setBikeYear(''); setBikeColor(''); setRegNumber('');
    setFuelEfficiency('40'); setFuelPrice('90');
    setEditingBike(null);
  };

  const openAddBike = () => { resetBikeForm(); setShowAddBike(true); };

  const openEditBike = (bike) => {
    setEditingBike(bike);
    setBikeNickname(bike.nickname || '');
    setBikeMake(bike.make || '');
    setBikeModel(bike.model || '');
    setBikeYear(bike.year?.toString() || '');
    setBikeColor(bike.color || '');
    setRegNumber(bike.registration_number || '');
    setFuelEfficiency(bike.fuel_efficiency_kmpl?.toString() || '40');
    setFuelPrice(bike.fuel_price_per_liter?.toString() || '90');
    setShowAddBike(true);
  };

  const saveBike = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      const bikeData = {
        nickname: bikeNickname.trim() || bikeModel.trim() || bikeMake.trim() || 'New Bike',
        make: bikeMake.trim(), model: bikeModel.trim(),
        year: bikeYear ? parseInt(bikeYear) : null,
        color: bikeColor.trim(), registration_number: regNumber.trim(),
        fuel_efficiency_kmpl: parseFloat(fuelEfficiency) || 40,
        fuel_price_per_liter: parseFloat(fuelPrice) || 90,
      };

      let res;
      if (editingBike) {
        res = await fetch(`${serverUrl}/api/auth/bikes/${editingBike.bike_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify(bikeData),
        });
      } else {
        res = await fetch(`${serverUrl}/api/auth/bikes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify(bikeData),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Error', data.error || 'Failed to save bike');
        return;
      }
      setBikes(data.bikes);
      if (data.active_bike_id) setActiveBikeId(data.active_bike_id);
      const userData = await AsyncStorage.getItem('user');
      const u = JSON.parse(userData);
      u.bikes = data.bikes;
      if (data.active_bike_id) u.active_bike_id = data.active_bike_id;
      await AsyncStorage.setItem('user', JSON.stringify(u));
      setShowAddBike(false);
      resetBikeForm();
      Alert.alert('Success', editingBike ? 'Bike updated' : 'Bike added to garage');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const removeBike = async (bikeId) => {
    Alert.alert('Remove Bike', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            const authToken = await AsyncStorage.getItem('authToken');
            const res = await fetch(`${serverUrl}/api/auth/bikes/${bikeId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${authToken}` },
            });
            if (res.ok) {
              const data = await res.json();
              setBikes(data.bikes);
              setActiveBikeId(data.active_bike_id);
              const userData = await AsyncStorage.getItem('user');
              const u = JSON.parse(userData);
              u.bikes = data.bikes;
              u.active_bike_id = data.active_bike_id;
              await AsyncStorage.setItem('user', JSON.stringify(u));
            }
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        }
      }
    ]);
  };

  const activateBike = async (bikeId) => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      const res = await fetch(`${serverUrl}/api/auth/bikes/${bikeId}/activate`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveBikeId(data.active_bike_id);
        const userData = await AsyncStorage.getItem('user');
        const u = JSON.parse(userData);
        u.active_bike_id = data.active_bike_id;
        await AsyncStorage.setItem('user', JSON.stringify(u));
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  async function handleSignOut() {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('user');
    navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
  }

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.lg }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar Hero */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0)?.toUpperCase() || 'U'}</Text>
        </View>
        <Text style={styles.userName}>{name}</Text>
        <Text style={styles.userEmail}>{email}</Text>
      </View>

      {/* Edit Toggle */}
      <TouchableOpacity onPress={() => setEditMode(!editMode)} style={styles.editBtn} activeOpacity={0.7}>
        <Text style={styles.editBtnText}>{editMode ? 'Cancel' : '✏️ Edit Profile'}</Text>
      </TouchableOpacity>

      {/* Personal Info */}
      <Card>
        <Text style={styles.sectionTitle}>👤 Personal Info</Text>
        <FormField label="Name" value={name} onChangeText={setName} editable={editMode} />
        <FormField label="Email" value={email} editable={false} />
        <FormField label="Phone" value={phone} onChangeText={setPhone} editable={editMode} keyboardType="phone-pad" placeholder="Optional" />
        {editMode && (
          <PrimaryButton title={saving ? 'Saving...' : 'Save'} onPress={handleSaveProfile} loading={saving} small style={{ marginTop: 8 }} />
        )}
      </Card>

      {/* Garage */}
      <Card>
        <View style={styles.garageHeader}>
          <Text style={styles.sectionTitle}>🏍️ My Garage</Text>
          <TouchableOpacity onPress={openAddBike} style={styles.addBikeBtn} activeOpacity={0.7}>
            <Text style={styles.addBikeBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {bikes.length === 0 ? (
          <View style={styles.emptyGarage}>
            <Text style={styles.emptyGarageIcon}>🏍️</Text>
            <Text style={styles.emptyGarageText}>No bikes yet</Text>
            <Text style={styles.emptyGarageSubtext}>Add your first bike to get started</Text>
          </View>
        ) : (
          bikes.map((bike) => {
            const isActive = bike.bike_id === activeBikeId;
            const displayName = bike.nickname || `${bike.make} ${bike.model}`.trim() || 'My Bike';
            return (
              <TouchableOpacity
                key={bike.bike_id}
                style={[styles.bikeCard, isActive && styles.bikeCardActive]}
                onPress={() => activateBike(bike.bike_id)}
                activeOpacity={0.7}
              >
                <View style={styles.bikeInfo}>
                  <View style={styles.bikeNameRow}>
                    <Text style={styles.bikeName}>{displayName}</Text>
                    {isActive && <Text style={styles.activeBadge}>Active</Text>}
                  </View>
                  <Text style={styles.bikeDetails}>
                    {[bike.make, bike.model, bike.year].filter(Boolean).join(' · ') || 'No details'}
                  </Text>
                  {bike.registration_number ? (
                    <Text style={styles.bikeReg}>📋 {bike.registration_number}</Text>
                  ) : null}
                </View>
                <View style={styles.bikeActions}>
                  <TouchableOpacity onPress={() => openEditBike(bike)} style={styles.bikeActionBtn}>
                    <Text style={styles.bikeActionText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeBike(bike.bike_id)} style={styles.bikeActionBtn}>
                    <Text style={[styles.bikeActionText, { color: Colors.error }]}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </Card>

      {/* Stats */}
      <Card>
        <Text style={styles.sectionTitle}>📊 Statistics</Text>
        <View style={styles.statsGrid}>
          <StatItem value={user?.total_rides || 0} label="Rides" icon="🏍️" />
          <StatItem value={`${(user?.total_distance_km || 0).toFixed(0)} km`} label="Distance" icon="📏" />
          <StatItem value={(user?.average_ride_score || 0).toFixed(0)} label="Avg Score" icon="📊" />
          <StatItem value={`${Math.round(user?.total_ride_time_minutes || 0)} min`} label="Time" icon="⏱️" />
        </View>
      </Card>

      <DangerButton title="🚪 Sign Out" onPress={handleSignOut} style={{ marginBottom: 100 }} />

      {/* ─── Add/Edit Bike Modal ────────────────────────────────── */}
      <Modal visible={showAddBike} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + Spacing.md }]}>
            <TouchableOpacity onPress={() => { setShowAddBike(false); resetBikeForm(); }}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingBike ? 'Edit Bike' : 'Add Bike'}</Text>
            <TouchableOpacity onPress={saveBike}>
              <Text style={styles.modalSave}>{editingBike ? 'Update' : 'Add'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <FormField label="Nickname" value={bikeNickname} onChangeText={setBikeNickname} placeholder="e.g. My Daily Rider" />
            <View style={styles.formRow}>
              <FormField label="Make" value={bikeMake} onChangeText={setBikeMake} placeholder="Honda" style={{ flex: 1, marginRight: 8 }} />
              <FormField label="Model" value={bikeModel} onChangeText={setBikeModel} placeholder="CB350" style={{ flex: 1 }} />
            </View>
            <View style={styles.formRow}>
              <FormField label="Year" value={bikeYear} onChangeText={setBikeYear} placeholder="2022" keyboardType="number-pad" style={{ flex: 1, marginRight: 8 }} />
              <FormField label="Color" value={bikeColor} onChangeText={setBikeColor} placeholder="Red" style={{ flex: 1 }} />
            </View>
            <FormField label="Registration Number" value={regNumber} onChangeText={setRegNumber} placeholder="DL01AB1234" autoCapitalize="characters" />
            <View style={styles.formRow}>
              <FormField label="Fuel Efficiency (km/l)" value={fuelEfficiency} onChangeText={setFuelEfficiency} placeholder="40" keyboardType="decimal-pad" style={{ flex: 1, marginRight: 8 }} />
              <FormField label="Fuel Price (₹/l)" value={fuelPrice} onChangeText={setFuelPrice} placeholder="90" keyboardType="decimal-pad" style={{ flex: 1 }} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

function FormField({ label, value, onChangeText, editable = true, placeholder, keyboardType, autoCapitalize, style }) {
  return (
    <View style={[fieldStyles.container, style]}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, !editable && fieldStyles.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: Spacing.lg },
  loadingContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12, ...Shadows.primary },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  userName: { ...Typography.h1, fontSize: 24, textAlign: 'center' },
  userEmail: { ...Typography.caption, textAlign: 'center', marginTop: 2 },
  editBtn: { alignSelf: 'center', backgroundColor: Colors.primary + '12', paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radii.full, marginBottom: 20 },
  editBtnText: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
  sectionTitle: { ...Typography.h3, fontSize: 16, marginBottom: 14 },
  garageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  addBikeBtn: { backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radii.sm },
  addBikeBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyGarage: { alignItems: 'center', paddingVertical: 24 },
  emptyGarageIcon: { fontSize: 40, marginBottom: 8 },
  emptyGarageText: { ...Typography.h3, fontSize: 15 },
  emptyGarageSubtext: { ...Typography.caption, marginTop: 4 },
  bikeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.borderLight, borderRadius: Radii.md, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: 'transparent' },
  bikeCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '08' },
  bikeInfo: { flex: 1 },
  bikeNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  bikeName: { ...Typography.h3, fontSize: 15 },
  activeBadge: { marginLeft: 8, fontSize: 10, fontWeight: '700', color: Colors.primary, backgroundColor: Colors.primary + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radii.full },
  bikeDetails: { ...Typography.caption, fontSize: 12 },
  bikeReg: { ...Typography.small, fontSize: 11, marginTop: 2 },
  bikeActions: { flexDirection: 'row' },
  bikeActionBtn: { padding: 8 },
  bikeActionText: { fontSize: 16 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalCancel: { color: Colors.textSecondary, fontSize: 16 },
  modalTitle: { ...Typography.h3 },
  modalSave: { color: Colors.primary, fontSize: 16, fontWeight: '700' },
  modalContent: { padding: Spacing.lg },
  formRow: { flexDirection: 'row' },
});

const fieldStyles = StyleSheet.create({
  container: { marginBottom: 14 },
  label: { ...Typography.label, fontSize: 12, marginBottom: 5 },
  input: { backgroundColor: Colors.borderLight, borderRadius: Radii.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: 'transparent' },
  inputDisabled: { opacity: 0.7 },
});
