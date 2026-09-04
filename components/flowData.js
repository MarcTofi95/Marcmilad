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

// The client-facing voice (step 5) and music (step 6) pages used to pick
// from fixed sample pools here (VOICE_POOL, PLAYLISTS) — hard-coded example
// voices/tracks that never reflected anything a producer actually added in
// /dashboard/library. Both pages now fetch the real library over
// GET /api/library/voices and GET /api/library/tracks instead, so those
// pools have been removed. AGE_LABELS stays: it's still the shared display
// mapping for the age-range question/answers on both the library form and
// the voice step, and its keys ('18-34'/'35-54'/'55+') match the real
// voices' ageRange field.
export const AGE_LABELS = { '18-34': '18–34', '35-54': '35–54', '55+': '55+' };

export const MONTH_NAMES = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];
export const MONTH_NAMES_LOWER = MONTH_NAMES.map((m) => m.toLowerCase());

export function estimateSeconds(words) {
  return (words / 2.7) * 1.05;
}
export function wordCountOf(text) {
  const t = (text || '').trim();
  return t ? t.split(/\s+/).length : 0;
}
