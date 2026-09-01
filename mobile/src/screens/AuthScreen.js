import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { Colors, headerStyle } from '../lib/theme';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('signIn');

  async function handleAuth() {
    try {
      if (mode === 'signIn') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <View style={[styles.container,{backgroundColor:Colors.background}]}> 
      <Text style={[styles.title, headerStyle]}>RideGP</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} style={styles.input} secureTextEntry />
      <View style={{marginTop:8}}>
        <Button title={mode === 'signIn' ? 'Sign in' : 'Create account'} onPress={handleAuth} color={Colors.primary} />
      </View>
      <Text style={styles.switch} onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}>
        {mode === 'signIn' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, justifyContent:'center', padding:20 },
  input: { borderWidth:1, borderColor:'#e6eefb', padding:12, borderRadius:12, marginBottom:12, backgroundColor:Colors.card },
  title: { fontSize:32, fontWeight:'700', textAlign:'center', marginBottom:20 },
  switch: { color:Colors.primary, marginTop:12, textAlign:'center' }
});
