'use server';

import { revalidatePath } from 'next/cache';
import { createTrack, deleteTrack, createVoice, deleteVoice } from '../../../lib/library';

export async function addTrackAction(formData) {
  await createTrack({
    title: formData.get('title'),
    artist: formData.get('artist'),
    category: formData.get('category'),
    duration: formData.get('duration') || '0:20',
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
  await createVoice({
    name: formData.get('name'),
    gender: formData.get('gender'),
    ageRange: formData.get('ageRange'),
    tags,
  });
  revalidatePath('/dashboard/library');
}

export async function removeVoiceAction(id) {
  await deleteVoice(id);
  revalidatePath('/dashboard/library');
}
