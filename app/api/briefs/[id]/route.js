import { NextResponse } from 'next/server';
import { getBrief, updateBrief } from '../../../../lib/db';
import { sendConfirmationEmail } from '../../../../lib/email';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const brief = await getBrief(params.id);
  if (!brief) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(brief);
}

export async function PATCH(request, { params }) {
  const body = await request.json().catch(() => ({}));

  const before = await getBrief(params.id);
  const wasSubmitted = !!(before && before.submittedAt);

  const brief = await updateBrief(params.id, body || {});
  if (!brief) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Unlike the original Express app (which fired this fire-and-forget after
  // responding), a Vercel serverless function can be frozen/terminated the
  // instant the response is sent — so we await it here, wrapped so a
  // failure never turns a successful submission into a 500.
  if (body && body.submitted && !wasSubmitted && brief.submittedAt) {
    try {
      await sendConfirmationEmail(brief);
    } catch (err) {
      console.error('[api/briefs/:id] sendConfirmationEmail failed:', err && err.message);
    }
  }

  return NextResponse.json(brief);
}
