'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import StepShell from '../../../../components/StepShell';
import Preloader from '../../../../components/Preloader';
import { TONE_LABELS, estimateSeconds, wordCountOf } from '../../../../components/flowData';

const DEFAULT_DISCLAIMER = 'Nog geen verplichte tekst ontvangen — deze verschijnt hier zodra ingevuld in de brief.';

function briefHasEnoughContent(b) {
  return !!(b && (b.product || b.usp || b.mainMessage));
}

// Step 4 — mirrors public/script.html: generation, live "estimated
// seconds" bar, hand-edit, approve, and (once approved + variation wanted)
// the "what's different" variation panel.
export default function ScriptPage({ params }) {
  const { id } = params;
  const router = useRouter();
  const [brief, setBrief] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const [scriptText, setScriptText] = useState('');
  const [varText, setVarText] = useState('');
  const [variationDetail, setVariationDetail] = useState('');
  const scriptFocused = useRef(false);
  const varFocused = useRef(false);
  const detailFocused = useRef(false);
  const saveTimer = useRef(null);
  const varSaveTimer = useRef(null);
  const detailSaveTimer = useRef(null);

  const fetchBrief = useCallback(async () => {
    try {
      const res = await fetch(`/api/briefs/${id}`);
      if (!res.ok) return null;
      const data = await res.json();
      setBrief(data);
      return data;
    } catch (e) {
      return null;
    }
  }, [id]);

  const generate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/briefs/${id}/generate-script`, { method: 'POST' });
      if (res.ok) setBrief(await res.json());
    } catch (e) {}
    setGenerating(false);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const b = await fetchBrief();
      if (cancelled) return;
      if (b && !b.generatedScript && briefHasEnoughContent(b)) {
        await generate();
      }
      setFirstLoadDone(true);
    })();
    const interval = setInterval(async () => {
      if (scriptFocused.current || varFocused.current || detailFocused.current) return;
      await fetchBrief();
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Sync local text fields from brief, but never clobber what's focused.
  useEffect(() => {
    if (!brief) return;
    const generatedText = brief.generatedScript || '';
    const text = brief.editedScript !== null && brief.editedScript !== undefined ? brief.editedScript : generatedText;
    if (!scriptFocused.current) setScriptText(text);
    const defaultVarText = text || '';
    const vText = brief.editedVarScript !== null && brief.editedVarScript !== undefined ? brief.editedVarScript : defaultVarText;
    if (!varFocused.current) setVarText(vText);
    if (!detailFocused.current) setVariationDetail(brief.variationDetail || '');
  }, [brief]);

  function scheduleEditSave(field, value) {
    const ref = field === 'editedScript' ? saveTimer : varSaveTimer;
    clearTimeout(ref.current);
    ref.current = setTimeout(() => {
      fetch(`/api/briefs/${id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      }).catch(() => {});
    }, 350);
  }

  function onScriptChange(e) {
    setScriptText(e.target.value);
    scheduleEditSave('editedScript', e.target.value);
  }
  function resetScript() {
    setScriptText(brief ? brief.generatedScript || '' : '');
    fetch(`/api/briefs/${id}/edit`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editedScript: null }),
    }).catch(() => {});
    setBrief((b) => (b ? { ...b, editedScript: null } : b));
  }

  function onVarChange(e) {
    setVarText(e.target.value);
    scheduleEditSave('editedVarScript', e.target.value);
  }
  function resetVar() {
    setVarText(scriptText);
    fetch(`/api/briefs/${id}/edit`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editedVarScript: null }),
    }).catch(() => {});
    setBrief((b) => (b ? { ...b, editedVarScript: null } : b));
  }

  function onVariationDetailChange(e) {
    setVariationDetail(e.target.value);
    clearTimeout(detailSaveTimer.current);
    detailSaveTimer.current = setTimeout(() => {
      fetch(`/api/briefs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variationDetail: e.target.value }),
      }).catch(() => {});
    }, 350);
  }

  async function approveAndContinue() {
    if (!brief || !brief.generatedScript) return;
    clearTimeout(saveTimer.current);
    try {
      await fetch(`/api/briefs/${id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editedScript: scriptText }),
      });
    } catch (e) {}

    if (brief.needsVariations) {
      try {
        const res = await fetch(`/api/briefs/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scriptApproved: true }),
        });
        if (res.ok) setBrief(await res.json());
      } catch (e) {}
      return;
    }

    router.push(`/brief/${id}/voice`);
  }

  function varApprove() {
    clearTimeout(varSaveTimer.current);
    fetch(`/api/briefs/${id}/edit`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editedVarScript: varText }),
    }).catch(() => {});
  }

  async function continueToVoice() {
    clearTimeout(varSaveTimer.current);
    clearTimeout(detailSaveTimer.current);
    try {
      await fetch(`/api/briefs/${id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editedVarScript: varText }),
      });
    } catch (e) {}
    router.push(`/brief/${id}/voice`);
  }

  if (!firstLoadDone) return <Preloader />;

  if (!brief) {
    return (
      <StepShell briefId={id} current={4} brief={null} bigNum="04" kicker="Klaar voor je review" title="Jouw script">
        <div style={{ background: '#FBF3F1', border: '1px solid #C2513F', borderRadius: 10, padding: '12px 14px', fontSize: 12.5, color: '#C2513F' }}>
          Geen brief gevonden bij deze link.
        </div>
      </StepShell>
    );
  }

  const spotLength = brief.hoofdspotLength || '20';
  const target = parseInt(spotLength, 10) || 20;
  const hasVariation = !!brief.needsVariations;
  const scriptApproved = !!brief.scriptApproved;
  const disclaimerText = brief.disclaimerText && brief.disclaimerText.trim() ? brief.disclaimerText : DEFAULT_DISCLAIMER;
  const hasRealDisclaimer = !!(brief.disclaimerText && brief.disclaimerText.trim());
  const extraNote = brief.extraNote || '';

  let tones = [];
  try {
    const parsed = brief.toneOfVoice ? JSON.parse(brief.toneOfVoice) : [];
    tones = Array.isArray(parsed) ? parsed.filter((t) => TONE_LABELS[t]) : [];
  } catch (e) {}

  const hasGenerated = !!brief.generatedScript;
  const canGenerate = briefHasEnoughContent(brief);
  const generatedText = brief.generatedScript || '';

  const trimmed = (scriptText || '').trim();
  const words = wordCountOf(trimmed);
  const seconds = estimateSeconds(words);
  let statusLabel = 'Past goed binnen ' + target + ' seconden.';
  let barColor = '#1D1D1D';
  if (seconds > target * 1.2) { statusLabel = 'Te lang — graag inkorten.'; barColor = '#C2513F'; }
  else if (seconds > target * 1.05) { statusLabel = 'Net iets te lang — bekort het wat.'; barColor = '#383209'; }
  const barPct = Math.min((seconds / target) * 100, 140) + '%';
  const unchanged = trimmed === generatedText.trim();

  let approveLabel;
  if (!hasVariation) approveLabel = unchanged ? 'Goedkeuren, dit is prima zo' : 'Wijzigingen opslaan en goedkeuren';
  else if (!scriptApproved) approveLabel = unchanged ? 'Goedkeuren en verder naar de variatie' : 'Wijzigingen opslaan en verder naar de variatie';
  else approveLabel = unchanged ? 'Goedgekeurd ✓ — wijzigingen opslaan' : 'Wijzigingen opslaan';

  const defaultVarText = scriptText || '';
  const varTrimmed = (varText || '').trim();
  const varWords = wordCountOf(varTrimmed);
  const varSeconds = estimateSeconds(varWords);
  let varStatusLabel = 'Past goed binnen ' + target + ' seconden.';
  let varBarColor = '#1D1D1D';
  if (varSeconds > target * 1.2) { varStatusLabel = 'Te lang — graag inkorten.'; varBarColor = '#C2513F'; }
  else if (varSeconds > target * 1.05) { varStatusLabel = 'Net iets te lang — bekort het wat.'; varBarColor = '#383209'; }
  const varBarPct = Math.min((varSeconds / target) * 100, 140) + '%';
  const varUnchanged = varTrimmed === defaultVarText.trim();

  return (
    <StepShell
      briefId={id}
      current={4}
      brief={brief}
      subtitle={'Hoofdspot · ' + spotLength + '″'}
      bigNum="04"
      kicker="Klaar voor je review"
      title="Jouw script"
      hint="Zo vertelt TFA jouw verhaal in je hoofdspot — volledig geschreven op basis van je brief."
    >
      {tones.length > 0 && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#8C6D1F', background: 'rgba(230,200,88,.18)', borderRadius: 20, padding: '5px 12px', margin: '0 0 4px' }}>
          Toon uit je brief: {tones.map((t) => TONE_LABELS[t]).join(' & ')}
        </div>
      )}

      {hasGenerated && !generating && (
        <div style={{ margin: '16px 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              display: 'inline-block', fontSize: 10.5, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase',
              padding: '3px 9px', borderRadius: 999,
              background: brief.scriptSource === 'ai' ? '#E6C858' : '#EAE7DE',
              color: brief.scriptSource === 'ai' ? '#1D1D1D' : '#5C5850',
            }}
          >
            {brief.scriptSource === 'ai' ? 'Gegenereerd met AI' : 'Automatisch samengesteld (sjabloon)'}
          </span>
          <button type="button" onClick={generate} style={{ border: 'none', background: 'transparent', color: '#383209', fontWeight: 600, fontSize: 12, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
            Opnieuw genereren
          </button>
        </div>
      )}
      {generating && <div style={{ margin: '16px 0 4px', fontSize: 12.5, color: '#8C8880' }}>TFA&apos;s AI schrijft een scriptvoorstel op basis van je brief…</div>}
      {!generating && !hasGenerated && (
        <div style={{ margin: '16px 0 4px', fontSize: 12.5, color: '#8C8880' }}>
          Nog geen scriptvoorstel. Vul eerst product/dienst, USP of je kernboodschap in op de brief.
          <button type="button" disabled={!canGenerate} onClick={generate} style={{ display: 'block', marginTop: 8, border: 'none', background: 'transparent', color: '#383209', fontWeight: 600, fontSize: 12.5, textDecoration: 'underline', cursor: canGenerate ? 'pointer' : 'not-allowed', padding: 0 }}>
            Genereer scriptvoorstel
          </button>
        </div>
      )}

      <div className="box" style={{ marginTop: 14, background: '#FBF9EC', border: '1px solid #EAE3C4', borderRadius: 14, padding: '22px 24px' }}>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontSize: 16, lineHeight: 1.6, color: generatedText ? '#1D1D1D' : '#9C9890' }}>
          {generatedText || 'Hier verschijnt het scriptvoorstel van TFA, zodra je genoeg velden in je brief hebt ingevuld.'}
        </div>
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed #E6C858' }}>
          <div style={{ fontSize: 10.5, letterSpacing: '.06em', textTransform: 'uppercase', color: '#383209', fontWeight: 500 }}>
            Verplichte tekst uit je brief — TFA neemt dit altijd op
          </div>
          <div style={{ fontSize: 12.5, color: hasRealDisclaimer ? '#1D1D1D' : '#9C9890', marginTop: 4, lineHeight: 1.5 }}>&ldquo;{disclaimerText}&rdquo;</div>
        </div>
      </div>

      <div style={{ marginTop: 26 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>Wil je iets aanpassen?</h3>
        <p style={{ fontSize: 12.5, color: '#5C5850', margin: '0 0 10px', lineHeight: 1.5 }}>
          TFA schreef dit script op basis van jouw brief — pas het hieronder aan waar je wilt. Het moet in {spotLength} seconden passen.
        </p>
        <textarea
          style={{ minHeight: 130 }}
          value={scriptText}
          onFocus={() => { scriptFocused.current = true; }}
          onBlur={() => { scriptFocused.current = false; }}
          onChange={onScriptChange}
        />
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#5C5850' }}>
            <span>Geschatte lengte</span>
            <span style={{ fontWeight: 500, color: barColor }}>{seconds.toFixed(1)}s van {target}″</span>
          </div>
          <div style={{ marginTop: 6, height: 8, borderRadius: 4, background: '#EAE7DE', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, width: barPct, background: barColor }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 12.5, fontWeight: 500, color: barColor }}>{statusLabel}</div>
        </div>
      </div>

      {extraNote.trim() && (
        <div style={{ marginTop: 18, display: 'flex', gap: 10, background: '#FBF9EC', border: '1px solid #EAE3C4', borderRadius: 12, padding: '12px 14px' }}>
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: '.06em', textTransform: 'uppercase', color: '#8C8880', fontWeight: 500 }}>Opmerking uit je brief</div>
            <div style={{ fontSize: 12.5, color: '#5C5850', marginTop: 4, lineHeight: 1.5 }}>{extraNote}</div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420 }}>
        <button type="button" className="btn-primary" disabled={!hasGenerated} onClick={approveAndContinue}>{approveLabel}</button>
        {!unchanged && <button type="button" className="ghost-btn" onClick={resetScript}>Terugzetten naar scriptvoorstel</button>}
      </div>

      {hasVariation && scriptApproved && (
        <div style={{ marginTop: 34, paddingTop: 26, borderTop: '1px solid #EAE3C4' }}>
          <div style={{ fontSize: 13, letterSpacing: '.09em', textTransform: 'uppercase', color: '#383209', fontWeight: 500 }}>Script goedgekeurd</div>
          <h3 style={{ fontWeight: 600, fontSize: 18, margin: '8px 0 4px' }}>Jouw variatie</h3>
          <p style={{ fontSize: 12.5, color: '#5C5850', margin: '0 0 14px', lineHeight: 1.5 }}>
            Je gaf bij levering aan ook een variatie te willen. Hieronder staat je zojuist goedgekeurde script nogmaals — pas het
            handmatig aan op de punten waar deze variatie moet verschillen.
          </p>
          <textarea
            style={{ minHeight: 90 }}
            value={varText}
            onFocus={() => { varFocused.current = true; }}
            onBlur={() => { varFocused.current = false; }}
            onChange={onVarChange}
          />
          <div style={{ marginTop: 14, maxWidth: 460 }}>
            <label className="field-label">Wat is het verschil in deze variatie? <span style={{ color: '#8C8880', fontWeight: 400 }}>(optioneel)</span></label>
            <input
              type="text"
              value={variationDetail}
              placeholder="Bijv. 'filiaal Utrecht i.p.v. Amsterdam'"
              onFocus={() => { detailFocused.current = true; }}
              onBlur={() => { detailFocused.current = false; }}
              onChange={onVariationDetailChange}
            />
            <div className="hint" style={{ marginTop: 5 }}>Een korte omschrijving voor TFA erbij — dit past de tekst hierboven niet automatisch aan.</div>
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#5C5850' }}>
              <span>Geschatte lengte</span>
              <span style={{ fontWeight: 500, color: varBarColor }}>{varSeconds.toFixed(1)}s van {target}″</span>
            </div>
            <div style={{ marginTop: 6, height: 8, borderRadius: 4, background: '#EAE7DE', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, width: varBarPct, background: varBarColor }} />
            </div>
            <div style={{ marginTop: 6, fontSize: 12.5, fontWeight: 500, color: varBarColor }}>{varStatusLabel}</div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420 }}>
            <button type="button" className="btn-primary" onClick={varApprove}>{varUnchanged ? 'Goedkeuren, dit is prima zo' : 'Wijzigingen opslaan en goedkeuren'}</button>
            {!varUnchanged && <button type="button" className="ghost-btn" onClick={resetVar}>Terugzetten naar origineel</button>}
          </div>
          <div style={{ marginTop: 20, paddingTop: 22, borderTop: '1px solid #EAE7DE', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-primary" style={{ width: 320, flex: 'none' }} onClick={continueToVoice}>Doorgaan naar de stem</button>
          </div>
        </div>
      )}

      <p style={{ marginTop: 20, fontSize: 11.5, color: '#8C8880', lineHeight: 1.5 }}>
        Je krijgt na deze stap nog één moment om het script bij te stellen, voordat de opname start.
      </p>
      <div style={{ marginTop: 20 }}>
        <a href={`/brief/${id}/details`} style={{ fontSize: 12, color: '#8C8880', textDecoration: 'underline' }}>← Terug naar de brief</a>
      </div>
    </StepShell>
  );
}
