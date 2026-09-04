'use client';

import { useState } from 'react';
import { addTrackAction, removeTrackAction, addVoiceAction, removeVoiceAction } from '../app/dashboard/library/actions';

const cardStyle = { background: '#FBF9EC', border: '1.5px solid #EAE3C4', borderRadius: 12, padding: '14px 16px' };

export default function LibraryClient({ tracks, voices, categories, defaultTags }) {
  const [tab, setTab] = useState('music');
  const [tagInput, setTagInput] = useState(defaultTags.join(', '));

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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: 10 }} className="tfa-lib-grid">
              <input name="title" type="text" placeholder="Titel" required />
              <input name="artist" type="text" placeholder="Artiest" />
              <select name="category" defaultValue={categories[0]}>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input name="duration" type="text" placeholder="0:20" style={{ width: 70 }} />
              <button type="submit" className="btn-primary" style={{ padding: '10px 16px', fontSize: 13 }}>Toevoegen</button>
            </div>
          </form>

          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tracks.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FFFFFF', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 6px rgba(29,29,29,.04)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: '#8C8880' }}>{t.artist} · {t.category} · {t.duration}</div>
                </div>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr auto', gap: 10 }} className="tfa-lib-grid">
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
              <input name="tags" type="text" defaultValue="" placeholder="Tags, komma-gescheiden" />
              <button type="submit" className="btn-primary" style={{ padding: '10px 16px', fontSize: 13 }}>Toevoegen</button>
            </div>
            <div className="hint" style={{ marginTop: 8 }}>
              Bestaande tags: {tagInput} — of typ een nieuwe tag hierboven om die aan de lijst toe te voegen.
            </div>
          </form>

          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {voices.map((v) => (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FFFFFF', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 6px rgba(29,29,29,.04)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{v.name}</div>
                  <div style={{ fontSize: 12, color: '#8C8880' }}>{v.gender} · {v.ageRange} · {v.tags.join(', ')}</div>
                </div>
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
      `}</style>
    </div>
  );
}
