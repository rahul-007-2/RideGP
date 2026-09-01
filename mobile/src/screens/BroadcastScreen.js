import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Text } from 'react-native';
import { API_URL, ADMIN_EMAILS } from '@env';
import { supabase } from '../lib/supabase';
import { Colors, headerStyle } from '../lib/theme';

export default function BroadcastScreen() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    try {
      // Fetch tokens from server via API
      const res = await fetch(`${API_URL}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      alert('Broadcast sent');
      setTitle(''); setBody('');
    } catch (err) {
      alert(err.message);
    } finally { setSending(false); }
  }

  return (
    <View style={[styles.container,{backgroundColor:Colors.background}] }>
      <Text style={[styles.h, headerStyle]}>Broadcast</Text>
      <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={styles.input} />
      <TextInput placeholder="Message" value={body} onChangeText={setBody} style={[styles.input,{height:100}]} multiline />
      <Button title={sending ? 'Sending...' : 'Send'} onPress={send} disabled={sending} color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({ container: { padding:16, flex:1 }, input: { borderWidth:1,borderColor:'#eee',padding:8,marginBottom:8,borderRadius:8 }, h: { fontSize:20,fontWeight:'700',marginBottom:12 } });
