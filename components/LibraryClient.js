'use client';

import { useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  addTrackAction, removeTrackAction, addVoiceAction, removeVoiceAction,
  addTracksBulkAction, addVoicesBulkAction,
} from '../app/dashboard/library/actions';

const cardStyle = { background: '#FBF9EC', border: '1.5px solid #EAE3C4', borderRadius: 12, padding: '14px 16px' };

// Must be a child of the <form>, not the component that renders the form —
// useFormStatus only reports the nearest ancestor <form>'s pending state
// when called from a descendant. Shows a spinner + "Bezig met uploaden…"
// while the server action (which may be uploading an audio file to Blob) is
// in flight, since that can take a few seconds and the form previously gave
// no feedback at all while it worked.
function SubmitButton({ label, pendingLabel }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending} style={{ padding: '10px 16px', fontSize: 13, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8, opacity: pending ? 0.75 : 1, cursor: pending ? 'wait' : 'pointer' }}>
      {pending && (
        <span
          style={{
            width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(29,29,29,.25)', borderTopColor: '#1D1D1D',
            display: 'inline-block', animation: 'tfa-spin .7s linear infinite',
          }}
        />
      )}
      {pending ? (pendingLabel || 'Bezig…') : label}
    </button>
  );
}

function fileBaseName(file) {
  const name = file.name || '';
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

// Voice tags picker — a dropdown of existing tags (checkable) plus a small
// "add new tag" field, replacing the old free-text "comma-separated tags"
// input. Music has no tags field, so this is voice-only. `selected` is the
// array of chosen tag strings; `onChange` receives the updated array;
// `onAddTag` is called once when a genuinely new tag is added, so the
// caller can add it to the shared known-tags list (making it available in
// every other tag picker on the page too, not just this one).
function TagPicker({ allTags, selected, onChange, onAddTag }) {
  const [open, setOpen] = useState(false);
  const [newTag, setNewTag] = useState('');

  function toggle(tag) {
    if (selected.includes(tag)) onChange(selected.filter((t) => t !== tag));
    else onChange([...selected, tag]);
  }

  function addNew() {
    const tag = newTag.trim();
    if (!tag) return;
    if (!allTags.includes(tag)) onAddTag(tag);
    if (!selected.includes(tag)) onChange([...selected, tag]);
    setNewTag('');
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', textAlign: 'left', border: '1px solid #C9C5B9', borderRadius: 8, padding: '9px 10px',
          fontSize: 13, background: '#FFFFFF', cursor: 'pointer', minHeight: 38, display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center',
        }}
      >
        {selected.length === 0 && <span style={{ color: '#9C9890' }}>Kies tags…</span>}
        {selected.map((tag) => (
          <span key={tag} style={{ fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: '#FBF0C8', color: '#383209' }}>
            {tag}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', color: '#8C8880', fontSize: 11 }}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div style={{ position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0, marginTop: 4, background: '#FFFFFF', border: '1px solid #C9C5B9', borderRadius: 8, boxShadow: '0 4px 16px rgba(29,29,29,.12)', padding: 8, maxHeight: 220, overflowY: 'auto' }}>
          {allTags.map((tag) => (
            <label key={tag} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px', fontSize: 12.5, cursor: 'pointer', borderRadius: 6 }}>
              <input type="checkbox" checked={selected.includes(tag)} onChange={() => toggle(tag)} />
              {tag}
            </label>
          ))}
          {allTags.length === 0 && <div style={{ fontSize: 12, color: '#8C8880', padding: '4px 6px' }}>Nog geen tags beschikbaar.</div>}
          <div style={{ marginTop: 6, paddingTop: 8, borderTop: '1px solid #EEECE3', display: 'flex', gap: 6 }}>
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNew(); } }}
              placeholder="Nieuwe tag..."
              style={{ flex: 1, border: '1px solid #C9C5B9', borderRadius: 6, padding: '6px 8px', fontSize: 12.5 }}
            />
            <button type="button" onClick={addNew} style={{ border: 'none', borderRadius: 6, background: '#1D1D1D', color: '#FFFFFF', fontSize: 12, padding: '6px 12px', cursor: 'pointer' }}>
              Toevoegen
            </button>
          </div>
          <button type="button" onClick={() => setOpen(false)} style={{ marginTop: 6, width: '100%', border: 'none', background: 'transparent', color: '#8C8880', fontSize: 11.5, cursor: 'pointer', padding: '4px 0' }}>
            Sluiten
          </button>
        </div>
      )}
    </div>
  );
}

