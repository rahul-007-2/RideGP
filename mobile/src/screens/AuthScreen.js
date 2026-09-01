import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, headerStyle } from '../lib/theme';
import { API_URL } from '@env';

export default function AuthScreen({ navigation, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [bikeModel, setBikeModel] = useState('');
  const [mode, setMode] = useState('signIn'); // signIn or signUp
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const serverUrl = (API_URL && API_URL.length > 0) ? API_URL : 'http://localhost:3000';

  async function handleAuth() {
    try {
      setError('');
      setLoading(true);

      if (mode === 'signIn') {
        if (!email || !password) {
          setError('Email and password required');
          setLoading(false);
          return;
        }

        const response = await fetch(`${serverUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Login failed');

        // Save token and user data
        await AsyncStorage.setItem('authToken', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        
        // Trigger app state update
        if (onLoginSuccess) {
          onLoginSuccess(data.user);
        }
      } else {
        if (!email || !password || !name) {
          setError('Email, name, and password required');
          setLoading(false);
          return;
        }

        // Register
        const response = await fetch(`${serverUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Registration failed');

        // Save token and user data
        await AsyncStorage.setItem('authToken', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));

        // Update profile with bike model if provided
        if (bikeModel) {
          try {
            await fetch(`${serverUrl}/api/auth/profile`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${data.token}`
              },
              body: JSON.stringify({ bike_model: bikeModel })
            });
          } catch (err) {
            console.warn('Could not update bike model:', err.message);
          }
        }

        // Trigger app state update
        if (onLoginSuccess) {
          onLoginSuccess(data.user);
        }
      }
    } catch (err) {
      setError(err.message);
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: Colors.background }]}>
      <Text style={[styles.title, headerStyle]}>RideGP 🏍️</Text>
      <Text style={styles.subtitle}>Track your rides. Ride smarter.</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        keyboardType="email-address"
        editable={!loading}
        placeholderTextColor="#999"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
        editable={!loading}
        placeholderTextColor="#999"
      />

      {mode === 'signUp' && (
        <>
          <TextInput
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
            editable={!loading}
            placeholderTextColor="#999"
          />
          <TextInput
            placeholder="Bike Model (optional)"
            value={bikeModel}
            onChangeText={setBikeModel}
            style={styles.input}
            editable={!loading}
            placeholderTextColor="#999"
          />
        </>
      )}

      <View style={{ marginTop: 20 }}>
        <Button
          title={loading ? 'Loading...' : (mode === 'signIn' ? 'Sign In' : 'Create Account')}
          onPress={handleAuth}
          color={Colors.primary}
          disabled={loading}
        />
      </View>

      <Text
        style={styles.switch}
        onPress={() => {
          if (!loading) {
            setMode(mode === 'signIn' ? 'signUp' : 'signIn');
            setError('');
          }
        }}
      >
        {mode === 'signIn' ? '📝 Need an account? Sign up' : '✓ Have an account? Sign in'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    minHeight: '100%'
  },
  input: {
    borderWidth: 1,
    borderColor: '#e6eefb',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: Colors.card,
    color: '#000'
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
    color: Colors.muted
  },
  switch: {
    color: Colors.primary,
    marginTop: 16,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500'
  },
  error: {
    color: '#ff3b30',
    marginBottom: 12,
    textAlign: 'center',
    padding: 10,
    backgroundColor: '#ffe6e6',
    borderRadius: 8
  }
});
