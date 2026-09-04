// Shared static data/constants for the 7-step client brief flow. Ported
// verbatim (ids, labels, ordering) from the original public/*.html pages,
// since they're used across the shared StepShell + useBrief hook approach
// instead of being duplicated per page.

export const STEPS = [
  { n: 1, label: 'Contact', path: 'contact' },
  { n: 2, label: 'Levering', path: 'delivery' },
  { n: 3, label: 'Brief', path: 'details' },
  { n: 4, label: 'Script', path: 'script' },
  { n: 5, label: 'Stem', path: 'voice' },
  { n: 6, label: 'Muziek', path: 'music' },
  { n: 7, label: 'Overzicht', path: 'overview' },
];

// Mirrors applyReachableSteps() duplicated across every original HTML page:
// marks a step reachable once the brief has real data implying the client
// got that far, even if they're currently earlier in the flow (so going
// back never stunts forward navigation).
export function computeReached(brief) {
  if (!brief) return {};
  let tracks = [];
  try {
    const parsed = brief.selectedTracks ? JSON.parse(brief.selectedTracks) : [];
    if (Array.isArray(parsed)) tracks = parsed;
  } catch (e) {}
  return {
    2: !!(brief.impressions || brief.airDate || brief.dateUnknown),
    3: !!(brief.product || brief.usp || brief.mainMessage),
    4: !!(brief.generatedScript || brief.editedScript),
    5: !!brief.selectedVoiceId,
    6: tracks.length > 0,
    7: !!brief.submittedAt,
  };
}

export const TONE_LABELS = {
  energiek: 'Energiek', rustig: 'Rustig', warm: 'Warm', zakelijk: 'Zakelijk',
  urgent: 'Urgent', premium: 'Premium', speels: 'Speels', grappig: 'Grappig',
  betrouwbaar: 'Betrouwbaar', gedurfd: 'Gedurfd', inspirerend: 'Inspirerend',
  nostalgisch: 'Nostalgisch',
};

export const VOICE_POOL = [
  { id: 'v01', label: 'Sanne', gender: 'vrouw', age: '35-54', tags: ['warm-vertrouwd', 'rustig-kalm'] },
  { id: 'v02', label: 'Naomi', gender: 'vrouw', age: '18-34', tags: ['energiek-enthousiast', 'speels-vrolijk'] },
  { id: 'v03', label: 'Fleur', gender: 'vrouw', age: '35-54', tags: ['zakelijk-professioneel', 'rustig-kalm'] },
  { id: 'v04', label: 'Elin', gender: 'vrouw', age: '18-34', tags: ['warm-vertrouwd', 'zakelijk-professioneel'] },
  { id: 'v05', label: 'Marit', gender: 'vrouw', age: '55+', tags: ['warm-vertrouwd', 'rustig-kalm'] },
  { id: 'v06', label: 'Daan', gender: 'man', age: '35-54', tags: ['zakelijk-professioneel', 'rustig-kalm'] },
  { id: 'v07', label: 'Bram', gender: 'man', age: '18-34', tags: ['energiek-enthousiast', 'speels-vrolijk'] },
  { id: 'v08', label: 'Ruben', gender: 'man', age: '35-54', tags: ['zakelijk-professioneel', 'warm-vertrouwd'] },
  { id: 'v09', label: 'Teun', gender: 'man', age: '18-34', tags: ['speels-vrolijk', 'energiek-enthousiast'] },
  { id: 'v10', label: 'Wouter', gender: 'man', age: '55+', tags: ['warm-vertrouwd', 'rustig-kalm'] },
];
export const TAG_LABELS = {
  'warm-vertrouwd': 'Warm & vertrouwd',
  'zakelijk-professioneel': 'Zakelijk & professioneel',
  'energiek-enthousiast': 'Energiek & enthousiast',
  'rustig-kalm': 'Rustig & kalm',
  'speels-vrolijk': 'Speels & vrolijk',
};
export const AGE_LABELS = { '18-34': '18–34', '35-54': '35–54', '55+': '55+' };

