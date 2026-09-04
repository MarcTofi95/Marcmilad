import { NextResponse } from 'next/server';
import { getBrief, saveGeneratedScript } from '../../../../../lib/db';
import { generateScript } from '../../../../../lib/scriptgen';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const brief = await getBrief(params.id);
  if (!brief) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  try {
    const result = await generateScript(brief);
    const updated = await saveGeneratedScript(params.id, result);
    return NextResponse.json(updated);
  } catch (err) {
    console.error('[generate-script] unexpected failure:', err);
    return NextResponse.json({ error: 'generation_failed' }, { status: 500 });
  }
}
