import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, Image, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase, uploadImageToPosts } from '../lib/supabase';
import { Colors } from '../lib/theme';

function PostItem({ item }) {
  return (
    <View style={styles.post}>
      {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.image} /> : null}
      <Text style={styles.postTitle}>{item.title}</Text>
      <Text>{item.content}</Text>
    </View>
  );
}

export default function CommunityScreen() {
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);

  useEffect(() => {
    fetchPosts();

    const channel = supabase.channel('public:posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, payload => {
        fetchPosts();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function fetchPosts() {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    const withUrls = data?.map(p => ({ ...p, image_url: p.image_path ? supabase.storage.from('posts').getPublicUrl(p.image_path).data?.publicUrl : null }));
    setPosts(withUrls || []);
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.cancelled) setImage(result.uri);
  }

  async function uploadImage(uri) {
    const res = await uploadImageToPosts(uri);
    return res?.path || null;
  }

  async function createPost() {
    const image_path = image ? await uploadImage(image) : null;
    const { error } = await supabase.from('posts').insert([{ title, content, image_path }]);
    if (error) return alert(error.message);
    setTitle(''); setContent(''); setImage(null);
  }

  return (
    <View style={{flex:1, backgroundColor: Colors.background}}>
      <View style={styles.form}>
        <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={styles.input} />
        <TextInput placeholder="Content" value={content} onChangeText={setContent} style={[styles.input,{height:80}]} multiline />
        <Button title="Pick image" onPress={pickImage} />
        <View style={{height:8}} />
        <Button title="Post" onPress={createPost} />
      </View>
      <FlatList data={posts} keyExtractor={p=>p.id.toString()} renderItem={({item})=> <PostItem item={item} />} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { padding:12, backgroundColor: Colors.card },
  input: { borderWidth:1, borderColor:'#eee', padding:8, marginBottom:8, borderRadius:8, backgroundColor:'#fff' },
  post: { padding:12, borderBottomWidth:1, borderColor:'#f0f0f0' },
  image: { height:200, borderRadius:8, marginBottom:8 },
  postTitle: { fontWeight:'700', marginBottom:4 }
});
