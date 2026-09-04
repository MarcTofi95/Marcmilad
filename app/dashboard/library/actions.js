'use server';

import { revalidatePath } from 'next/cache';
import { createTrack, deleteTrack, createVoice, deleteVoice } from '../../../lib/library';

// A connected Blob store on Vercel authenticates via OIDC by default —
// BLOB_STORE_ID + an auto-rotated VERCEL_OIDC_TOKEN — not the older static
// BLOB_READ_WRITE_TOKEN (that one is only present if explicitly generated for
// use outside Vercel, e.g. a CI job). The @vercel/blob SDK already knows how
// to use whichever credential is available, so we just need to detect that
// *some* form of Blob auth is configured before attempting an upload.
const BLOB_ENABLED = !!(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);

// Uploads an audio file to Vercel Blob and returns its public URL, or ''
// if no file was chosen or no Blob store is configured at all — mirrors
// this codebase's pattern elsewhere of degrading gracefully rather than
// erroring out when an optional service isn't configured yet.
async function uploadAudioIfPresent(file, prefix) {
  if (!file || typeof file === 'string' || !file.size) return '';
  if (!BLOB_ENABLED) {
    console.log('[library] No Blob store configured (BLOB_STORE_ID/BLOB_READ_WRITE_TOKEN unset) — skipping audio upload for', file.name);
    return '';
  }
  const { put } = await import('@vercel/blob');
  const blob = await put(`${prefix}/${Date.now()}-${file.name}`, file, {
    access: 'public',
    addRandomSuffix: true,
  });
  return blob.url;
}

export async function addTrackAction(formData) {
  const audioUrl = await uploadAudioIfPresent(formData.get('audioFile'), 'tracks');
  await createTrack({
    title: formData.get('title'),
    artist: formData.get('artist'),
    category: formData.get('category'),
    duration: formData.get('duration') || '0:20',
    audioUrl,
  });
  revalidatePath('/dashboard/library');
}

export async function removeTrackAction(id) {
  await deleteTrack(id);
  revalidatePath('/dashboard/library');
}

export async function addVoiceAction(formData) {
  const tagsRaw = formData.get('tags') || '';
  const tags = tagsRaw
    .toString()
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const audioUrl = await uploadAudioIfPresent(formData.get('audioFile'), 'voices');
  await createVoice({
    name: formData.get('name'),
    gender: formData.get('gender'),
    ageRange: formData.get('ageRange'),
    tags,
    audioUrl,
  });
  revalidatePath('/dashboard/library');
}

export async function removeVoiceAction(id) {
  await deleteVoice(id);
  revalidatePath('/dashboard/library');
}
