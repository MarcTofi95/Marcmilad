'use client';

// Full-screen loading state built from the client's animated brand mark
// (public/brand/preloader.mp4) instead of a blank page or a generic spinner.
// Used everywhere the app previously rendered nothing (`return null`) while
// waiting on a brief to load, and as the root route-level loading.js fallback
// shown during slower server-rendered page transitions (e.g. the dashboard
// pages, which fetch real data server-side before rendering).
export default function Preloader({ fullScreen = true }) {
  return (
    <div
      style={{
        position: fullScreen ? 'fixed' : 'static',
        inset: fullScreen ? 0 : undefined,
        minHeight: fullScreen ? undefined : '40vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1D1D1D',
        zIndex: 999,
      }}
    >
      <video
        src="/brand/preloader.mp4"
        autoPlay
        loop
        muted
        playsInline
        style={{ width: 140, height: 140, objectFit: 'contain' }}
      />
    </div>
  );
}
