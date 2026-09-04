'use server';

import { revalidatePath } from 'next/cache';
import { createTrack, deleteTrack, createVoice, deleteVoice } from '../../../lib/library';

const BLOB_ENABLED = !!process.env.BLOB_READ_WRITE_TOKEN;

// Uploads an audio file to Vercel Blob and returns its public URL, or ''
// if no file was chosen or no Blob store is configured (BLOB_READ_WRITE_TOKEN
// unset) — mirrors this codebase's pattern elsewhere of degrading gracefully
// rather than erroring out when an optional service isn't configured yet.
async function uploadAudioIfPresent(file, prefix) {
  if (!file || typeof file === 'string' || !file.size) return '';
  if (!BLOB_ENABLED) {
    console.log('[library] BLOB_READ_WRITE_TOKEN not set — skipping audio upload for', file.name);
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
