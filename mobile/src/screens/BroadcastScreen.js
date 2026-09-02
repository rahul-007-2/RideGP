import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Shadows, Radii, Spacing } from '../lib/theme';
import { BackHeader, PrimaryButton, Card, EmptyState } from '../lib/components';
import { API_URL } from '@env';

export default function BroadcastScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [memberEmails, setMemberEmails] = useState('');

  const serverUrl = (API_URL && API_URL.length > 0) ? API_URL : 'http://localhost:3000';

  const loadGroups = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const res = await fetch(`${serverUrl}/api/chat/groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch (err) {
      console.error('Load groups error:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadGroups(); }, []));

  const createGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Group name is required');
      return;
    }

    setCreating(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      const emails = memberEmails
        .split(/[,;\s]+/)
        .map(e => e.trim())
        .filter(e => e.includes('@'));

      const res = await fetch(`${serverUrl}/api/chat/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDesc.trim(),
          member_emails: emails,
        }),
      });

      if (res.ok) {
        setShowCreate(false);
        setGroupName('');
        setGroupDesc('');
        setMemberEmails('');
        loadGroups();
        Alert.alert('Success', 'Group created!');
      } else {
        const data = await res.json();
        Alert.alert('Error', data.error || 'Failed to create group');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setCreating(false);
    }
  };

  const renderGroup = ({ item }) => (
    <TouchableOpacity
      style={styles.groupCard}
      onPress={() => navigation.navigate('GroupChat', { groupId: item._id, groupName: item.name })}
      activeOpacity={0.7}
    >
      <View style={styles.groupEmoji}>
        <Text style={styles.groupEmojiText}>{item.avatar_emoji || '🏍️'}</Text>
      </View>
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.groupMembers}>
          {item.members?.length || 0} member{(item.members?.length || 0) !== 1 ? 's' : ''}
        </Text>
        {item.last_message && (
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.last_message.sender_name}: {item.last_message.text}
          </Text>
        )}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <BackHeader
        title="Groups"
        navigation={navigation}
        rightAction="+ New"
        onRightPress={() => setShowCreate(true)}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={g => g._id}
          renderItem={renderGroup}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="👥"
              title="No groups yet"
              message="Create a group to start chatting with fellow riders"
            />
          }
        />
      )}

      {/* Create Group Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + Spacing.md }]}>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Group</Text>
            <TouchableOpacity onPress={createGroup} disabled={creating}>
              <Text style={styles.modalSave}>{creating ? '...' : 'Create'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Group Name</Text>
            <TextInput
              placeholder="e.g. Morning Commuters"
              value={groupName}
              onChangeText={setGroupName}
              style={styles.input}
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.inputLabel}>Description (optional)</Text>
            <TextInput
              placeholder="What's this group about?"
              value={groupDesc}
              onChangeText={setGroupDesc}
              style={styles.input}
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.inputLabel}>Add Members (emails, comma separated)</Text>
            <TextInput
              placeholder="friend@email.com, rider@email.com"
              value={memberEmails}
              onChangeText={setMemberEmails}
              style={styles.input}
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.hint}>You can also add members later from the chat.</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  groupCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radii.lg,
    padding: 16, marginBottom: 10, ...Shadows.medium,
  },
  groupEmoji: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: Colors.primary + '12',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  groupEmojiText: { fontSize: 22 },
  groupInfo: { flex: 1 },
  groupName: { ...Typography.h3, fontSize: 15 },
  groupMembers: { ...Typography.caption, marginTop: 2 },
  lastMessage: { ...Typography.small, marginTop: 4, color: Colors.textSecondary },
  chevron: { fontSize: 24, color: Colors.textMuted, fontWeight: '300' },
  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalCancel: { color: Colors.textSecondary, fontSize: 16 },
  modalTitle: { ...Typography.h3 },
  modalSave: { color: Colors.primary, fontSize: 16, fontWeight: '700' },
  modalContent: { padding: Spacing.lg },
  inputLabel: { ...Typography.label, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: Colors.borderLight, borderRadius: Radii.sm,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: Colors.text, borderWidth: 1, borderColor: 'transparent',
  },
  hint: { ...Typography.caption, marginTop: 12 },
});
