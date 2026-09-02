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
  Alert,
  Modal,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Shadows, Radii, Spacing } from '../lib/theme';
import { API_URL } from '@env';
import * as ImagePicker from 'expo-image-picker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function GroupChatScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { groupId, groupName } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [myUserId, setMyUserId] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [members, setMembers] = useState([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [pendingMedia, setPendingMedia] = useState(null); // { uri, base64, type }
  const [sendingMedia, setSendingMedia] = useState(false);
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

  const loadMembers = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await fetch(`${serverUrl}/api/chat/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.group?.members || []);
      }
    } catch (err) {
      console.error('Load members error:', err);
    }
  };

  useFocusEffect(useCallback(() => {
    loadMessages();
    loadMembers();
  }, []));

  useEffect(() => {
    const interval = setInterval(() => {
      loadMessages();
      loadMembers();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to photos to share images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.7,
      base64: true,
      videoMaxDuration: 30,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setPendingMedia({
        uri: asset.uri,
        base64: asset.base64,
        type: asset.type === 'video' ? 'video' : 'image',
      });
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      base64: true,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setPendingMedia({
        uri: asset.uri,
        base64: asset.base64,
        type: 'image',
      });
    }
  };

  const sendMediaMessage = async () => {
    if (!pendingMedia || sendingMedia) return;
    setSendingMedia(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await fetch(`${serverUrl}/api/chat/groups/${groupId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          text: text.trim() || '',
          media_url: `data:${pendingMedia.type === 'video' ? 'video' : 'image'}/jpeg;base64,${pendingMedia.base64}`,
          media_type: pendingMedia.type,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
        setText('');
        setPendingMedia(null);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (err) {
      console.error('Send media error:', err);
      Alert.alert('Error', 'Failed to send media');
    } finally {
      setSendingMedia(false);
    }
  };

  const sendMessage = async () => {
    if (pendingMedia) {
      return sendMediaMessage();
    }
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

  const addMember = async () => {
    if (!newMemberEmail.trim() || addingMember) return;
    const email = newMemberEmail.trim().toLowerCase();
    setAddingMember(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await fetch(`${serverUrl}/api/chat/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ member_emails: [email] }),
      });
      const data = await res.json();

      if (res.ok) {
        setMembers(data.group?.members || []);
        setNewMemberEmail('');
        setShowAddMember(false);
        Alert.alert('✅ Added', data.message || `${email} added`);

        const userData = await AsyncStorage.getItem('user');
        const userName = userData ? JSON.parse(userData).name : 'Someone';
        await fetch(`${serverUrl}/api/chat/groups/${groupId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ text: `👋 ${userName} added ${email} to the group` }),
        });
        loadMessages();
      } else {
        Alert.alert('Could not add', data.error || 'Unknown error');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Network error.');
    } finally {
      setAddingMember(false);
    }
  };

  const leaveGroup = async () => {
    Alert.alert('Leave Group', 'Are you sure you want to leave this group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('authToken');
            await fetch(`${serverUrl}/api/chat/groups/${groupId}/leave`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            });
            navigation.goBack();
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        }
      }
    ]);
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

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
        {item.media_url ? (
          <Image
            source={{ uri: item.media_url }}
            style={styles.messageImage}
            resizeMode="cover"
          />
        ) : null}
        {item.text ? (
          <Text style={[styles.messageText, item.isMe && styles.myMessageText]}>{item.text}</Text>
        ) : null}
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
        <TouchableOpacity style={styles.headerCenter} onPress={() => setShowMembers(true)}>
          <Text style={styles.headerTitle} numberOfLines={1}>{groupName}</Text>
          <Text style={styles.memberCount}>{members.length} member{members.length !== 1 ? 's' : ''}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowMembers(true)} style={styles.infoBtn}>
          <Text style={styles.infoBtnText}>ℹ️</Text>
        </TouchableOpacity>
      </View>

      {/* Pending media preview */}
      {pendingMedia && (
        <View style={styles.pendingMediaBar}>
          <Image source={{ uri: pendingMedia.uri }} style={styles.pendingMediaThumb} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.pendingMediaLabel}>
              {pendingMedia.type === 'video' ? '🎬 Video' : '🖼️ Photo'} ready to send
            </Text>
          </View>
          <TouchableOpacity onPress={() => setPendingMedia(null)} style={styles.pendingMediaRemove}>
            <Text style={{ fontSize: 18, color: Colors.error }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

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
        <TouchableOpacity style={styles.attachBtn} onPress={pickImage} activeOpacity={0.7}>
          <Text style={styles.attachBtnText}>📎</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.attachBtn} onPress={takePhoto} activeOpacity={0.7}>
          <Text style={styles.attachBtnText}>📷</Text>
        </TouchableOpacity>
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
          style={[styles.sendBtn, ((!text.trim() && !pendingMedia) || sending || sendingMedia) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={(!text.trim() && !pendingMedia) || sending || sendingMedia}
          activeOpacity={0.7}
        >
          {sending || sendingMedia ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendBtnText}>↑</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Members Panel */}
      <Modal visible={showMembers} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + Spacing.md }]}>
            <TouchableOpacity onPress={() => setShowMembers(false)}>
              <Text style={styles.modalCancel}>Done</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Members</Text>
            <TouchableOpacity onPress={() => { setShowAddMember(true); }}>
              <Text style={styles.modalAction}>+ Add</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.memberList} showsVerticalScrollIndicator={false}>
            {members.map((member) => (
              <View key={member._id} style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>{(member.name || 'U').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name || 'Unknown'}</Text>
                  <Text style={styles.memberEmail}>{member.email || ''}</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.addMemberBtn} onPress={() => setShowAddMember(true)}>
              <Text style={styles.addMemberBtnText}>+ Add New Member</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.leaveGroupBtn} onPress={leaveGroup}>
              <Text style={styles.leaveGroupBtnText}>🚪 Leave Group</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Add Member Modal */}
      <Modal visible={showAddMember} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.addMemberCard}>
            <Text style={styles.addMemberTitle}>Add Member</Text>
            <Text style={styles.addMemberHint}>Enter the email of a registered user</Text>
            <TextInput
              style={styles.addMemberInput}
              value={newMemberEmail}
              onChangeText={setNewMemberEmail}
              placeholder="friend@email.com"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              autoFocus
            />
            <View style={styles.addMemberActions}>
              <TouchableOpacity
                style={styles.addMemberCancel}
                onPress={() => { setShowAddMember(false); setNewMemberEmail(''); }}
              >
                <Text style={styles.addMemberCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addMemberSubmit, (!newMemberEmail.trim() || addingMember) && styles.addMemberSubmitDisabled]}
                onPress={addMember}
                disabled={!newMemberEmail.trim() || addingMember}
              >
                {addingMember ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.addMemberSubmitText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  memberCount: { ...Typography.small, marginTop: 2, color: Colors.textSecondary },
  infoBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  infoBtnText: { fontSize: 18 },
  messagesList: { paddingHorizontal: Spacing.lg, paddingTop: 12, paddingBottom: 8 },
  dateSeparator: { alignItems: 'center', marginVertical: 12 },
  dateText: { ...Typography.small, backgroundColor: Colors.borderLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radii.full },
  messageBubble: {
    maxWidth: '78%', borderRadius: Radii.lg, paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 6, overflow: 'hidden',
  },
  myMessage: { alignSelf: 'flex-end', backgroundColor: Colors.primary },
  otherMessage: { alignSelf: 'flex-start', backgroundColor: Colors.surface, ...Shadows.small },
  senderName: { ...Typography.small, fontSize: 11, color: Colors.primary, fontWeight: '600', marginBottom: 2 },
  messageImage: { width: SCREEN_WIDTH * 0.55, height: SCREEN_WIDTH * 0.4, borderRadius: Radii.sm, marginBottom: 4 },
  messageText: { ...Typography.body, fontSize: 15, color: Colors.text },
  myMessageText: { color: '#fff' },
  messageTime: { fontSize: 10, color: Colors.textMuted, marginTop: 4, alignSelf: 'flex-end' },
  myMessageTime: { color: 'rgba(255,255,255,0.7)' },
  emptyChat: { alignItems: 'center', marginTop: 80 },
  emptyChatIcon: { fontSize: 48, marginBottom: 12 },
  emptyChatText: { ...Typography.h3, marginBottom: 4 },
  emptyChatSubtext: { ...Typography.caption },
  // Pending media
  pendingMediaBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.lg, paddingVertical: 8,
  },
  pendingMediaThumb: { width: 48, height: 48, borderRadius: 8 },
  pendingMediaLabel: { ...Typography.small, fontWeight: '600', color: Colors.primary },
  pendingMediaRemove: { padding: 8 },
  // Input
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Spacing.lg,
    paddingTop: 8, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  attachBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 2,
  },
  attachBtnText: { fontSize: 16 },
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
  // Modal styles
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalCancel: { color: Colors.textSecondary, fontSize: 16 },
  modalTitle: { ...Typography.h3 },
  modalAction: { color: Colors.primary, fontSize: 16, fontWeight: '700' },
  memberList: { paddingHorizontal: Spacing.lg, paddingTop: 12 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  memberAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  memberAvatarText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  memberInfo: { flex: 1 },
  memberName: { ...Typography.body, fontWeight: '600', fontSize: 15 },
  memberEmail: { ...Typography.small, marginTop: 2, color: Colors.textSecondary },
  addMemberBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary + '10', borderRadius: Radii.lg,
    padding: 16, marginTop: 20,
  },
  addMemberBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
  leaveGroupBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.error + '10', borderRadius: Radii.lg,
    padding: 16, marginTop: 12, marginBottom: 40,
  },
  leaveGroupBtnText: { color: Colors.error, fontWeight: '700', fontSize: 15 },
  // Add member overlay
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  addMemberCard: {
    backgroundColor: Colors.surface, borderRadius: Radii.xl, padding: 24,
    width: '100%', maxWidth: 400, ...Shadows.large,
  },
  addMemberTitle: { ...Typography.h2, fontSize: 20, marginBottom: 4 },
  addMemberHint: { ...Typography.caption, marginBottom: 16 },
  addMemberInput: {
    backgroundColor: Colors.borderLight, borderRadius: Radii.sm,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: Colors.text, borderWidth: 1, borderColor: 'transparent', marginBottom: 20,
  },
  addMemberActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  addMemberCancel: { paddingHorizontal: 20, paddingVertical: 10 },
  addMemberCancelText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600' },
  addMemberSubmit: {
    backgroundColor: Colors.primary, borderRadius: Radii.sm,
    paddingHorizontal: 24, paddingVertical: 10, minWidth: 80, alignItems: 'center',
  },
  addMemberSubmitDisabled: { opacity: 0.5 },
  addMemberSubmitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
