import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const TASK_NAME = 'RIDE_TRACKING_TASK';

TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background task error', error);
    return;
  }
  if (data) {
    const { locations } = data;
    try {
      const existing = await AsyncStorage.getItem('in_progress_ride');
      const current = existing ? JSON.parse(existing) : { points: [] };
      for (const loc of locations) {
        const point = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: Date.now(),
          speed: loc.coords.speed != null ? loc.coords.speed * 3.6 : null
        };
        current.points.push(point);
      }
      await AsyncStorage.setItem('in_progress_ride', JSON.stringify(current));
    } catch (err) {
      console.warn('Background save failed', err.message);
    }
  }
});

export async function startBackgroundTracking() {
  try {
    const has = await Location.hasServicesEnabledAsync();
    if (!has) throw new Error('Location services disabled');
    await Location.startLocationUpdatesAsync(TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 4000,
      distanceInterval: 2,
      foregroundService: {
        notificationTitle: 'RideGP: Tracking ride',
        notificationBody: 'Location is being used to track your ride',
      },
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
    });
    return true;
  } catch (err) {
    console.warn('startBackgroundTracking', err.message);
    return false;
  }
}

export async function stopBackgroundTracking() {
  try {
    await Location.stopLocationUpdatesAsync(TASK_NAME);
    // retrieve saved points and return
    const existing = await AsyncStorage.getItem('in_progress_ride');
    const current = existing ? JSON.parse(existing) : null;
    await AsyncStorage.removeItem('in_progress_ride');
    return current?.points || [];
  } catch (err) {
    console.warn('stopBackgroundTracking', err.message);
    return [];
  }
}

export async function getInProgressRide() {
  const existing = await AsyncStorage.getItem('in_progress_ride');
  return existing ? JSON.parse(existing) : null;
}

export async function clearInProgressRide() {
  await AsyncStorage.removeItem('in_progress_ride');
}
