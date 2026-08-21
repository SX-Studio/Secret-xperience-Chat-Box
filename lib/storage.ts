import 'server-only';
import { admin } from '@/lib/supabase/admin';
import { env } from '@/lib/env';

// Upload via the service role (bypasses storage RLS). Buckets: 'master' (private),
// 'preview' (public). Paths are stored WITHOUT the bucket prefix.
export async function uploadObject(bucket: 'master' | 'preview', path: string, body: Buffer, contentType: string) {
  const { error } = await admin().storage.from(bucket).upload(path, body, { contentType, upsert: true });
  if (error) throw new Error(`storage upload failed: ${error.message}`);
}

export function publicUrl(bucket: 'preview', path: string): string {
  return `${env.supabaseUrl()}/storage/v1/object/public/${bucket}/${path}`;
}
