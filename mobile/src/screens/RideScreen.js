import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { computeRideMetrics, estimateFuelCost, computeRideScore } from '../lib/rideUtils';
import { FUEL_EFFICIENCY_KM_PER_L, FUEL_PRICE_PER_L, API_URL } from '@env';
import { startBackgroundTracking, stopBackgroundTracking, getInProgressRide } from '../lib/background';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../lib/theme';

export default function RideScreen() {
  const [tracking, setTracking] = useState(false);
  const [points, setPoints] = useState([]);
  const [region, setRegion] = useState(null);
  const watchRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    (async ()=>{
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') Alert.alert('Permission required','Location permission is required to track rides');
      // check for in-progress ride from crash
      const inProg = await getInProgressRide();
      if (inProg && inProg.points && inProg.points.length>0) {
        Alert.alert('Resume ride','An in-progress ride was found. Resume collecting or discard?', [
          { text: 'Discard', onPress: async ()=> { await AsyncStorage.removeItem('in_progress_ride'); } },
          { text: 'Resume', onPress: ()=> setPoints(inProg.points) }
        ]);
      }
    })();
    return ()=> stopTracking();
  },[]);

  function sampleLocation(loc) {
    const point = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      timestamp: Date.now(),
      speed: loc.coords.speed != null ? loc.coords.speed*3.6 : null // m/s to km/h
    };
    setPoints(prev=>[...prev, point]);
    setRegion({ latitude: point.latitude, longitude: point.longitude, latitudeDelta:0.01, longitudeDelta:0.01 });
  }

  async function startTracking(){
    setPoints([]);
    setTracking(true);
    const started = await startBackgroundTracking();
    if (!started) {
      // fallback to foreground sampling
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      sampleLocation(loc);
      intervalRef.current = setInterval(async ()=>{
        const p = await Location.getCurrentPositionAsync({accuracy: Location.Accuracy.Balanced});
        sampleLocation(p);
      }, 4000);
    }
  }

  async function stopTracking(){
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setTracking(false);
    // stop background tracking and collect saved points
    const bgPoints = await stopBackgroundTracking();
    const allPoints = (points || []).concat(bgPoints || []);
    if (allPoints.length < 2) return Alert.alert('No ride recorded','Ride was too short to record.');
    const metrics = computeRideMetrics(allPoints);
    const fuelCost = estimateFuelCost(metrics.distance_km, Number(FUEL_EFFICIENCY_KM_PER_L||40), Number(FUEL_PRICE_PER_L||90));
    const score = computeRideScore(metrics);
    // save to Supabase and server ingestion
    try {
      const { data, error } = await supabase.from('rides').insert([{ metrics, geo: allPoints, fuel_cost: fuelCost, score }]);
      if (error) throw error;
      // also POST to server ingestion endpoint for MongoDB storage
      try {
        const serverUrl = (API_URL && API_URL.length>0) ? API_URL : 'http://localhost:3000';
        await fetch(`${serverUrl}/ingest-ride`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metrics, geo: allPoints, fuel_cost: fuelCost, score }) });
      } catch (err) {
        console.warn('server ingest failed', err.message);
      }
      Alert.alert('Ride saved', `Distance ${metrics.distance_km} km — Score ${score}`);
      setPoints([]);
      await AsyncStorage.removeItem('in_progress_ride');
    } catch (err) {
      console.warn('Save ride error', err.message);
      Alert.alert('Save failed', err.message);
    }
  }

  return (
    <View style={{flex:1}}>
      <MapView style={{flex:1}} region={region} showsUserLocation followsUserLocation>
        {points.length>0 && <Polyline coordinates={points.map(p=>({latitude:p.latitude,longitude:p.longitude}))} strokeWidth={4} strokeColor="#007AFF" />}
        {points.length>0 && <Marker coordinate={{latitude:points[points.length-1].latitude, longitude:points[points.length-1].longitude}} />}
      </MapView>
      <View style={[styles.controls,{backgroundColor:Colors.card}] }>
        <Button title={tracking? 'Stop Ride' : 'Start Ride'} onPress={() => tracking ? stopTracking() : startTracking()} color={tracking? Colors.accent:Colors.primary} />
        <View style={{height:8}} />
        <Button title="Preview Metrics" onPress={()=>{
          if (points.length<2) return Alert.alert('No data','Take a short ride to preview metrics');
          const metrics = computeRideMetrics(points);
          const fuelCost = estimateFuelCost(metrics.distance_km, Number(FUEL_EFFICIENCY_KM_PER_L||40), Number(FUEL_PRICE_PER_L||90));
          const score = computeRideScore(metrics);
          Alert.alert('Ride Metrics', `Distance: ${metrics.distance_km} km\nDuration: ${Math.round(metrics.duration_s)}s\nAvg: ${metrics.avg_speed_kmh} km/h\nTop: ${metrics.top_speed_kmh} km/h\nStops: ${metrics.stops}\nIdle: ${metrics.idle_time_s}s\nFuel est: ₹${fuelCost}\nScore: ${score}`);
        }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ controls: { padding:12, backgroundColor:'#fff' } });
