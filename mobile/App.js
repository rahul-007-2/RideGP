import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';

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
import GroupChatScreen from './src/screens/GroupChatScreen';

import { registerForPushNotificationsAsync } from './src/lib/notifications';
import { Colors, Shadows } from './src/lib/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Tab Icon Component ───────────────────────────────────────────
function TabIcon({ emoji, focused }) {
  return (
    <View style={tabStyles.iconContainer}>
      <Text style={[tabStyles.icon, focused && tabStyles.iconFocused]}>{emoji}</Text>
      {focused && <View style={tabStyles.indicator} />}
    </View>
  );
}

// ─── Bottom Tab Navigator ─────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: tabStyles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: tabStyles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={RideHistoryScreen}
        options={{
          tabBarLabel: 'Rides',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="AchievementsTab"
        component={AchievementsScreen}
        options={{
          tabBarLabel: 'Awards',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏆" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Main App ─────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const userData = await AsyncStorage.getItem('user');
        if (token && userData) {
          setUser(JSON.parse(userData));
        }
      } catch (err) {
        console.error('Auth check error:', err);
      } finally {
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <Text style={styles.loadingEmoji}>🏍️</Text>
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 16 }} />
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: Colors.background },
            }}
          >
            {user ? (
              <>
                <Stack.Screen name="MainTabs" component={MainTabs} />
                <Stack.Screen name="Ride" component={RideScreen} options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="Community" component={CommunityScreen} />
                <Stack.Screen name="Insights" component={InsightsScreen} />
                <Stack.Screen name="Wrapped" component={MonthlyWrappedScreen} />
                <Stack.Screen name="Groups" component={BroadcastScreen} />
                <Stack.Screen name="GroupChat" component={GroupChatScreen} />
              </>
            ) : (
              <Stack.Screen
                name="Auth"
                component={(props) => <AuthScreen {...props} onLoginSuccess={handleLoginSuccess} />}
                options={{ animationEnabled: false }}
              />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    alignItems: 'center',
  },
  loadingEmoji: {
    fontSize: 56,
  },
});

const tabStyles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 88,
    backgroundColor: Colors.surface,
    borderTopWidth: 0,
    paddingTop: 8,
    paddingBottom: 28,
    ...Shadows.large,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 32,
  },
  icon: {
    fontSize: 22,
  },
  iconFocused: {
    transform: [{ scale: 1.1 }],
  },
  indicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 3,
  },
});
