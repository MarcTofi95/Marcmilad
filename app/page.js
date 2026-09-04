import Link from 'next/link';
import BrandMark from '../components/BrandMark';

// Public marketing homepage — general layout/copy inspired by
// /tmp/canvas_work/Homepage.dc.html, wired to real routes (no data needed).
export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#DEDCD7' }}>
      <header style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, letterSpacing: '.09em', textTransform: 'uppercase', color: '#1D1D1D', fontWeight: 600 }}>
          <BrandMark size={24} />
          TFA Commercial Productie
        </div>
        <Link href="/sign-in" style={{ fontSize: 13, fontWeight: 600, color: '#383209', textDecoration: 'underline', textUnderlineOffset: 2 }}>
          Producer login →
        </Link>
      </header>

      <main style={{ maxWidth: 880, margin: '60px auto 0', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, letterSpacing: '.09em', textTransform: 'uppercase', color: '#8C6D1F', fontWeight: 600 }}>Radiocommercials, zonder gedoe</div>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, fontSize: 52, lineHeight: 1.1, margin: '18px 0 20px', color: '#1D1D1D' }}>
          Van brief tot uitzending, in zeven simpele stappen.
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.6, color: '#5C5850', maxWidth: 620, margin: '0 auto 36px' }}>
          Vertel ons over je merk, je product en je doelgroep. TFA schrijft het script, kiest de stem en de muziek — jij keurt
          alles goed voordat het de studio in gaat.
        </p>
        <Link
          href="/start"
          className="btn-primary"
          style={{ display: 'inline-block', textDecoration: 'none', width: 320, textAlign: 'center' }}
        >
          Start je commercial
        </Link>
      </main>

      <section style={{ maxWidth: 1180, margin: '80px auto', padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {[
          { n: '01', title: 'Jij vertelt het verhaal', text: 'Contactgegevens, levering en een korte brief over je product, doelgroep en boodschap.' },
          { n: '02', title: 'TFA schrijft en stelt voor', text: 'Een scriptvoorstel, stemvoorstellen en gecureerde muziek — allemaal op maat van je brief.' },
          { n: '03', title: 'Jij keurt goed', text: 'Pas het script aan waar nodig, kies je favoriete stem en track, en verstuur.' },
        ].map((card) => (
          <div key={card.n} style={{ background: '#FFFFFF', borderRadius: 16, padding: '28px 26px', boxShadow: '0 2px 20px rgba(29,29,29,.06)' }}>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, fontSize: 32, color: '#E6C858' }}>{card.n}</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 10, color: '#1D1D1D' }}>{card.title}</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.55, color: '#5C5850', marginTop: 8 }}>{card.text}</div>
          </div>
        ))}
      </section>

      <footer style={{ maxWidth: 1180, margin: '0 auto', padding: '20px 20px 60px', textAlign: 'center', fontSize: 12, color: '#8C8880' }}>
        Team TFA — <a href="mailto:planning@tfa.studio">planning@tfa.studio</a>
      </footer>

      <style>{`
        @media (max-width: 820px) {
          section { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
