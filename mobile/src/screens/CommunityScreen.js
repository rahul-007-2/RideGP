import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Shadows, Radii, Spacing } from '../lib/theme';
import { BackHeader, PrimaryButton, SecondaryButton, Card, EmptyState } from '../lib/components';
import { API_URL } from '@env';
import * as ImagePicker from 'expo-image-picker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function PostItem({ item }) {
  return (
    <Card style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.postAvatar}>
          <Text style={styles.postAvatarText}>{(item.user_name || 'A').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.postMeta}>
          <Text style={styles.postAuthor}>{item.user_name || 'Anonymous'}</Text>
          <Text style={styles.postDate}>
            {new Date(item.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
      <Text style={styles.postTitle}>{item.title}</Text>
      {item.content ? <Text style={styles.postContent}>{item.content}</Text> : null}
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.postImage} resizeMode="cover" />
      ) : null}
      {item.video_url ? (
        <Image source={{ uri: item.video_url }} style={styles.postImage} resizeMode="cover" />
      ) : null}
    </Card>
  );
}

export default function CommunityScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingMedia, setPendingMedia] = useState(null);

  const serverUrl = (API_URL && API_URL.length > 0) ? API_URL : 'http://localhost:3000';

  const fetchPosts = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) return;

      const res = await fetch(`${serverUrl}/api/community/posts`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Fetch posts error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to photos to attach images.');
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

  async function createPost() {
    if (!title.trim()) return;
    setPosting(true);
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      const body = {
        title: title.trim(),
        content: content.trim(),
      };
      if (pendingMedia) {
        const dataUrl = `data:${pendingMedia.type === 'video' ? 'video' : 'image'}/jpeg;base64,${pendingMedia.base64}`;
        if (pendingMedia.type === 'video') {
          body.video_url = dataUrl;
        } else {
          body.image_url = dataUrl;
        }
      }
      const res = await fetch(`${serverUrl}/api/community/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setTitle('');
        setContent('');
        setPendingMedia(null);
        fetchPosts();
      } else {
        const data = await res.json();
        Alert.alert('Error', data.error || 'Failed to create post');
      }
    } catch (err) {
      console.error('Create post error:', err);
      Alert.alert('Error', 'Failed to create post');
    } finally {
      setPosting(false);
    }
  }

  return (
    <View style={styles.container}>
      <BackHeader title="Community" navigation={navigation} />

      <FlatList
        data={posts}
        keyExtractor={(p) => p._id || p.id?.toString() || Math.random().toString()}
        renderItem={({ item }) => <PostItem item={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPosts(); }} tintColor={Colors.primary} />}
        ListHeaderComponent={
          <Card style={styles.composeCard}>
            <Text style={styles.composeTitle}>New Post</Text>
            <TextInput
              placeholder="What's on your mind?"
              value={title}
              onChangeText={setTitle}
              style={styles.composeTitleInput}
              placeholderTextColor={Colors.textMuted}
            />
            <TextInput
              placeholder="Share your ride experience..."
              value={content}
              onChangeText={setContent}
              style={styles.composeContentInput}
              multiline
              placeholderTextColor={Colors.textMuted}
            />

            {/* Pending media preview */}
            {pendingMedia && (
              <View style={styles.pendingMediaPreview}>
                <Image source={{ uri: pendingMedia.uri }} style={styles.pendingThumb} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ ...Typography.small, fontWeight: '600', color: Colors.primary }}>
                    {pendingMedia.type === 'video' ? '🎬 Video' : '🖼️ Photo'} attached
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setPendingMedia(null)}>
                  <Text style={{ fontSize: 18, color: Colors.error, padding: 4 }}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Attach buttons */}
            <View style={styles.composeActions}>
              <TouchableOpacity style={styles.composeAttachBtn} onPress={pickImage} activeOpacity={0.7}>
                <Text style={styles.composeAttachText}>🖼️ Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.composeAttachBtn} onPress={takePhoto} activeOpacity={0.7}>
                <Text style={styles.composeAttachText}>📷 Camera</Text>
              </TouchableOpacity>
            </View>

            <PrimaryButton
              title={posting ? 'Posting...' : 'Post'}
              onPress={createPost}
              loading={posting}
              disabled={posting || !title.trim()}
              small
            />
          </Card>
        }
        ListEmptyComponent={
          <EmptyState
            icon="💬"
            title="No posts yet"
            message="Be the first to share something with the community"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  composeCard: {
    marginBottom: Spacing.lg,
  },
  composeTitle: {
    ...Typography.h3,
    marginBottom: 12,
  },
  composeTitleInput: {
    backgroundColor: Colors.borderLight,
    borderRadius: Radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  composeContentInput: {
    backgroundColor: Colors.borderLight,
    borderRadius: Radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  composeActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  composeAttachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
    borderRadius: Radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  composeAttachText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  pendingMediaPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    borderRadius: Radii.sm,
    padding: 10,
    marginBottom: 12,
  },
  pendingThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  postCard: {
    marginBottom: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  postAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  postMeta: {
    flex: 1,
  },
  postAuthor: {
    ...Typography.label,
    fontSize: 14,
    fontWeight: '600',
  },
  postDate: {
    ...Typography.small,
    fontSize: 11,
  },
  postTitle: {
    ...Typography.h3,
    fontSize: 16,
    marginBottom: 6,
  },
  postContent: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: Radii.sm,
    marginTop: 8,
  },
});
