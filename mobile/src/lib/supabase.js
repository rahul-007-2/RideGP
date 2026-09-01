import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase keys are missing. Copy .env.example to .env and fill values.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function uploadImageToPosts(fileUri) {
  try {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const fileName = `${Date.now()}.jpg`;
    const { data, error } = await supabase.storage.from('posts').upload(fileName, blob);
    if (error) throw error;
    const publicRes = await supabase.storage.from('posts').getPublicUrl(data.path);
    return { path: data.path, publicUrl: publicRes.data?.publicUrl || null };
  } catch (err) {
    console.warn('uploadImageToPosts error', err.message);
    return null;
  }
}
