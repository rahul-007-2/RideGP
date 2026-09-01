import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from './supabase';

export async function registerForPushNotificationsAsync(user) {
  if (!user) return null;
  let token = null;
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;
    const tokenObj = await Notifications.getExpoPushTokenAsync();
    token = tokenObj.data;
  } else {
    console.warn('Must use physical device for Push Notifications');
  }

  if (token) {
    try {
      await supabase.from('push_tokens').upsert({ user_id: user.id, token }, { onConflict: 'user_id' });
    } catch (err) {
      console.warn('Failed to save push token', err.message);
    }
  }
  return token;
}
