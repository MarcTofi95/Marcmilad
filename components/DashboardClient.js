'use client';

import { useMemo, useState } from 'react';

const RANGES = [
  { key: '7d', label: 'Laatste week' },
  { key: '30d', label: 'Laatste maand' },
  { key: '182d', label: 'Laatste 6 maanden' },
  { key: '365d', label: 'Laatste jaar' },
  { key: 'all', label: 'Alles' },
];
const PAGE_SIZE = 8;

function rangeToMs(key) {
  const days = { '7d': 7, '30d': 30, '182d': 182, '365d': 365 }[key];
  return days ? days * 24 * 60 * 60 * 1000 : null;
}

function parseSelectedTracks(brief) {
  try {
    const parsed = brief.selectedTracks ? JSON.parse(brief.selectedTracks) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function statusOf(brief) {
  if (brief.submittedAt) return { label: 'Verzonden', color: '#1D7A46', bg: 'rgba(29,122,70,.12)' };
  if (brief.selectedVoiceId || brief.generatedScript) return { label: 'In behandeling', color: '#8C6D1F', bg: 'rgba(230,200,88,.18)' };
  return { label: 'Gestart', color: '#5C5850', bg: 'rgba(92,88,80,.1)' };
}

export default function DashboardClient({ briefs }) {
  const [range, setRange] = useState('30d');
  const [sortField, setSortField] = useState('updatedAt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    const ms = rangeToMs(range);
    if (!ms) return briefs;
    const cutoff = Date.now() - ms;
    return briefs.filter((b) => new Date(b.createdAt).getTime() >= cutoff);
  }, [briefs, range]);

  const sorted = useMemo(() => {
    const list = filtered.slice();
    list.sort((a, b) => {
      let av = a[sortField] || '';
      let bv = b[sortField] || '';
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = sorted.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const stats = useMemo(() => {
    const total = filtered.length;
    const submitted = filtered.filter((b) => b.submittedAt).length;
    const inProgress = filtered.filter((b) => !b.submittedAt && (b.selectedVoiceId || b.generatedScript)).length;
    const started = total - submitted - inProgress;
    return { total, submitted, inProgress, started };
  }, [filtered]);

  function toggleSort(field) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(1);
  }

  const cardStyle = { background: '#FFFFFF', borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 10px rgba(29,29,29,.05)' };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => { setRange(r.key); setPage(1); }}
            style={{
              border: '1px solid #C9C5B9', borderRadius: 999, padding: '7px 14px', fontSize: 12.5, cursor: 'pointer',
              background: range === r.key ? '#1D1D1D' : '#FFFFFF', color: range === r.key ? '#FFFFFF' : '#5C5850',
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 26 }} className="tfa-stats-grid">
        <div style={cardStyle}>
          <div style={{ fontSize: 12, color: '#8C8880', textTransform: 'uppercase', letterSpacing: '.04em' }}>Totaal briefs</div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32, fontWeight: 600, marginTop: 6 }}>{stats.total}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 12, color: '#8C8880', textTransform: 'uppercase', letterSpacing: '.04em' }}>Verzonden</div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32, fontWeight: 600, marginTop: 6, color: '#1D7A46' }}>{stats.submitted}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 12, color: '#8C8880', textTransform: 'uppercase', letterSpacing: '.04em' }}>In behandeling</div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32, fontWeight: 600, marginTop: 6, color: '#8C6D1F' }}>{stats.inProgress}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 12, color: '#8C8880', textTransform: 'uppercase', letterSpacing: '.04em' }}>Gestart</div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32, fontWeight: 600, marginTop: 6 }}>{stats.started}</div>
        </div>
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: 14, boxShadow: '0 1px 10px rgba(29,29,29,.05)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #EEECE3', textAlign: 'left' }}>
                {[
                  ['companyName', 'Bedrijf'],
                  ['hoofdspotLength', 'Spot'],
                  ['updatedAt', 'Laatst gewijzigd'],
                  ['status', 'Status'],
                ].map(([field, label]) => (
                  <th
                    key={field}
                    onClick={() => (field === 'status' ? null : toggleSort(field))}
                    style={{ padding: '12px 16px', cursor: field === 'status' ? 'default' : 'pointer', color: '#5C5850', fontWeight: 600, whiteSpace: 'nowrap' }}
                  >
                    {label} {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((b) => {
                const st = statusOf(b);
                return (
                  <tr key={b.id} onClick={() => setSelected(b)} style={{ borderBottom: '1px solid #F3F1EA', cursor: 'pointer' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: b.companyName ? '#1D1D1D' : '#9C9890' }}>
                      {b.companyName || 'Nog geen bedrijfsnaam'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{b.hoofdspotLength || '20'}″</td>
                    <td style={{ padding: '12px 16px' }}>{new Date(b.updatedAt).toLocaleString('nl-NL')}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, color: st.color, background: st.bg }}>{st.label}</span>
                    </td>
                  </tr>
                );
              })}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '24px 16px', textAlign: 'center', color: '#8C8880' }}>Geen briefs in deze periode.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #EEECE3', fontSize: 12.5, color: '#5C5850' }}>
          <span>Pagina {pageSafe} van {totalPages}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" disabled={pageSafe <= 1} onClick={() => setPage((p) => p - 1)} style={{ border: '1px solid #C9C5B9', borderRadius: 8, background: '#FFFFFF', padding: '6px 12px', cursor: pageSafe <= 1 ? 'not-allowed' : 'pointer' }}>← Vorige</button>
            <button type="button" disabled={pageSafe >= totalPages} onClick={() => setPage((p) => p + 1)} style={{ border: '1px solid #C9C5B9', borderRadius: 8, background: '#FFFFFF', padding: '6px 12px', cursor: pageSafe >= totalPages ? 'not-allowed' : 'pointer' }}>Volgende →</button>
          </div>
        </div>
      </div>

      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(29,29,29,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 50 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#FFFFFF', borderRadius: 16, padding: '28px 30px', maxWidth: 560, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, margin: 0 }}>{selected.companyName || 'Nog geen bedrijfsnaam'}</h2>
              <button type="button" onClick={() => setSelected(null)} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ marginTop: 16, fontSize: 13, lineHeight: 1.8, color: '#1D1D1D' }}>
              <div><b>Contact:</b> {selected.contactPerson || '—'} ({selected.contactEmail || '—'})</div>
              <div><b>Hoofdspot:</b> {selected.hoofdspotLength || '20'}″{selected.needsVariations ? ' + variatie' : ''}</div>
              <div><b>Stem:</b> {selected.selectedVoiceLabel || 'Nog niet gekozen'}</div>
              <div>
                <b>Muziek:</b>
                {(() => {
                  const tracks = parseSelectedTracks(selected);
                  if (!tracks.length) return ' Nog niet gekozen';
                  return (
                    <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                      {tracks.map((t, i) => (
                        <li key={t.id || i}>
                          {t.title || 'Onbekende track'}{t.artist ? ` — ${t.artist}` : ''}
                          {' '}<span style={{ color: '#8C6D1F', fontWeight: 600 }}>({t.playlistName || 'categorie onbekend'})</span>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
              <div><b>Status:</b> {statusOf(selected).label}</div>
              <div><b>Aangemaakt:</b> {new Date(selected.createdAt).toLocaleString('nl-NL')}</div>
              {selected.submittedAt && <div><b>Verzonden:</b> {new Date(selected.submittedAt).toLocaleString('nl-NL')}</div>}
            </div>
            {(selected.editedScript || selected.generatedScript) && (
              <div style={{ marginTop: 16, background: '#FBF9EC', border: '1px solid #EAE3C4', borderRadius: 12, padding: '14px 16px', fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontSize: 14, lineHeight: 1.6 }}>
                {selected.editedScript !== null && selected.editedScript !== undefined ? selected.editedScript : selected.generatedScript}
              </div>
            )}
            <a href={`/brief/${selected.id}/overview`} style={{ display: 'inline-block', marginTop: 18, fontSize: 12.5, fontWeight: 600, textDecoration: 'underline' }}>
              Open volledige brief →
            </a>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 720px) {
          .tfa-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}
