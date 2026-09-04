// Data layer for the producer-facing music/voice library (app/dashboard/library).
// There's no equivalent table in the original Express app — the client-flow
// voice/music pages there use hard-coded in-memory pools (see voice.html's
// VOICE_POOL and music.html's PLAYLISTS). This gives the producer dashboard
// a real, editable backing store for the same idea, with the same
// Postgres-or-in-memory fallback pattern as lib/db.js.

import { nanoid } from 'nanoid';

const USE_PG = !!process.env.POSTGRES_URL;

export const MUSIC_CATEGORIES = ['Corporate', 'Cinematisch', 'Uptempo', 'Akoestisch', 'Elektronisch', 'Ambient'];

export const DEFAULT_VOICE_TAGS = [
  'Warm & vertrouwd',
  'Zakelijk & professioneel',
  'Energiek & enthousiast',
  'Rustig & kalm',
  'Speels & vrolijk',
];

function seedTracks() {
  return [
    { id: nanoid(10), title: 'Bright Momentum', artist: 'Nova Sound', category: 'Uptempo', duration: '0:22' },
    { id: nanoid(10), title: 'Home Ground', artist: 'Elin Voss', category: 'Akoestisch', duration: '0:22' },
    { id: nanoid(10), title: 'Clear Line', artist: 'Studio Halden', category: 'Corporate', duration: '0:20' },
    { id: nanoid(10), title: 'Sunny Side', artist: 'Milo Park', category: 'Uptempo', duration: '0:20' },
    { id: nanoid(10), title: 'Slow Bloom', artist: 'Yuna Marsh', category: 'Ambient', duration: '0:22' },
    { id: nanoid(10), title: 'Quiet Grandeur', artist: 'Wren Solberg', category: 'Cinematisch', duration: '0:23' },
    { id: nanoid(10), title: 'Grid System', artist: 'Iris Noor', category: 'Elektronisch', duration: '0:23' },
    { id: nanoid(10), title: 'First Light', artist: 'Ensemble Aurea', category: 'Cinematisch', duration: '0:22' },
  ].map((t) => ({ ...t, createdAt: new Date().toISOString() }));
}

function seedVoices() {
  return [
    { id: nanoid(10), name: 'Sanne', gender: 'vrouw', ageRange: '35-54', tags: ['Warm & vertrouwd', 'Rustig & kalm'] },
    { id: nanoid(10), name: 'Naomi', gender: 'vrouw', ageRange: '18-34', tags: ['Energiek & enthousiast', 'Speels & vrolijk'] },
    { id: nanoid(10), name: 'Daan', gender: 'man', ageRange: '35-54', tags: ['Zakelijk & professioneel', 'Rustig & kalm'] },
    { id: nanoid(10), name: 'Bram', gender: 'man', ageRange: '18-34', tags: ['Energiek & enthousiast', 'Speels & vrolijk'] },
    { id: nanoid(10), name: 'Marit', gender: 'vrouw', ageRange: '55+', tags: ['Warm & vertrouwd', 'Rustig & kalm'] },
    { id: nanoid(10), name: 'Ruben', gender: 'man', ageRange: '35-54', tags: ['Zakelijk & professioneel', 'Warm & vertrouwd'] },
  ].map((v) => ({ ...v, createdAt: new Date().toISOString() }));
}

const mem = {
  tracks: null,
  voices: null,
};
function memTracks() {
  if (!mem.tracks) mem.tracks = seedTracks();
  return mem.tracks;
}
function memVoices() {
  if (!mem.voices) mem.voices = seedVoices();
  return mem.voices;
}

let migrated = false;
async function runMigrations() {
  if (!USE_PG || migrated) return;
  const { sql } = await import('@vercel/postgres');
  await sql`
    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      artist TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      duration TEXT NOT NULL DEFAULT '',
      "createdAt" TEXT NOT NULL
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS voices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      gender TEXT NOT NULL DEFAULT '',
      "ageRange" TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      "createdAt" TEXT NOT NULL
    );
  `;
  migrated = true;
}

function trackRowOut(row) {
  return row ? { id: row.id, title: row.title, artist: row.artist, category: row.category, duration: row.duration, createdAt: row.createdAt } : null;
}
function voiceRowOut(row) {
  if (!row) return null;
  let tags = [];
  try { tags = JSON.parse(row.tags || '[]'); } catch (e) { tags = []; }
  return { id: row.id, name: row.name, gender: row.gender, ageRange: row.ageRange, tags, createdAt: row.createdAt };
}

export async function listTracks() {
  if (!USE_PG) return memTracks().slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  await runMigrations();
  const { sql } = await import('@vercel/postgres');
  const { rows } = await sql`SELECT * FROM tracks ORDER BY "createdAt" DESC`;
  return rows.map(trackRowOut);
}

export async function createTrack({ title, artist, category, duration }) {
  const entry = { id: nanoid(10), title: title || '', artist: artist || '', category: category || MUSIC_CATEGORIES[0], duration: duration || '0:20', createdAt: new Date().toISOString() };
  if (!USE_PG) { memTracks().unshift(entry); return entry; }
  await runMigrations();
  const { sql } = await import('@vercel/postgres');
  await sql`INSERT INTO tracks (id, title, artist, category, duration, "createdAt") VALUES (${entry.id}, ${entry.title}, ${entry.artist}, ${entry.category}, ${entry.duration}, ${entry.createdAt})`;
  return entry;
}

export async function deleteTrack(id) {
  if (!USE_PG) {
    const list = memTracks();
    const i = list.findIndex((t) => t.id === id);
    if (i !== -1) list.splice(i, 1);
    return;
  }
  await runMigrations();
  const { sql } = await import('@vercel/postgres');
  await sql`DELETE FROM tracks WHERE id = ${id}`;
}

export async function listVoices() {
  if (!USE_PG) return memVoices().slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  await runMigrations();
  const { sql } = await import('@vercel/postgres');
  const { rows } = await sql`SELECT * FROM voices ORDER BY "createdAt" DESC`;
  return rows.map(voiceRowOut);
}

export async function createVoice({ name, gender, ageRange, tags }) {
  const entry = { id: nanoid(10), name: name || '', gender: gender || '', ageRange: ageRange || '', tags: Array.isArray(tags) ? tags : [], createdAt: new Date().toISOString() };
  if (!USE_PG) { memVoices().unshift(entry); return entry; }
  await runMigrations();
  const { sql } = await import('@vercel/postgres');
  await sql`INSERT INTO voices (id, name, gender, "ageRange", tags, "createdAt") VALUES (${entry.id}, ${entry.name}, ${entry.gender}, ${entry.ageRange}, ${JSON.stringify(entry.tags)}, ${entry.createdAt})`;
  return entry;
}

export async function deleteVoice(id) {
  if (!USE_PG) {
    const list = memVoices();
    const i = list.findIndex((v) => v.id === id);
    if (i !== -1) list.splice(i, 1);
    return;
  }
  await runMigrations();
  const { sql } = await import('@vercel/postgres');
  await sql`DELETE FROM voices WHERE id = ${id}`;
}
