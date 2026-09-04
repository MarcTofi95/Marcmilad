import { SignUp } from '@clerk/nextjs';
import BrandMark from '../../../components/BrandMark';

const clerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;

export default function SignUpPage() {
  if (!clerkConfigured) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#DEDCD7', padding: 24, textAlign: 'center' }}>
        <p style={{ maxWidth: 420, fontSize: 14, color: '#5C5850' }}>
          Producer sign-up is not configured yet. Set <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and{' '}
          <code>CLERK_SECRET_KEY</code> to enable this page.
        </p>
      </div>
    );
  }
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#DEDCD7', gap: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, letterSpacing: '.09em', textTransform: 'uppercase', color: '#1D1D1D', fontWeight: 600 }}>
        <BrandMark size={26} />
        TFA Studio
      </div>
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" fallbackRedirectUrl="/dashboard" />
    </div>
  );
}
