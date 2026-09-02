import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Shadows, Radii, Spacing } from '../lib/theme';
import { PrimaryButton, TextButton } from '../lib/components';
import { API_URL } from '@env';

export default function AuthScreen({ navigation, onLoginSuccess }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [bikeModel, setBikeModel] = useState('');
  const [mode, setMode] = useState('signIn');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const serverUrl = (API_URL && API_URL.length > 0) ? API_URL : 'http://localhost:3000';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const switchMode = (newMode) => {
    if (loading) return;
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -10, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setMode(newMode);
      setError('');
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    });
  };

  async function handleAuth() {
    try {
      setError('');
      setLoading(true);

      if (mode === 'signIn') {
        if (!email || !password) {
          setError('Email and password are required');
          setLoading(false);
          return;
        }

        const response = await fetch(`${serverUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Login failed');

        await AsyncStorage.setItem('authToken', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        if (onLoginSuccess) onLoginSuccess(data.user);
      } else {
        if (!email || !password || !name) {
          setError('Name, email and password are required');
          setLoading(false);
          return;
        }

        const response = await fetch(`${serverUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Registration failed');

        await AsyncStorage.setItem('authToken', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));

        if (bikeModel) {
          try {
            await fetch(`${serverUrl}/api/auth/profile`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${data.token}`,
              },
              body: JSON.stringify({ bike_model: bikeModel }),
            });
          } catch (err) {
            console.warn('Could not update bike model:', err.message);
          }
        }

        if (onLoginSuccess) onLoginSuccess(data.user);
      }
    } catch (err) {
      setError(err.message);
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🏍️</Text>
          <Text style={styles.heroTitle}>RideGP</Text>
          <Text style={styles.heroSubtitle}>Track your rides. Ride smarter.</Text>
        </View>

        {/* Auth Form */}
        <Animated.View style={[styles.formCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {/* Tab Switcher */}
          <View style={styles.tabSwitcher}>
            <TouchableOpacity
              style={[styles.tab, mode === 'signIn' && styles.tabActive]}
              onPress={() => switchMode('signIn')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, mode === 'signIn' && styles.tabTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'signUp' && styles.tabActive]}
              onPress={() => switchMode('signUp')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, mode === 'signUp' && styles.tabTextActive]}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Inputs */}
          {mode === 'signUp' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                placeholder="John Doe"
                value={name}
                onChangeText={setName}
                style={styles.input}
                editable={!loading}
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              placeholder="you@email.com"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              secureTextEntry
              editable={!loading}
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {mode === 'signUp' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bike Model (optional)</Text>
              <TextInput
                placeholder="e.g. KTM Duke 390"
                value={bikeModel}
                onChangeText={setBikeModel}
                style={styles.input}
                editable={!loading}
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          )}

          {/* Submit */}
          <PrimaryButton
            title={mode === 'signIn' ? 'Sign In' : 'Create Account'}
            onPress={handleAuth}
            loading={loading}
            disabled={loading}
            style={{ marginTop: Spacing.sm }}
            icon={mode === 'signIn' ? '🚀' : '✨'}
          />
        </Animated.View>

        {/* Footer */}
        <Text style={styles.footer}>
          {mode === 'signIn' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <Text
            style={styles.footerLink}
            onPress={() => switchMode(mode === 'signIn' ? 'signUp' : 'signIn')}
          >
            {mode === 'signIn' ? 'Sign Up' : 'Sign In'}
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 40,
  },
  heroEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    ...Typography.subtitle,
    marginTop: 6,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    marginBottom: 24,
    ...Shadows.large,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: Colors.borderLight,
    borderRadius: Radii.md,
    padding: 3,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radii.sm - 1,
  },
  tabActive: {
    backgroundColor: Colors.surface,
    ...Shadows.small,
  },
  tabText: {
    ...Typography.label,
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    ...Typography.label,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.borderLight,
    borderRadius: Radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  errorBox: {
    backgroundColor: Colors.error + '10',
    borderRadius: Radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.error + '25',
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
