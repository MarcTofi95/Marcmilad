'use client';

import { useState } from 'react';

const cardStyle = { background: '#FFFFFF', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 6px rgba(29,29,29,.04)' };

function StatusBadge({ status }) {
  const live = status === 'live';
  return (
    <span
      style={{
        fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
        color: live ? '#1D7A46' : '#5C5850', background: live ? 'rgba(29,122,70,.12)' : 'rgba(92,88,80,.1)',
      }}
    >
      {live ? 'Live' : 'Inactief'}
    </span>
  );
}

export default function PromptVersionsClient({ initialVersions }) {
  const [versions, setVersions] = useState(initialVersions);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [content, setContent] = useState((initialVersions.find((v) => v.status === 'live') || {}).content || '');
  const [busyId, setBusyId] = useState(null); // 'new' while creating, or a version id while activating/deactivating
  const [error, setError] = useState('');

  async function refresh() {
    try {
      const res = await fetch('/api/dashboard/prompt-versions');
      if (res.ok) setVersions(await res.json());
    } catch (e) {}
  }

  async function createVersion(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setBusyId('new');
    setError('');
    try {
      const res = await fetch('/api/dashboard/prompt-versions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ label, content }),
      });
      if (!res.ok) throw new Error('Opslaan mislukt');
      await refresh();
      setShowForm(false);
      setLabel('');
    } catch (err) {
      setError('Kon de nieuwe versie niet opslaan. Probeer het opnieuw.');
    } finally {
      setBusyId(null);
    }
  }

  async function setAction(id, action) {
    setBusyId(id);
    setError('');
    try {
      const res = await fetch(`/api/dashboard/prompt-versions/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error('Actie mislukt');
      await refresh();
    } catch (err) {
      setError('Actie is niet gelukt. Probeer het opnieuw.');
    } finally {
      setBusyId(null);
    }
  }

  const liveVersion = versions.find((v) => v.status === 'live');

  return (
    <div>
      {error && (
        <div style={{ background: '#FBF3F1', border: '1px solid #C2513F', borderRadius: 10, padding: '10px 14px', fontSize: 12.5, color: '#C2513F', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {!liveVersion && (
        <div style={{ background: '#FBF9EC', border: '1px solid #EAE3C4', borderRadius: 10, padding: '10px 14px', fontSize: 12.5, color: '#383209', marginBottom: 16 }}>
          Er is momenteel geen live versie — scriptgeneratie gebruikt de ingebouwde standaardinstructies totdat je een versie live zet.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button
          type="button"
          onClick={() => { setShowForm((s) => !s); if (!showForm) setContent((liveVersion || {}).content || ''); }}
          className="btn-primary"
          style={{ padding: '9px 16px', fontSize: 13 }}
        >
          {showForm ? 'Annuleren' : '+ Nieuwe versie'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createVersion} style={{ ...cardStyle, marginBottom: 18, border: '1.5px solid #EAE3C4' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Nieuwe promptversie</div>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Naam (bijv. Zakelijker toon)"
            style={{ width: '100%', border: '1px solid #C9C5B9', borderRadius: 8, padding: '9px 10px', fontSize: 13, marginBottom: 10 }}
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="De instructies die Claude vertellen hoe te schrijven..."
            style={{ width: '100%', minHeight: 220, border: '1px solid #C9C5B9', borderRadius: 8, padding: '10px 12px', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit' }}
          />
          <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
            <button type="submit" disabled={busyId === 'new' || !content.trim()} className="btn-primary" style={{ padding: '9px 16px', fontSize: 13, opacity: busyId === 'new' ? 0.7 : 1 }}>
              {busyId === 'new' ? 'Bezig...' : 'Opslaan als nieuwe (inactieve) versie'}
            </button>
            <span style={{ fontSize: 11.5, color: '#8C8880' }}>Wordt niet meteen live — dat doe je hieronder.</span>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {versions.map((v) => (
          <div key={v.id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{v.label}</span>
                <StatusBadge status={v.status} />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#8C8880' }}>{new Date(v.createdAt).toLocaleString('nl-NL')}</span>
                {v.status === 'live' ? (
                  <button type="button" disabled={busyId === v.id} onClick={() => setAction(v.id, 'deactivate')} style={{ border: '1px solid #C9C5B9', borderRadius: 8, background: '#FFFFFF', padding: '6px 12px', fontSize: 12, cursor: 'pointer', opacity: busyId === v.id ? 0.6 : 1 }}>
                    {busyId === v.id ? 'Bezig...' : 'Deactiveren'}
                  </button>
                ) : (
                  <button type="button" disabled={busyId === v.id} onClick={() => setAction(v.id, 'activate')} className="btn-primary" style={{ padding: '6px 12px', fontSize: 12, opacity: busyId === v.id ? 0.7 : 1 }}>
                    {busyId === v.id ? 'Bezig...' : 'Maak live'}
                  </button>
                )}
              </div>
            </div>
            <pre style={{ marginTop: 10, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 12.5, lineHeight: 1.55, color: '#383209', background: '#FBF9EC', border: '1px solid #EAE3C4', borderRadius: 8, padding: '10px 12px', maxHeight: 160, overflowY: 'auto' }}>
              {v.content}
            </pre>
          </div>
        ))}
        {versions.length === 0 && <div style={{ fontSize: 13, color: '#8C8880' }}>Nog geen versies.</div>}
      </div>
    </div>
  );
}
