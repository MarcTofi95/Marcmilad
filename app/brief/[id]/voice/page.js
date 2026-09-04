'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StepShell from '../../../../components/StepShell';
import { useBrief } from '../../../../components/useBrief';
import { VOICE_POOL, TAG_LABELS, AGE_LABELS } from '../../../../components/flowData';

// Step 5 — mirrors public/voice.html (questions phase, then a curated
// shortlist of voices to pick from).
export default function VoicePage({ params }) {
  const { id } = params;
  const router = useRouter();
  const { brief, loading, saveState, schedulePatch, flushPending, patch } = useBrief(id);
  const [form, setForm] = useState({ voiceGender: '', voiceAgeRange: '', voiceStyleTags: [], voiceNote: '', selectedVoiceId: '' });
  const [phase, setPhase] = useState('questions');
  const [playingId, setPlayingId] = useState(null);

  useEffect(() => {
    if (brief) {
      const next = {
        voiceGender: brief.voiceGender || '',
        voiceAgeRange: brief.voiceAgeRange || '',
        voiceStyleTags: brief.voiceStyleTags ? brief.voiceStyleTags.split(',').filter(Boolean) : [],
        voiceNote: brief.voiceNote || '',
        selectedVoiceId: brief.selectedVoiceId || '',
      };
      setForm(next);
      setPhase(next.selectedVoiceId ? 'voices' : 'questions');
    }
  }, [brief]);

  function update(patchObj) {
    const next = { ...form, ...patchObj };
    setForm(next);
    const body = { ...patchObj };
    if ('voiceStyleTags' in body) body.voiceStyleTags = body.voiceStyleTags.join(',');
    schedulePatch(body);
  }

  function toggleTag(v) {
    const idx = form.voiceStyleTags.indexOf(v);
    const next = form.voiceStyleTags.slice();
    if (idx === -1) next.push(v); else next.splice(idx, 1);
    update({ voiceStyleTags: next });
  }

  function curatedVoices() {
    const wantGender = form.voiceGender && form.voiceGender !== 'geen-voorkeur' ? form.voiceGender : null;
    const wantAge = form.voiceAgeRange || null;
    const wantTags = form.voiceStyleTags;
    if (!wantGender && !wantAge && wantTags.length === 0) return VOICE_POOL;
    const filtered = VOICE_POOL.filter((v) => {
      if (wantGender && v.gender !== wantGender) return false;
      if (wantAge && v.age !== wantAge) return false;
      if (wantTags.length && !wantTags.some((t) => v.tags.includes(t))) return false;
      return true;
    });
    return filtered.length ? filtered : VOICE_POOL;
  }

  function selectVoice(voice) {
    update({ selectedVoiceId: voice.id, selectedVoiceLabel: voice.label, selectedVoiceTags: voice.tags.map((t) => TAG_LABELS[t]).join(',') });
  }

  function playPreview(vid) {
    setPlayingId((cur) => {
      const next = cur === vid ? null : vid;
      if (next) setTimeout(() => setPlayingId((c) => (c === vid ? null : c)), 2200);
      return next;
    });
  }

  async function showPitches() {
    flushPending();
    await patch({ ...form, voiceStyleTags: form.voiceStyleTags.join(',') });
    setPhase('voices');
  }

  async function next() {
    if (!form.selectedVoiceId) return;
    flushPending();
    await patch({ ...form, voiceStyleTags: form.voiceStyleTags.join(',') });
    router.push(`/brief/${id}/music`);
  }

  if (loading) return null;

  if (!brief) {
    return (
      <StepShell briefId={id} current={5} brief={null} bigNum="05" kicker="Voor je voorstellen" title="Welke stem past bij jou?">
        <div style={{ background: '#FBF3F1', border: '1px solid #C2513F', borderRadius: 10, padding: '12px 14px', fontSize: 12.5, color: '#C2513F' }}>
          Geen brief gevonden bij deze link. Ga terug en keur eerst je script goed.
        </div>
      </StepShell>
    );
  }

  return (
    <StepShell briefId={id} current={5} brief={brief} bigNum="05" kicker={phase === 'questions' ? 'Voor je voorstellen' : 'Onze voorstellen voor jou'} title={phase === 'questions' ? 'Welke stem past bij jou?' : 'Kies je stem'}>
      {phase === 'questions' ? (
        <>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: '#5C5850', margin: '0 0 26px' }}>
            Beantwoord een paar korte vragen — TFA stelt daarna twee of drie stemmen voor die daarbij passen.
          </p>
          <div style={{ marginTop: 10 }}>
            <label className="field-label">Geslacht van de stem</label>
            <div style={{ display: 'flex', gap: 6, maxWidth: 460 }}>
              {[['man', 'Man'], ['vrouw', 'Vrouw'], ['geen-voorkeur', 'Geen voorkeur']].map(([v, label]) => (
                <button key={v} type="button" className={'seg-btn' + (form.voiceGender === v ? ' selected' : '')} onClick={() => update({ voiceGender: form.voiceGender === v ? '' : v })}>{label}</button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 18 }}>
            <label className="field-label">Leeftijd van de stem</label>
            <div style={{ display: 'flex', gap: 6, maxWidth: 460 }}>
              {Object.entries(AGE_LABELS).map(([v, label]) => (
                <button key={v} type="button" className={'seg-btn' + (form.voiceAgeRange === v ? ' selected' : '')} onClick={() => update({ voiceAgeRange: form.voiceAgeRange === v ? '' : v })}>{label}</button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 18 }}>
            <label className="field-label" style={{ marginBottom: 3 }}>Karakter van de stem</label>
            <div className="hint" style={{ marginBottom: 8 }}>Kies er een of meer.</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(TAG_LABELS).map(([v, label]) => (
                <button key={v} type="button" className={'tone-chip' + (form.voiceStyleTags.includes(v) ? ' active' : '')} onClick={() => toggleTag(v)}>{label}</button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 18, maxWidth: 520 }}>
            <label className="field-label">Nog iets dat we moeten weten? <span style={{ color: '#8C8880', fontWeight: 400 }}>(optioneel)</span></label>
            <textarea style={{ minHeight: 64 }} value={form.voiceNote} placeholder="Bijv. 'geen kinderstem'" onChange={(e) => update({ voiceNote: e.target.value })} />
          </div>
          <div style={{ marginTop: 26, maxWidth: 340 }}>
            <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={showPitches}>Bekijk stemvoorstellen</button>
          </div>
        </>
      ) : (
        <>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: '#5C5850', margin: '0 0 20px' }}>
            Op basis van je antwoorden stelt TFA deze stemmen voor. Beluister elk voorbeeld en kies de stem die het beste past.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {curatedVoices().map((voice) => {
              const isSelected = form.selectedVoiceId === voice.id;
              const isPlaying = playingId === voice.id;
              return (
                <div key={voice.id} style={{ background: '#FFFFFF', border: '1.5px solid ' + (isSelected ? '#E6C858' : '#DEDCD7'), borderRadius: 12, padding: '15px 17px', cursor: 'pointer' }} onClick={() => selectVoice(voice)}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1D' }}>{voice.label}</div>
                      <div style={{ fontSize: 12, color: '#5C5850', marginTop: 2 }}>{voice.tags.map((t) => TAG_LABELS[t]).join(' · ')} · {AGE_LABELS[voice.age]}</div>
                    </div>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1.5px solid ' + (isSelected ? '#E6C858' : '#C9C5B9'), background: isSelected ? '#E6C858' : '#FFFFFF' }} />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); playPreview(voice.id); }}
                    style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', border: '1px solid #C9C5B9', borderRadius: 9, background: '#FBF9EC', color: '#383209', fontWeight: 500, fontSize: 12.5, padding: '9px 12px', cursor: 'pointer' }}
                  >
                    {isPlaying ? 'Bezig met afspelen…' : 'Voorbeeld beluisteren'}
                  </button>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 18 }}>
            <a href="#" onClick={(e) => { e.preventDefault(); setPhase('questions'); }} style={{ fontSize: 12, color: '#8C8880', textDecoration: 'underline' }}>← Terug naar de vragen</a>
          </div>
          <div style={{ marginTop: 22, paddingTop: 22, borderTop: '1px solid #EAE7DE', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-primary" style={{ width: 320, flex: 'none' }} disabled={!form.selectedVoiceId} onClick={next}>
              Bevestigen — verder naar de muziek
            </button>
          </div>
        </>
      )}
      <p style={{ marginTop: 26, fontSize: 11.5, color: '#8C8880', lineHeight: 1.5 }}>Twijfel je tussen twee stemmen? Je kunt je keuze altijd nog aanpassen voordat je alles verstuurt.</p>
      <div style={{ marginTop: 14 }}>
        <a href={`/brief/${id}/script`} style={{ fontSize: 12, color: '#8C8880', textDecoration: 'underline' }}>← Terug naar je script</a>
      </div>
      <div style={{ fontSize: 11, color: '#8C8880', textAlign: 'center', marginTop: 10, height: 14 }}>{saveState}</div>
    </StepShell>
  );
}
