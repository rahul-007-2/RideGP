import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, Alert } from 'react-native';
import { API_URL } from '@env';
import { Colors, Typography, Radii, Spacing, Shadows } from '../lib/theme';
import { BackHeader, Card, PrimaryButton } from '../lib/components';

export default function BroadcastScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const serverUrl = (API_URL && API_URL.length > 0) ? API_URL : 'http://localhost:3000';

  async function send() {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Missing fields', 'Please enter both a title and message');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${serverUrl}/api/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      Alert.alert('Success', 'Broadcast sent successfully!');
      setTitle('');
      setBody('');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.container}>
      <BackHeader title="Broadcast" navigation={navigation} />

      <Card style={styles.card}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          placeholder="Broadcast title"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          placeholderTextColor={Colors.textMuted}
          editable={!sending}
        />

        <Text style={styles.label}>Message</Text>
        <TextInput
          placeholder="Write your message..."
          value={body}
          onChangeText={setBody}
          style={[styles.input, styles.textArea]}
          multiline
          placeholderTextColor={Colors.textMuted}
          editable={!sending}
        />

        <PrimaryButton
          title={sending ? 'Sending...' : '📢 Send Broadcast'}
          onPress={send}
          loading={sending}
          disabled={sending || !title.trim() || !body.trim()}
          style={{ marginTop: Spacing.sm }}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  card: {
    marginHorizontal: Spacing.lg,
  },
  label: {
    ...Typography.label,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.borderLight,
    borderRadius: Radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
});