export const PLAYLISTS = [
  {
    id: 'playlist-1', name: 'Upbeat & Energiek',
    description: 'Drijvend, modern, hoog tempo — voor promoties, sales en duidelijke calls-to-action.',
    tracks: [
      { id: 't1-1', title: 'Bright Momentum', artist: 'Nova Sound', duration: '0:22' },
      { id: 't1-2', title: 'Forward Motion', artist: 'Kaia Reyes', duration: '0:20' },
      { id: 't1-3', title: 'Pulse Line', artist: 'Dexter Fields', duration: '0:25' },
      { id: 't1-4', title: 'Skyward', artist: 'Nova Sound', duration: '0:20' },
    ],
  },
  {
    id: 'playlist-2', name: 'Warm & Vertrouwd',
    description: 'Akoestisch, ingetogen, oprecht — voor lokale merken en verhalen die vertrouwen opbouwen.',
    tracks: [
      { id: 't2-1', title: 'Home Ground', artist: 'Elin Voss', duration: '0:22' },
      { id: 't2-2', title: 'Close By', artist: 'Tomas Rijk', duration: '0:20' },
      { id: 't2-3', title: 'Warm Light', artist: 'Elin Voss', duration: '0:24' },
      { id: 't2-4', title: 'Familiar Hands', artist: 'Anke Bos', duration: '0:22' },
    ],
  },
  {
    id: 'playlist-3', name: 'Zakelijk & Strak',
    description: 'Minimalistisch, strak, tech-forward — voor B2B, finance en professionele dienstverlening.',
    tracks: [
      { id: 't3-1', title: 'Clear Line', artist: 'Studio Halden', duration: '0:20' },
      { id: 't3-2', title: 'Precision', artist: 'Aro Vance', duration: '0:22' },
      { id: 't3-3', title: 'Signal', artist: 'Studio Halden', duration: '0:21' },
      { id: 't3-4', title: 'Grid System', artist: 'Iris Noor', duration: '0:23' },
    ],
  },
  {
    id: 'playlist-4', name: 'Speels & Luchtig',
    description: 'Speels, kleurrijk, licht — voor lifestyle, food en jongere doelgroepen.',
    tracks: [
      { id: 't4-1', title: 'Sunny Side', artist: 'Milo Park', duration: '0:20' },
      { id: 't4-2', title: 'Popsicle', artist: 'Freya Lund', duration: '0:22' },
      { id: 't4-3', title: 'Bubblegum', artist: 'Milo Park', duration: '0:21' },
      { id: 't4-4', title: 'Skip & Hop', artist: 'Renn Okafor', duration: '0:23' },
    ],
  },
  {
    id: 'playlist-5', name: 'Chill & Modern',
    description: 'Ontspannen, hedendaags, licht lo-fi — voor wellness, horeca en alledaagse merken.',
    tracks: [
      { id: 't5-1', title: 'Slow Bloom', artist: 'Yuna Marsh', duration: '0:22' },
      { id: 't5-2', title: 'Soft Focus', artist: 'Ober Lien', duration: '0:20' },
      { id: 't5-3', title: 'Easy Tempo', artist: 'Yuna Marsh', duration: '0:23' },
      { id: 't5-4', title: 'Afternoon Light', artist: 'Cato Reyes', duration: '0:21' },
    ],
  },
  {
    id: 'playlist-6', name: 'Klassiek & Tijdloos',
    description: 'Orkestraal en piano, elegant — voor premium, gevestigde en high-trust merken.',
    tracks: [
      { id: 't6-1', title: 'Quiet Grandeur', artist: 'Wren Solberg', duration: '0:23' },
      { id: 't6-2', title: 'First Light', artist: 'Ensemble Aurea', duration: '0:22' },
      { id: 't6-3', title: 'Legacy', artist: 'Wren Solberg', duration: '0:24' },
      { id: 't6-4', title: 'Piano Study No. 3', artist: 'Ilse Vermaas', duration: '0:20' },
    ],
  },
];

export const MONTH_NAMES = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];
export const MONTH_NAMES_LOWER = MONTH_NAMES.map((m) => m.toLowerCase());

export function estimateSeconds(words) {
  return (words / 2.7) * 1.05;
}
export function wordCountOf(text) {
  const t = (text || '').trim();
  return t ? t.split(/\s+/).length : 0;
}
