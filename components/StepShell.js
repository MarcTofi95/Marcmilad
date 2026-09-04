'use client';

import Link from 'next/link';
import { STEPS, computeReached } from './flowData';

function WaveIcon({ dim }) {
  const fill = dim ? '#514E44' : '#E6C858';
  const opacity = dim ? 0.5 : 1;
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" style={{ flex: 'none' }}>
      <rect x="0" y="3" width="1.6" height="4" rx="0.8" fill={fill} opacity={opacity} />
      <rect x="2.8" y="1.5" width="1.6" height="7" rx="0.8" fill={fill} opacity={opacity} />
      <rect x="5.6" y="0" width="1.6" height="10" rx="0.8" fill={fill} opacity={opacity} />
      <rect x="8.4" y="1.5" width="1.6" height="7" rx="0.8" fill={fill} opacity={opacity} />
      <rect x="11.2" y="3" width="1.6" height="4" rx="0.8" fill={fill} opacity={opacity} />
    </svg>
  );
}

// The dark sidebar + big number + fixed-header content panel shared by every
// step of the client brief flow (contact/delivery/details/script/voice/
// music/overview) — ports the sidebar behavior from every original
// public/*.html page (applyReachableSteps) into one place.
export default function StepShell({ briefId, current, brief, subtitle, bigNum, kicker, title, hint, children }) {
  const reached = computeReached(brief);
  const companyName = brief && brief.companyName && brief.companyName.trim() ? brief.companyName : null;

  return (
    <div style={{ maxWidth: 1180, margin: '44px auto', padding: '0 20px 48px', display: 'flex', gap: 24, alignItems: 'flex-start' }} className="tfa-shell">
      <div
        style={{
          flex: '0 0 300px', background: '#1D1D1D', color: '#FFFFFF', borderRadius: 20, padding: '36px 26px',
          boxShadow: '0 2px 28px rgba(29,29,29,.18)', position: 'sticky', top: 24, display: 'flex', flexDirection: 'column',
        }}
        className="tfa-sidebar"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, letterSpacing: '.09em', textTransform: 'uppercase', color: '#E6C858', fontWeight: 500 }}>
          <WaveIcon />
          TFA
        </div>
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, fontSize: 24,
            color: companyName ? '#FFFFFF' : '#8C897E', margin: '16px 0 0', lineHeight: 1.3,
          }}
        >
          {companyName || 'Nog geen bedrijfsnaam'}
        </h1>
        {subtitle ? <div style={{ fontSize: 11.5, color: '#B9B6AC', marginTop: 4 }}>{subtitle}</div> : null}

        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {STEPS.map((step) => {
            const isCurrent = step.n === current;
            const isDone = !isCurrent && (step.n < current || !!reached[step.n]);
            const rowStyle = {
              display: 'flex', alignItems: 'center', gap: 10, padding: isCurrent ? '10px 12px' : '9px 10px',
              borderLeft: isCurrent ? '2px solid #E6C858' : '2px solid transparent',
              background: isCurrent ? 'rgba(230,200,88,.10)' : 'transparent',
              borderRadius: '0 6px 6px 0', textDecoration: 'none', cursor: isDone ? 'pointer' : 'default',
            };
            const numColor = isCurrent || isDone ? '#E6C858' : '#77746A';
            const labelStyle = isCurrent
              ? { fontSize: 16.5, color: '#FFFFFF', fontWeight: 600 }
              : { fontSize: 14.5, color: isDone ? '#D8D5CB' : '#8C8880' };
            const inner = (
              <>
                <WaveIcon dim={!isCurrent && !isDone} />
                <span style={{ fontSize: 12, width: 16, flex: 'none', fontWeight: 500, color: numColor }}>
                  {String(step.n).padStart(2, '0')}
                </span>
                <span style={labelStyle}>{step.label}</span>
              </>
            );
            if (isDone && briefId) {
              return (
                <Link key={step.n} href={`/brief/${briefId}/${step.path}`} style={rowStyle} className="tfa-step-row">
                  {inner}
                </Link>
              );
            }
            return (
              <div key={step.n} style={rowStyle}>
                {inner}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', margin: '24px 0' }}>
          {[6, 10, 14, 10, 6].map((h, i) => (
            <span key={i} style={{ display: 'block', width: 3, height: h, borderRadius: 2, background: '#E6C858', opacity: 0.55 }} />
          ))}
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', gap: 10, alignItems: 'flex-start', paddingTop: 20, borderTop: '1px solid #33301F' }}>
          <div
            style={{
              width: 34, height: 34, borderRadius: '50%', background: '#E6C858', color: '#1D1D1D', fontWeight: 700,
              fontSize: 11.5, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
            }}
          >
            TFA
          </div>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: '#FFFFFF' }}>Team TFA</div>
            <div style={{ fontSize: 13.5, color: '#B9B6AC', marginTop: 2, lineHeight: 1.4 }}>
              Jouw team bij TFA — we houden dit traject in de gaten van brief tot uitzending.
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1, minWidth: 0, background: '#FFFFFF', borderRadius: 20, padding: '56px 60px',
          boxShadow: '0 2px 28px rgba(29,29,29,.08)', position: 'relative', overflow: 'hidden',
        }}
        className="tfa-content"
      >
        {bigNum ? (
          <div style={{ position: 'absolute', top: -2, right: 8, fontWeight: 700, fontSize: 130, lineHeight: 1, color: '#1D1D1D', opacity: 0.05, zIndex: 0, pointerEvents: 'none' }}>
            {bigNum}
          </div>
        ) : null}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {kicker ? (
            <div style={{ fontSize: 13, letterSpacing: '.09em', textTransform: 'uppercase', color: '#383209', fontWeight: 500 }}>{kicker}</div>
          ) : null}
          {title ? (
            <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, fontSize: 36, margin: '8px 0 6px', color: '#1D1D1D' }}>
              {title}
            </h2>
          ) : null}
          {hint ? <p style={{ fontSize: 13.5, lineHeight: 1.55, color: '#5C5850', margin: '0 0 26px' }}>{hint}</p> : null}
          {children}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .tfa-shell {
            flex-direction: column;
            margin: 20px auto;
          }
          .tfa-sidebar {
            flex: none;
            width: 100%;
            position: static;
          }
          .tfa-content {
            padding: 32px 24px;
          }
        }
        .tfa-step-row:hover {
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
}
