import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TASK_NAME = 'RIDE_TRACKING_TASK';

// Define the background task — runs even when app is killed
TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background task error', error);
    return;
  }
  if (data && data.locations) {
    try {
      const { locations } = data;
      const existing = await AsyncStorage.getItem('in_progress_ride');
      const current = existing ? JSON.parse(existing) : { points: [] };

      for (const loc of locations) {
        const point = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: Date.now(),
          speed_kmh: loc.coords.speed != null ? Math.abs(loc.coords.speed) * 3.6 : 0,
          altitude: loc.coords.altitude || null,
          accuracy: loc.coords.accuracy || null,
        };
        current.points.push(point);
      }

      await AsyncStorage.setItem('in_progress_ride', JSON.stringify(current));
    } catch (err) {
      console.warn('Background save failed', err.message);
    }
  }
});

/**
 * Request all necessary permissions for background tracking
 */
export async function requestTrackingPermissions() {
  // 1. Foreground location permission
  const fgStatus = await Location.requestForegroundPermissionsAsync();
  if (fgStatus.status !== 'granted') {
    return { granted: false, reason: 'foreground' };
  }

  // 2. Background location permission (required for tracking when minimized)
  const bgStatus = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus.status !== 'granted') {
    return { granted: false, reason: 'background' };
  }

  // 3. Notification permission (needed for foreground service notification on Android)
  const notifStatus = await Notifications.requestPermissionsAsync();
  if (notifStatus.status !== 'granted') {
    // Notifications are nice-to-have, not critical
    console.warn('Notification permission not granted');
  }

  return { granted: true };
}

/**
 * Start background ride tracking.
 * This keeps recording GPS even when the app is minimized, in background, or killed.
 * Uses a foreground service on Android with a persistent notification.
 * Uses background location updates on iOS.
 */
export async function startBackgroundTracking() {
  try {
    // Check location services are enabled
    const hasServices = await Location.hasServicesEnabledAsync();
    if (!hasServices) {
      throw new Error('Location services are disabled. Please enable them in Settings.');
    }

    // Check if task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (isRegistered) {
      console.log('Background task already running');
      return true;
    }

    // Start location updates with foreground service
    await Location.startLocationUpdatesAsync(TASK_NAME, {
      // Accuracy
      accuracy: Location.Accuracy.High,
      timeInterval: 3000,        // Update every 3 seconds
      distanceInterval: 5,       // Or every 5 meters (whichever comes first)
      deferredUpdatesInterval: 3000,
      deferredUpdatesDistance: 5,

      // Background behavior
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,

      // Android foreground service — keeps the app alive
      foregroundService: {
        notificationTitle: '🏍️ Freebuff — Ride Active',
        notificationBody: 'Recording your ride. Tap to return to the app.',
        notificationColor: '#0A84FF',
        // Android 14+ requires a specific service type (2 = GPS)
        // Location.ForegroundServiceType may be undefined in Expo Go
        ...(Platform.OS === 'android' ? {
          serviceType: (Location.ForegroundServiceType && Location.ForegroundServiceType.GPS) || 2,
        } : {}),
      },

      // iOS background location
      ...(Platform.OS === 'ios' ? {
        showsBackgroundLocationIndicator: true,
      } : {}),
    });

    // Save ride start time
    const existing = await AsyncStorage.getItem('in_progress_ride');
    if (!existing) {
      await AsyncStorage.setItem('in_progress_ride', JSON.stringify({
        points: [],
        started_at: new Date().toISOString(),
      }));
    }

    console.log('Background tracking started');
    return true;
  } catch (err) {
    console.error('startBackgroundTracking failed:', err.message);
    return false;
  }
}

/**
 * Stop background tracking and return all collected points
 */
export async function stopBackgroundTracking() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(TASK_NAME);
    }

    // Retrieve and clear saved points
    const existing = await AsyncStorage.getItem('in_progress_ride');
    const current = existing ? JSON.parse(existing) : null;
    await AsyncStorage.removeItem('in_progress_ride');

    console.log('Background tracking stopped,', current?.points?.length || 0, 'points collected');
    return current?.points || [];
  } catch (err) {
    console.warn('stopBackgroundTracking error:', err.message);
    await AsyncStorage.removeItem('in_progress_ride');
    return [];
  }
}

/**
 * Check if background tracking is currently active
 */
export async function isTrackingActive() {
  try {
    return await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  } catch {
    return false;
  }
}

/**
 * Get in-progress ride data from storage
 */
export async function getInProgressRide() {
  try {
    const existing = await AsyncStorage.getItem('in_progress_ride');
    return existing ? JSON.parse(existing) : null;
  } catch {
    return null;
  }
}

/**
 * Clear in-progress ride data
 */
export async function clearInProgressRide() {
  await AsyncStorage.removeItem('in_progress_ride');
}
