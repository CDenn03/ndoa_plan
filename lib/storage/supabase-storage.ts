import { createClient } from '@supabase/supabase-js'
import type { StorageBucket } from '@/types'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function ensurePrivateBuckets(): Promise<void> {
  const sb = adminClient()
  for (const bucket of ['documents', 'contracts', 'receipts', 'media'] as StorageBucket[]) {
    await sb.storage.updateBucket(bucket, { public: false })
  }
}

export async function uploadFile(opts: {
  bucket: StorageBucket; path: string; file: File | Blob | Buffer
  contentType: string; weddingId: string
}): Promise<{ path: string }> {
  if (!opts.path.startsWith(`${opts.weddingId}/`))
    throw new Error(`Path must be scoped to weddingId. Got: ${opts.path}`)
  const sb = adminClient()
  const { data, error } = await sb.storage.from(opts.bucket)
    .upload(opts.path, opts.file, { contentType: opts.contentType, upsert: false })
  if (error) throw error
  return { path: data.path }
}

const DEFAULT_EXPIRY = 3600

export async function getSignedUrl(opts: { bucket: StorageBucket; path: string; expiresIn?: number }): Promise<string> {
  const sb = adminClient()
  const { data, error } = await sb.storage.from(opts.bucket).createSignedUrl(opts.path, opts.expiresIn ?? DEFAULT_EXPIRY)
  if (error) throw error
  return data.signedUrl
}

export async function getSignedUrls(bucket: StorageBucket, paths: string[], expiresIn = DEFAULT_EXPIRY): Promise<Record<string, string>> {
  const sb = adminClient()
  const { data, error } = await sb.storage.from(bucket).createSignedUrls(paths, expiresIn)
  if (error) throw error
  const result: Record<string, string> = {}
  for (const item of data ?? []) { if (item.signedUrl) result[item.path] = item.signedUrl }
  return result
}

export async function deleteFile(bucket: StorageBucket, path: string): Promise<void> {
  const sb = adminClient()
  const { error } = await sb.storage.from(bucket).remove([path])
  if (error) throw error
}
