import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { Colors, headerStyle } from '../lib/theme';

export default function HomeScreen({ navigation }) {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, headerStyle]}>Welcome to RideGP</Text>
      <Text style={styles.sub}>Location: {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'unknown'}</Text>
      <View style={{marginVertical:8}}>
        <Button title="Quick Start Ride" onPress={() => navigation.navigate('Ride')} color={Colors.primary} />
      </View>
      <View style={{height:8}} />
      <Button title="Community" onPress={() => navigation.navigate('Community')} />
      <View style={{height:12}} />
      <Button title="Sign out" onPress={signOut} color="#ff3b30" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, padding:20, justifyContent:'center', backgroundColor:Colors.background },
  title: { fontSize:28, fontWeight:'700', marginBottom:8, textAlign:'center' },
  sub: { textAlign:'center', marginBottom:20, color:Colors.muted }
});
