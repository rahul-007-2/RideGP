import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Shadows, Radii, Spacing } from '../lib/theme';
import { API_URL } from '@env';

export default function GroupChatScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { groupId, groupName } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [myUserId, setMyUserId] = useState(null);
  const flatListRef = useRef(null);
  const serverUrl = (API_URL && API_URL.length > 0) ? API_URL : 'http://localhost:3000';

  const loadMessages = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userData = await AsyncStorage.getItem('user');
      if (userData) setMyUserId(JSON.parse(userData).id || JSON.parse(userData)._id);

      const res = await fetch(`${serverUrl}/api/chat/groups/${groupId}/messages?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Load messages error:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadMessages(); }, []));

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  const sendMessage = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await fetch(`${serverUrl}/api/chat/groups/${groupId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
        setText('');
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Group messages by date
  const groupedMessages = [];
  let lastDate = '';
  for (const msg of messages) {
    const msgDate = formatDate(msg.created_at);
    if (msgDate !== lastDate) {
      groupedMessages.push({ type: 'date', date: msgDate, key: `date-${msgDate}` });
      lastDate = msgDate;
    }
    const senderId = msg.sender_id?._id || msg.sender_id;
    groupedMessages.push({ type: 'message', ...msg, isMe: senderId === myUserId, key: msg._id });
  }

  const renderItem = ({ item }) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateSeparator}>
          <Text style={styles.dateText}>{item.date}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.messageBubble, item.isMe ? styles.myMessage : styles.otherMessage]}>
        {!item.isMe && <Text style={styles.senderName}>{item.sender_name}</Text>}
        <Text style={[styles.messageText, item.isMe && styles.myMessageText]}>{item.text}</Text>
        <Text style={[styles.messageTime, item.isMe && styles.myMessageTime]}>{formatTime(item.created_at)}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{groupName}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={groupedMessages}
        renderItem={renderItem}
        keyExtractor={item => item.key}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatIcon}>💬</Text>
            <Text style={styles.emptyChatText}>No messages yet</Text>
            <Text style={styles.emptyChatSubtext}>Send the first message!</Text>
          </View>
        }
      />

      {/* Input */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
          activeOpacity={0.7}
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { fontSize: 26, color: Colors.text, fontWeight: '300', marginTop: -2 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { ...Typography.h3, fontSize: 16 },
  messagesList: { paddingHorizontal: Spacing.lg, paddingTop: 12, paddingBottom: 8 },
  dateSeparator: { alignItems: 'center', marginVertical: 12 },
  dateText: { ...Typography.small, backgroundColor: Colors.borderLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radii.full },
  messageBubble: {
    maxWidth: '78%', borderRadius: Radii.lg, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 6,
  },
  myMessage: { alignSelf: 'flex-end', backgroundColor: Colors.primary },
  otherMessage: { alignSelf: 'flex-start', backgroundColor: Colors.surface, ...Shadows.small },
  senderName: { ...Typography.small, fontSize: 11, color: Colors.primary, fontWeight: '600', marginBottom: 2 },
  messageText: { ...Typography.body, fontSize: 15, color: Colors.text },
  myMessageText: { color: '#fff' },
  messageTime: { fontSize: 10, color: Colors.textMuted, marginTop: 4, alignSelf: 'flex-end' },
  myMessageTime: { color: 'rgba(255,255,255,0.7)' },
  emptyChat: { alignItems: 'center', marginTop: 80 },
  emptyChatIcon: { fontSize: 48, marginBottom: 12 },
  emptyChatText: { ...Typography.h3, marginBottom: 4 },
  emptyChatSubtext: { ...Typography.caption },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Spacing.lg,
    paddingTop: 8, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  textInput: {
    flex: 1, backgroundColor: Colors.borderLight, borderRadius: Radii.xl,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: Colors.text,
    maxHeight: 100, marginRight: 10,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
