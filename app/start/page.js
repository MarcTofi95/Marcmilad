'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Landing route the public homepage's CTA points to: creates a fresh brief
// via POST /api/briefs, then redirects to step 1 with the new id — mirrors
// what contact.html did inline (ensureBrief()) when no ?id was present.
export default function StartPage() {
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/briefs', { method: 'POST' });
        if (!res.ok) throw new Error('create failed');
        const brief = await res.json();
        if (!cancelled) router.replace(`/brief/${brief.id}/contact`);
      } catch (e) {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#DEDCD7' }}>
      <p style={{ fontSize: 14, color: '#5C5850' }}>
        {error ? 'Kon geen nieuwe brief aanmaken — probeer het opnieuw.' : 'Even geduld, we starten je commercial…'}
      </p>
    </div>
  );
}
