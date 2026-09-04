'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StepShell from '../../../../components/StepShell';
import { useBrief } from '../../../../components/useBrief';
import { PLAYLISTS } from '../../../../components/flowData';

const MAX_TRACKS = 3;

// Step 6 — mirrors public/music.html: browse curated playlists, pick up to
// 3 favorite tracks.
export default function MusicPage({ params }) {
  const { id } = params;
  const router = useRouter();
  const { brief, loading, saveState, schedulePatch, flushPending, patch } = useBrief(id);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [openPlaylistId, setOpenPlaylistId] = useState(null);
  const [playingTrackId, setPlayingTrackId] = useState(null);

  // Hydrate from the brief once per id, not on every autosave echo — see the
  // long comment in contact/page.js's identical effect for why.
  useEffect(() => {
    if (brief) {
      let tracks = [];
      try {
        tracks = brief.selectedTracks ? JSON.parse(brief.selectedTracks) : [];
        if (!Array.isArray(tracks)) tracks = [];
      } catch (e) {
        tracks = [];
      }
      setSelectedTracks(tracks);
      if (tracks.length) setOpenPlaylistId(tracks[0].playlistId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brief && brief.id]);

  function selectedIndex(trackId) {
    return selectedTracks.findIndex((t) => t.id === trackId);
  }

  function saveTracks(next) {
    setSelectedTracks(next);
    schedulePatch({ selectedTracks: JSON.stringify(next) });
  }

  function toggleTrack(track, playlist) {
    const i = selectedIndex(track.id);
    if (i !== -1) {
      const next = selectedTracks.slice();
      next.splice(i, 1);
      saveTracks(next);
    } else {
      if (selectedTracks.length >= MAX_TRACKS) return;
      saveTracks(selectedTracks.concat({ id: track.id, title: track.title, artist: track.artist, playlistId: playlist.id, playlistName: playlist.name }));
    }
  }

  function removeTrack(trackId) {
    const i = selectedIndex(trackId);
    if (i === -1) return;
    const next = selectedTracks.slice();
    next.splice(i, 1);
    saveTracks(next);
  }

  function playPreview(trackId) {
    setPlayingTrackId((cur) => {
      const next = cur === trackId ? null : trackId;
      if (next) setTimeout(() => setPlayingTrackId((c) => (c === trackId ? null : c)), 2200);
      return next;
    });
  }

  async function next() {
    if (selectedTracks.length === 0) return;
    flushPending();
    await patch({ selectedTracks: JSON.stringify(selectedTracks) });
    router.push(`/brief/${id}/overview`);
  }

  if (loading) return null;

  if (!brief) {
    return (
      <StepShell briefId={id} current={6} brief={null} bigNum="06" kicker="Onze voorstellen voor jou" title="Kies je muziek">
        <div style={{ background: '#FBF3F1', border: '1px solid #C2513F', borderRadius: 10, padding: '12px 14px', fontSize: 12.5, color: '#C2513F' }}>
          Geen brief gevonden bij deze link. Ga terug en kies eerst je stem.
        </div>
      </StepShell>
    );
  }

  const name = brief.companyName && brief.companyName.trim() ? brief.companyName : 'je merk';
  const atLimit = selectedTracks.length >= MAX_TRACKS;

  return (
    <StepShell briefId={id} current={6} brief={brief} bigNum="06" kicker="Onze voorstellen voor jou" title="Kies je muziek" hint={'TFA curateert deze playlists. Open een playlist, beluister een track en kies degene die het beste bij ' + name + ' past.'}>
      <div className="box" style={{ border: '1px dashed #E6C858', fontSize: 12, color: '#383209', marginBottom: 20 }}>
        Je kunt tot <b>3 tracks</b> kiezen als favoriet. TFA combineert er uiteindelijk één met de gekozen stem tot je definitieve mix.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {PLAYLISTS.map((pl) => {
          const hasSelection = pl.tracks.some((t) => selectedIndex(t.id) !== -1);
          const isOpen = openPlaylistId === pl.id;
          return (
            <div key={pl.id} style={{ background: '#FFFFFF', border: '1.5px solid ' + (hasSelection ? '#E6C858' : '#DEDCD7'), borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '15px 17px', cursor: 'pointer' }} onClick={() => setOpenPlaylistId(isOpen ? null : pl.id)}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{pl.name}</div>
                    {hasSelection && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#E6C858' }} />}
                  </div>
                  <div style={{ fontSize: 12, color: '#5C5850', marginTop: 2, lineHeight: 1.4 }}>{pl.description}</div>
                </div>
                <span style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' }}>▾</span>
              </div>
              {isOpen && (
                <div style={{ borderTop: '1px solid #DEDCD7', padding: '4px 12px 10px' }}>
                  {pl.tracks.map((track) => {
                    const selected = selectedIndex(track.id) !== -1;
                    const isPlaying = playingTrackId === track.id;
                    return (
                      <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, background: selected ? '#FBF0C8' : 'transparent', opacity: atLimit && !selected ? 0.45 : 1 }}>
                        <button type="button" onClick={() => playPreview(track.id)} style={{ flex: 'none', width: 30, height: 30, borderRadius: '50%', border: '1px solid #C9C5B9', background: '#FBF9EC', cursor: 'pointer' }}>
                          {isPlaying ? '❚❚' : '▶'}
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: selected ? 600 : 500, color: '#1D1D1D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                          <div style={{ fontSize: 11, color: '#8C8880', marginTop: 1 }}>{track.artist} · {track.duration}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleTrack(track, pl)}
                          style={{ flex: 'none', width: 20, height: 20, borderRadius: '50%', border: '1.5px solid ' + (selected ? '#E6C858' : '#C9C5B9'), background: selected ? '#E6C858' : '#FFFFFF', cursor: 'pointer' }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedTracks.length > 0 && (
        <div style={{ marginTop: 16, borderRadius: 10, padding: '14px 16px', fontSize: 12.5, color: '#383209', lineHeight: 1.5, background: '#E6C858' }}>
          <div>{selectedTracks.length > 1 ? 'Gekozen tracks (max. 3, TFA levert er 1):' : 'Gekozen track:'}</div>
          {selectedTracks.map((t, i) => (
            <div key={t.id} style={{ marginTop: 7, marginLeft: 8, padding: '7px 10px', background: '#FFFFFF', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 12.5, color: '#1D1D1D' }}>{t.title}</div>
                <div style={{ fontSize: 11, color: '#5C5850', marginTop: 1 }}>{t.playlistName}</div>
              </div>
              <button type="button" onClick={() => removeTrack(t.id)} aria-label="Verwijderen" style={{ flex: 'none', width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 22 }}>
        <a href={`/brief/${id}/voice`} style={{ fontSize: 12, color: '#8C8880', textDecoration: 'underline' }}>← Terug naar de stem</a>
      </div>
      <div style={{ marginTop: 20, paddingTop: 22, borderTop: '1px solid #EAE7DE', display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="btn-primary" style={{ width: 320, flex: 'none' }} disabled={selectedTracks.length === 0} onClick={next}>
          Bevestigen — verder naar het overzicht
        </button>
      </div>
      <div style={{ fontSize: 11, color: '#8C8880', textAlign: 'right', marginTop: 10, height: 14 }}>{saveState}</div>
      <p style={{ marginTop: 20, fontSize: 11.5, color: '#8C8880', lineHeight: 1.5 }}>Twijfel je tussen twee tracks? Je kunt je keuze altijd nog aanpassen voordat je alles verstuurt.</p>
    </StepShell>
  );
}
