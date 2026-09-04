import Preloader from '../components/Preloader';

// Next's route-level Suspense fallback — shown automatically during a page
// transition whenever the destination is a server component still awaiting
// data (e.g. navigating into /dashboard or /dashboard/library, both of which
// fetch real data server-side before they can render).
export default function Loading() {
  return <Preloader />;
}
