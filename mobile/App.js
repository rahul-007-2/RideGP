import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';

// Import screens
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import RideScreen from './src/screens/RideScreen';
import RideHistoryScreen from './src/screens/RideHistoryScreen';
import AchievementsScreen from './src/screens/AchievementsScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import MonthlyWrappedScreen from './src/screens/MonthlyWrappedScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import BroadcastScreen from './src/screens/BroadcastScreen';

import { registerForPushNotificationsAsync } from './src/lib/notifications';

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth token
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const userData = await AsyncStorage.getItem('user');
        
        if (token && userData) {
          setUser(JSON.parse(userData));
        }
        setLoading(false);
      } catch (err) {
        console.error('Auth check error:', err);
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      registerForPushNotificationsAsync(user);
    }
  }, [user]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: '#fff' }
          }}
        >
          {user ? (
            <>
              <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'RideGP' }} />
              <Stack.Screen name="Ride" component={RideScreen} options={{ title: 'Track Ride' }} />
              <Stack.Screen name="History" component={RideHistoryScreen} options={{ title: 'Ride History' }} />
              <Stack.Screen name="Achievements" component={AchievementsScreen} options={{ title: 'Achievements' }} />
              <Stack.Screen name="Community" component={CommunityScreen} options={{ title: 'Community' }} />
              <Stack.Screen name="Wrapped" component={MonthlyWrappedScreen} options={{ title: 'Monthly Wrapped' }} />
              <Stack.Screen name="Insights" component={InsightsScreen} options={{ title: 'Insights' }} />
              <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
              <Stack.Screen name="Broadcast" component={BroadcastScreen} options={{ title: 'Broadcast' }} />
            </>
          ) : (
            <Stack.Screen 
              name="Auth" 
              component={(props) => <AuthScreen {...props} onLoginSuccess={handleLoginSuccess} />}
              options={{ headerShown: false, animationEnabled: false }} 
            />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
