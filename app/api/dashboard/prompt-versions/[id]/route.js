import { NextResponse } from 'next/server';
import { activatePromptVersion, deactivatePromptVersion } from '../../../../../lib/promptVersions';

export const dynamic = 'force-dynamic';

// { action: 'activate' } makes this version the live one (and every other
// version inactive); { action: 'deactivate' } turns the live version off
// (script generation then falls back to the built-in default prompt until
// another version is made live).
export async function PATCH(request, { params }) {
  const body = await request.json().catch(() => ({}));
  const action = body && body.action;
  if (action !== 'activate' && action !== 'deactivate') {
    return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
  }
  const updated = action === 'activate'
    ? await activatePromptVersion(params.id)
    : await deactivatePromptVersion(params.id);
  if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(updated);
}
