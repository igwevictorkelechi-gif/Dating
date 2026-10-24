import { createClient } from '@supabase/supabase-js';

// The URL and publishable key are safe to ship in the browser: what users can read or change
// is enforced by row level security in the database (see supabase/migrations).
// Override them with VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY in a .env file if needed.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://shadyxtgsthuwuyeuciq.supabase.co';
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_UPvY9oRkHur1mDK_8-im7w_SZ95Vq7b';

export const supabase = createClient(url, key, {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const BUCKET = 'media';

function dataUrlToBlob(dataUrl) {
  const [head, body] = dataUrl.split(',');
  const mime = head.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

const EXT = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/aac': 'aac',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
};

// Uploads a data: URL into the user's own folder and returns its public URL.
// Anything that is already a normal URL is returned unchanged.
export async function uploadIfNeeded(value, userId, folder) {
  if (!value || !value.startsWith('data:')) return value;
  const blob = dataUrlToBlob(value);
  const type = blob.type.split(';')[0];
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${EXT[type] || 'bin'}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: type, upsert: false });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Lists every file in the user's folder (used when deleting an account).
export async function listOwnFiles(userId) {
  const files = [];
  for (const folder of ['avatar', 'photos', 'audio', 'posts', 'chat']) {
    const { data } = await supabase.storage.from(BUCKET).list(`${userId}/${folder}`, { limit: 1000 });
    (data || []).forEach((f) => files.push(`${userId}/${folder}/${f.name}`));
  }
  return files;
}
