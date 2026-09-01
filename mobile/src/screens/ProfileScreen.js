import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Button, ActivityIndicator, Alert,
  TouchableOpacity, SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../lib/theme';
import { API_URL } from '@env';
import { useFocusEffect } from '@react-navigation/native';

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // User fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Bike fields
  const [bikeYear, setBikeYear] = useState('');
  const [bikeMake, setBikeMake] = useState('');
  const [bikeModel, setBikeModel] = useState('');
  const [bikeColor, setBikeColor] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [fuelEfficiency, setFuelEfficiency] = useState('');
  const [fuelPrice, setFuelPrice] = useState('');
  const [lastService, setLastService] = useState('');

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

      const user = JSON.parse(userData);
      setUser(user);

      // Set user fields
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone_number || '');

      // Set bike fields
      const bike = user.bike_details || {};
      setBikeYear(bike.year ? bike.year.toString() : '');
      setBikeMake(bike.make || '');
      setBikeModel(bike.model || '');
      setBikeColor(bike.color || '');
      setRegNumber(bike.registration_number || '');
      setFuelEfficiency(bike.fuel_efficiency_kmpl ? bike.fuel_efficiency_kmpl.toString() : '40');
      setFuelPrice(bike.fuel_price_per_liter ? bike.fuel_price_per_liter.toString() : '90');
      setLastService(bike.last_service_date ? bike.last_service_date.split('T')[0] : '');
    } catch (err) {
      console.error('Load profile error:', err);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const handleSave = async () => {
    try {
      if (!name.trim() || !email.trim()) {
        Alert.alert('Validation', 'Name and email are required');
        return;
      }

      setSaving(true);
      const authToken = await AsyncStorage.getItem('authToken');

      const updateData = {
        name: name.trim(),
        phone_number: phone.trim(),
        bike_details: {
          make: bikeMake.trim(),
          model: bikeModel.trim(),
          year: bikeYear ? parseInt(bikeYear) : null,
          color: bikeColor.trim(),
          registration_number: regNumber.trim(),
          fuel_efficiency_kmpl: parseFloat(fuelEfficiency) || 40,
          fuel_price_per_liter: parseFloat(fuelPrice) || 90,
          last_service_date: lastService ? new Date(lastService).toISOString() : null
        }
      };

      const res = await fetch(`${serverUrl}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(updateData)
      });

      if (res.ok) {
        const data = await res.json();
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setEditMode(false);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        const error = await res.json();
        Alert.alert('Error', error.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Save error:', err);
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>⚙️ Profile</Text>
          <TouchableOpacity onPress={() => setEditMode(!editMode)}>
            <Text style={styles.editToggle}>{editMode ? 'Cancel' : '✏️ Edit'}</Text>
          </TouchableOpacity>
        </View>

        {/* User Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase() || 'U'}</Text>
          </View>
          <Text style={styles.userName}>{name}</Text>
          <Text style={styles.userEmail}>{email}</Text>
        </View>

        {/* User Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 User Information</Text>
          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={[styles.input, !editMode && styles.inputDisabled]}
                value={name}
                onChangeText={setName}
                editable={editMode}
                placeholder="Full name"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={email}
                editable={false}
                placeholder="Email"
              />
              <Text style={styles.helperText}>Email cannot be changed</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={[styles.input, !editMode && styles.inputDisabled]}
                value={phone}
                onChangeText={setPhone}
                editable={editMode}
                placeholder="Phone (optional)"
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        {/* Bike Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏍️ Bike Information</Text>
          <View style={styles.card}>
            <View style={styles.twoColumnRow}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Make</Text>
                <TextInput
                  style={[styles.input, !editMode && styles.inputDisabled]}
                  value={bikeMake}
                  onChangeText={setBikeMake}
                  editable={editMode}
                  placeholder="e.g., Honda"
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Model</Text>
                <TextInput
                  style={[styles.input, !editMode && styles.inputDisabled]}
                  value={bikeModel}
                  onChangeText={setBikeModel}
                  editable={editMode}
                  placeholder="e.g., CB350"
                />
              </View>
            </View>

            <View style={styles.twoColumnRow}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Year</Text>
                <TextInput
                  style={[styles.input, !editMode && styles.inputDisabled]}
                  value={bikeYear}
                  onChangeText={setBikeYear}
                  editable={editMode}
                  placeholder="e.g., 2022"
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Color</Text>
                <TextInput
                  style={[styles.input, !editMode && styles.inputDisabled]}
                  value={bikeColor}
                  onChangeText={setBikeColor}
                  editable={editMode}
                  placeholder="e.g., Red"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Registration Number</Text>
              <TextInput
                style={[styles.input, !editMode && styles.inputDisabled]}
                value={regNumber}
                onChangeText={setRegNumber}
                editable={editMode}
                placeholder="e.g., DL01AB1234"
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Last Service Date</Text>
              <TextInput
                style={[styles.input, !editMode && styles.inputDisabled]}
                value={lastService}
                onChangeText={setLastService}
                editable={editMode}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.twoColumnRow}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Fuel Efficiency (km/l)</Text>
                <TextInput
                  style={[styles.input, !editMode && styles.inputDisabled]}
                  value={fuelEfficiency}
                  onChangeText={setFuelEfficiency}
                  editable={editMode}
                  placeholder="40"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Fuel Price (₹/l)</Text>
                <TextInput
                  style={[styles.input, !editMode && styles.inputDisabled]}
                  value={fuelPrice}
                  onChangeText={setFuelPrice}
                  editable={editMode}
                  placeholder="90"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Statistics Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Statistics</Text>
          <View style={styles.card}>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Total Rides</Text>
                <Text style={styles.statValue}>{user?.total_rides || 0}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Distance</Text>
                <Text style={styles.statValue}>{(user?.total_distance_km || 0).toFixed(0)} km</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Avg Score</Text>
                <Text style={styles.statValue}>{(user?.average_ride_score || 0).toFixed(0)}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Time</Text>
                <Text style={styles.statValue}>{Math.round(user?.total_ride_time_minutes || 0)} min</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Save Button */}
        {editMode && (
          <View style={styles.saveButtonContainer}>
            <Button
              title={saving ? 'Saving...' : '✓ Save Changes'}
              onPress={handleSave}
              disabled={saving}
              color={Colors.primary}
            />
          </View>
        )}

        {/* Footer Spacing */}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700'
  },
  userDetails: {
    flex: 1
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4
  },
  userEmail: {
    fontSize: 13,
    color: Colors.muted
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12
  },
  formGroup: {
    marginBottom: 16
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6
  },
  input: {
    borderWidth: 1,
    borderColor: '#e6eefb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#000',
    backgroundColor: 'rgba(0,0,0,0.02)'
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)'
  },
  statLabel: {
    fontSize: 13,
    color: '#000'
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary
  },
  buttonContainer: {
    marginBottom: 20
  }
});