// Shared drag-and-drop staging zone + bulk-review list used by both the
// Muziek and Stemmen tabs. `fields` describes the per-item editable inputs
// to render for each staged file; the parent supplies the exact shape it
// needs via renderRow / buildFormData.
function BulkImportZone({ kind, categories, defaultGender, defaultAgeRange, onConfirm, allTags, onAddTag }) {
  const [staged, setStaged] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);

  function addFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(f.name));
    if (!files.length) return;
    setStaged((cur) => [
      ...cur,
      ...files.map((file) => ({
        localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        title: fileBaseName(file),
        artist: '',
        category: categories ? categories[0] : '',
        name: fileBaseName(file),
        gender: defaultGender || 'vrouw',
        ageRange: defaultAgeRange || '35-54',
        tags: [],
        fileId: '',
      })),
    ]);
  }

  function updateStaged(localId, patch) {
    setStaged((cur) => cur.map((it) => (it.localId === localId ? { ...it, ...patch } : it)));
  }

  function removeStaged(localId) {
    setStaged((cur) => cur.filter((it) => it.localId !== localId));
  }

  async function confirmAll() {
    if (!staged.length) return;
    setBusy(true);
    try {
      await onConfirm(staged);
      setStaged([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 18 }}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        style={{
          border: `2px dashed ${dragOver ? '#E6C858' : '#C9C5B9'}`, borderRadius: 12, padding: '22px 16px',
          textAlign: 'center', cursor: 'pointer', background: dragOver ? 'rgba(230,200,88,.08)' : '#FFFFFF',
          transition: 'background .15s ease, border-color .15s ease',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1D' }}>Sleep audiobestanden hierheen</div>
        <div style={{ fontSize: 12, color: '#8C8880', marginTop: 4 }}>of klik om te bladeren — meerdere bestanden tegelijk toegestaan</div>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          multiple
          onChange={(e) => addFiles(e.target.files)}
          style={{ display: 'none' }}
        />
      </div>

      {staged.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#5C5850' }}>
            {staged.length} bestand{staged.length === 1 ? '' : 'en'} klaar om te importeren — controleer de velden hieronder:
          </div>
          {staged.map((it) => (
            <div key={it.localId} style={{ background: '#FFFFFF', border: '1px solid #EEECE3', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11.5, color: '#8C8880', marginBottom: 8 }}>{it.file.name}</div>
              {kind === 'music' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }} className="tfa-lib-grid">
                  <input type="text" value={it.title} onChange={(e) => updateStaged(it.localId, { title: e.target.value })} placeholder="Titel" />
                  <input type="text" value={it.artist} onChange={(e) => updateStaged(it.localId, { artist: e.target.value })} placeholder="Artiest" />
                  <select value={it.category} onChange={(e) => updateStaged(it.localId, { category: e.target.value })}>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="text" value={it.fileId} onChange={(e) => updateStaged(it.localId, { fileId: e.target.value })} placeholder="File ID (optioneel)" />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.4fr 1fr', gap: 8 }} className="tfa-lib-grid">
                  <input type="text" value={it.name} onChange={(e) => updateStaged(it.localId, { name: e.target.value })} placeholder="Naam" />
                  <select value={it.gender} onChange={(e) => updateStaged(it.localId, { gender: e.target.value })}>
                    <option value="vrouw">Vrouw</option>
                    <option value="man">Man</option>
                  </select>
                  <select value={it.ageRange} onChange={(e) => updateStaged(it.localId, { ageRange: e.target.value })}>
                    <option value="18-34">18–34</option>
                    <option value="35-54">35–54</option>
                    <option value="55+">55+</option>
                  </select>
                  <TagPicker allTags={allTags || []} selected={it.tags} onChange={(tags) => updateStaged(it.localId, { tags })} onAddTag={onAddTag} />
                  <input type="text" value={it.fileId} onChange={(e) => updateStaged(it.localId, { fileId: e.target.value })} placeholder="File ID (optioneel)" />
                </div>
              )}
              <button type="button" onClick={() => removeStaged(it.localId)} style={{ marginTop: 8, border: 'none', background: 'transparent', color: '#C2513F', cursor: 'pointer', fontSize: 11.5 }}>
                Verwijderen uit import
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={confirmAll}
            disabled={busy}
            className="btn-primary"
            style={{ alignSelf: 'flex-start', padding: '10px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, opacity: busy ? 0.75 : 1, cursor: busy ? 'wait' : 'pointer' }}
          >
            {busy && (
              <span style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(29,29,29,.25)', borderTopColor: '#1D1D1D', display: 'inline-block', animation: 'tfa-spin .7s linear infinite' }} />
            )}
            {busy ? 'Bezig met importeren…' : `Importeer alles (${staged.length})`}
          </button>
        </div>
      )}
    </div>
  );
}

export default function LibraryClient({ tracks, voices, categories, defaultTags }) {
  const [tab, setTab] = useState('music');
  const [knownTags, setKnownTags] = useState(() => {
    const set = new Set(defaultTags || []);
    (voices || []).forEach((v) => (v.tags || []).forEach((t) => set.add(t)));
    return Array.from(set);
  });
  const [selectedTags, setSelectedTags] = useState([]);

  function addKnownTag(tag) {
    setKnownTags((cur) => (cur.includes(tag) ? cur : [...cur, tag]));
  }

  async function confirmTracksBulk(staged) {
    const formData = new FormData();
    formData.set('count', String(staged.length));
    staged.forEach((it, i) => {
      formData.set(`track_${i}_title`, it.title);
      formData.set(`track_${i}_artist`, it.artist);
      formData.set(`track_${i}_category`, it.category);
      formData.set(`track_${i}_fileId`, it.fileId);
      formData.set(`track_${i}_audioFile`, it.file);
    });
    await addTracksBulkAction(formData);
  }

  async function confirmVoicesBulk(staged) {
    const formData = new FormData();
    formData.set('count', String(staged.length));
    staged.forEach((it, i) => {
      formData.set(`voice_${i}_name`, it.name);
      formData.set(`voice_${i}_gender`, it.gender);
      formData.set(`voice_${i}_ageRange`, it.ageRange);
      formData.set(`voice_${i}_tags`, (it.tags || []).join(','));
      formData.set(`voice_${i}_fileId`, it.fileId);
      formData.set(`voice_${i}_audioFile`, it.file);
    });
    await addVoicesBulkAction(formData);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        <button
          type="button"
          onClick={() => setTab('music')}
          style={{ border: 'none', borderRadius: 999, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: tab === 'music' ? '#1D1D1D' : '#FFFFFF', color: tab === 'music' ? '#FFFFFF' : '#5C5850' }}
        >
          Muziek
        </button>
        <button
          type="button"
          onClick={() => setTab('voice')}
          style={{ border: 'none', borderRadius: 999, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: tab === 'voice' ? '#1D1D1D' : '#FFFFFF', color: tab === 'voice' ? '#FFFFFF' : '#5C5850' }}
        >
          Stemmen
        </button>
      </div>

      {tab === 'music' ? (
        <div>
          <form action={addTrackAction} style={cardStyle} className="tfa-lib-form">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Nieuwe track toevoegen</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }} className="tfa-lib-grid">
              <input name="title" type="text" placeholder="Titel" required />
              <input name="artist" type="text" placeholder="Artiest" />
              <select name="category" defaultValue={categories[0]}>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input name="fileId" type="text" placeholder="File ID (optioneel)" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <input name="audioFile" type="file" accept="audio/*" style={{ flex: 1, fontSize: 12.5 }} />
              <SubmitButton label="Toevoegen" pendingLabel="Bezig met uploaden…" />
            </div>
          </form>

          <BulkImportZone kind="music" categories={categories} onConfirm={confirmTracksBulk} />

          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tracks.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FFFFFF', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 6px rgba(29,29,29,.04)', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: '#8C8880' }}>
                    {t.artist} · {t.category}{t.fileId ? ` · ID: ${t.fileId}` : ''}
                  </div>
                </div>
                {t.audioUrl ? (
                  <audio controls src={t.audioUrl} style={{ height: 32, maxWidth: 220 }} />
                ) : (
                  <div style={{ fontSize: 11.5, color: '#B9B6AC', fontStyle: 'italic' }}>Geen audio geüpload</div>
                )}
                <form action={removeTrackAction.bind(null, t.id)}>
                  <button type="submit" style={{ border: 'none', background: 'transparent', color: '#C2513F', cursor: 'pointer', fontSize: 12 }}>Verwijderen</button>
                </form>
              </div>
            ))}
            {tracks.length === 0 && <div style={{ fontSize: 13, color: '#8C8880' }}>Nog geen tracks.</div>}
          </div>
        </div>
      ) : (
        <div>
          <form action={addVoiceAction} style={cardStyle} className="tfa-lib-form">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Nieuwe stem toevoegen</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr 1fr', gap: 10 }} className="tfa-lib-grid">
              <input name="name" type="text" placeholder="Naam" required />
              <select name="gender" defaultValue="vrouw">
                <option value="vrouw">Vrouw</option>
                <option value="man">Man</option>
              </select>
              <select name="ageRange" defaultValue="35-54">
                <option value="18-34">18–34</option>
                <option value="35-54">35–54</option>
                <option value="55+">55+</option>
              </select>
              <TagPicker allTags={knownTags} selected={selectedTags} onChange={setSelectedTags} onAddTag={addKnownTag} />
              <input name="fileId" type="text" placeholder="File ID (optioneel)" />
            </div>
            <input type="hidden" name="tags" value={selectedTags.join(',')} readOnly />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <input name="audioFile" type="file" accept="audio/*" style={{ flex: 1, fontSize: 12.5 }} />
              <SubmitButton label="Toevoegen" pendingLabel="Bezig met uploaden…" />
            </div>
          </form>

          <BulkImportZone kind="voice" defaultGender="vrouw" defaultAgeRange="35-54" onConfirm={confirmVoicesBulk} allTags={knownTags} onAddTag={addKnownTag} />

          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {voices.map((v) => (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FFFFFF', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 6px rgba(29,29,29,.04)', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{v.name}</div>
                  <div style={{ fontSize: 12, color: '#8C8880' }}>
                    {v.gender} · {v.ageRange} · {v.tags.join(', ')}{v.fileId ? ` · ID: ${v.fileId}` : ''}
                  </div>
                </div>
                {v.audioUrl ? (
                  <audio controls src={v.audioUrl} style={{ height: 32, maxWidth: 220 }} />
                ) : (
                  <div style={{ fontSize: 11.5, color: '#B9B6AC', fontStyle: 'italic' }}>Geen audio geüpload</div>
                )}
                <form action={removeVoiceAction.bind(null, v.id)}>
                  <button type="submit" style={{ border: 'none', background: 'transparent', color: '#C2513F', cursor: 'pointer', fontSize: 12 }}>Verwijderen</button>
                </form>
              </div>
            ))}
            {voices.length === 0 && <div style={{ fontSize: 13, color: '#8C8880' }}>Nog geen stemmen.</div>}
          </div>
        </div>
      )}

      <style>{`
        .tfa-lib-form input, .tfa-lib-form select {
          border: 1px solid #C9C5B9; border-radius: 8px; padding: 9px 10px; font-size: 13px; background: #FFFFFF;
        }
        @media (max-width: 720px) {
          .tfa-lib-grid { grid-template-columns: 1fr !important; }
        }
        @keyframes tfa-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
