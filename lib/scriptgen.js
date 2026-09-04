// Turns a brief into a radio script. Three ways it can happen, tried in
// this order:
//
//  1. Claude (paid API): sends the structured brief to Claude and asks for
//     a natural, well-paced Dutch radio script. Runs when ANTHROPIC_API_KEY
//     is set.
//  2. Ollama (free, local): sends the same brief to a locally-running open
//     model via Ollama (https://ollama.com) — no API key, no per-call cost,
//     nothing leaves the host machine. Runs when ANTHROPIC_API_KEY is NOT
//     set but OLLAMA_MODEL is. Quality is lower than Claude and it needs
//     the host machine to have Ollama installed with that model pulled.
//  3. Template fallback: deterministic sentence composition from the brief
//     fields, no network call and nothing to install. Runs when neither of
//     the above is configured, or if the chosen AI call fails for any
//     reason (so a flaky model server or a bad key never blocks a client
//     from getting a script).
//
// Whichever path runs, the result is the same shape: { main, variation, source }.
// Ported near-verbatim from the original Express app's scriptgen.js — only
// require/module.exports were switched to ESM import/export.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || '';

// --- timing model -----------------------------------------------------
//
// Shared by the generator (to size a script to its target length) and every
// page that shows a live "estimated seconds" bar (the script step here, and
// Main.dc.html in the design canvas — keep all three in sync). Calibrated
// against an actual read-aloud timing test: the old formula (words + a
// flat 10-word "pause" pad, all over 2.7 wds/sec) was overestimating a
// ~16s real read as 18-19s. A flat word-pad skews short scripts far more
// than long ones, so it's replaced with a proportional pause allowance.
const WORDS_PER_SECOND = 2.7;
const PAUSE_FACTOR = 1.05; // ~5% for natural breath/comma pauses, proportional to length
export function estimateSeconds(words) {
  return (words / WORDS_PER_SECOND) * PAUSE_FACTOR;
}
export function targetWordCount(targetSeconds) {
  return Math.round((targetSeconds * WORDS_PER_SECOND) / PAUSE_FACTOR);
}

// --- template fallback ----------------------------------------------------

function wordCount(s) {
  const t = (s || '').toString().trim();
  return t ? t.split(/\s+/).length : 0;
}
function clean(s) {
  return (s || '').toString().trim().replace(/[.!?]+$/, '');
}
function sentence(s) {
  const c = clean(s);
  if (!c) return '';
  return c.charAt(0).toUpperCase() + c.slice(1) + '.';
}
function lower1(s) {
  const c = clean(s);
  if (!c) return '';
  return c.charAt(0).toLowerCase() + c.slice(1);
}
function upper1(s) {
  const c = clean(s);
  if (!c) return '';
  return c.charAt(0).toUpperCase() + c.slice(1);
}
// Slogans are intentional brand copy (custom capitalization/punctuation) —
// this only trims and ensures a trailing full stop, it never re-cases them.
function sloganSentence(s) {
  const c = (s || '').toString().trim();
  if (!c) return '';
  return /[.!?]$/.test(c) ? c : c + '.';
}
function audiencePhrase(brief) {
  if (brief.audience === 'b2b' && brief.decisionMaker) return clean(brief.decisionMaker);
  if (brief.audience === 'b2c' && brief.audienceAgeInterests) return clean(brief.audienceAgeInterests);
  return '';
}

// --- tone of voice anchor -----------------------------------------------
//
// The client picks up to 2 tone words on the brief step (brief.toneOfVoice,
// stored as a JSON array of ids, same pattern as selectedTracks). It anchors
// BOTH generation paths:
//  - the AI prompt (buildPrompt below) gets an explicit "Toon" instruction
//    line built from the chosen labels, so Claude/Ollama's word choice and
//    register actually follow the pick;
//  - the template fallback (buildMainSentences) approximates the same
//    effect with punctuation and connector-word shifts, so a client never
//    sees an unstyled script just because no AI provider is configured.
export const TONE_LABELS = {
  energiek: 'Energiek', rustig: 'Rustig', warm: 'Warm', zakelijk: 'Zakelijk',
  urgent: 'Urgent', premium: 'Premium', speels: 'Speels', grappig: 'Grappig',
  betrouwbaar: 'Betrouwbaar', gedurfd: 'Gedurfd', inspirerend: 'Inspirerend',
  nostalgisch: 'Nostalgisch',
};
const EMPHATIC_TONES = ['energiek', 'urgent', 'speels', 'gedurfd'];
const RESTRAINED_TONES = ['rustig', 'zakelijk', 'premium', 'betrouwbaar'];
function parseTones(brief) {
  try {
    const parsed = brief.toneOfVoice ? JSON.parse(brief.toneOfVoice) : [];
    return Array.isArray(parsed) ? parsed.filter((t) => TONE_LABELS[t]) : [];
  } catch (e) {
    return [];
  }
}
function toneSentence(s, punct) {
  const c = clean(s);
  if (!c) return '';
  return c.charAt(0).toUpperCase() + c.slice(1) + (punct || '.');
}

// Weaves the brief's fields into a small number of flowing sentences —
// hook, reason to believe, offer, message, call to action, sign-off,
// mandatory disclaimer — instead of stapling one sentence onto the next per
// field. This is the same logic used by the design canvas's mockup
// template, kept in sync so a broken AI key or an offline Ollama server
// degrades to the same voice.
//
// Three things are treated as non-negotiable and are never trimmed for
// length, because the client asked for them by name: the call-to-action /
// website (if given), the slogan or at minimum the company name as a
// sign-off, and the mandatory disclaimer text — all three always land, in
// that order, at the very end of the script.
//
// Everything else (hook, USP, price, main message) is "body" content: it's
// built in priority order and then trimmed to fit the word budget implied
// by the chosen spot length (see targetWordCount above), so a 20-second
// spot doesn't run long and a 25-second spot doesn't run short.
function buildMainSentences(brief, targetWords) {
  const company = clean(brief.companyName);
  const product = clean(brief.product);
  const audience = audiencePhrase(brief);
  const usp = clean(brief.usp);
  const hasPrice = brief.price === true && !!clean(brief.priceDetail);
  const hasSlogan = !!(brief.slogan && brief.slogan.trim());
  const hasDisclaimer = !!(brief.disclaimerText && brief.disclaimerText.trim());

  const tones = parseTones(brief);
  const emphatic = tones.some((t) => EMPHATIC_TONES.includes(t));
  const punct = emphatic ? '!' : '.';
  const isPremium = tones.indexOf('premium') !== -1;
  const isGrounded = tones.indexOf('zakelijk') !== -1 || tones.indexOf('betrouwbaar') !== -1;

  // --- body: trimmable, priority order ---
  const body = [];

  let hook = '';
  if (product && company && audience) {
    hook = upper1(product) + ' bij ' + company + ', speciaal voor ' + lower1(audience) + punct;
  } else if (product && company) {
    hook = upper1(product) + ', bij ' + company + punct;
  } else if (product && audience) {
    hook = upper1(product) + ', speciaal voor ' + lower1(audience) + punct;
  } else if (product) {
    hook = toneSentence(product, punct);
  } else if (company && audience) {
    hook = company + ', speciaal voor ' + lower1(audience) + punct;
  } else if (company) {
    hook = toneSentence(company, punct);
  }
  if (hook) body.push(hook);

  if (usp) {
    let lead = body.length ? 'Want ' : '';
    let uspBody = body.length ? lower1(usp) : usp;
    if (body.length && isPremium) {
      lead = 'Ontdek waarom ';
    } else if (body.length && isGrounded) {
      lead = 'Reden: ';
      uspBody = upper1(usp);
    }
    body.push(toneSentence(lead + uspBody, isGrounded ? '.' : punct));
  }

  if (hasPrice) {
    body.push(toneSentence('Nu ' + lower1(brief.priceDetail), punct));
  }

  if (brief.mainMessage) {
    body.push(toneSentence(brief.mainMessage, punct));
  }

  // --- tail: fixed, never trimmed, always in this order ---
  const tail = [];
  if (brief.cta) tail.push(toneSentence(brief.cta, punct));
  if (hasSlogan) {
    const sloganMentionsCompany = company && clean(brief.slogan).toLowerCase().indexOf(company.toLowerCase()) !== -1;
    if (company && !sloganMentionsCompany) tail.push(sentence(company));
    tail.push(sloganSentence(brief.slogan));
  } else if (company && !hook) {
    tail.push(sentence(company));
  }
  if (hasDisclaimer) tail.push(sloganSentence(brief.disclaimerText));

  // --- fit the body to whatever's left of the word budget after the tail ---
  const tailWords = tail.reduce((n, s) => n + wordCount(s), 0);
  const budget = typeof targetWords === 'number' ? Math.max(targetWords - tailWords, 0) : Infinity;
  const chosen = [];
  let used = 0;
  body.forEach((s, i) => {
    const w = wordCount(s);
    if (i === 0 || used + w <= budget * 1.15) {
      chosen.push(s);
      used += w;
    }
  });

  return chosen.concat(tail);
}

function buildVarSentences(brief, mainSentences) {
  if (!brief.variationDetail) return mainSentences;
  const hook = sentence(brief.variationDetail);
  if (!hook) return mainSentences;
  return [hook].concat(mainSentences.slice(1));
}

function templateGenerate(brief) {
  const target = parseInt(brief.hoofdspotLength, 10) || 20;
  const targetWords = targetWordCount(target);
  const mainSentences = buildMainSentences(brief, targetWords);
  const main = mainSentences.join(' ');
  const varSentences = buildVarSentences(brief, mainSentences);
  const variation = varSentences.join(' ');
  return { main, variation, source: 'template' };
}

// --- AI generation ----------------------------------------------------

function briefHasEnoughContent(brief) {
  return !!(brief.product || brief.usp || brief.mainMessage);
}

function buildPrompt(brief) {
  const target = parseInt(brief.hoofdspotLength, 10) || 20;
  const targetWords = targetWordCount(target);
  const hasDisclaimer = !!(brief.disclaimerText && brief.disclaimerText.trim());
  const lines = [];
  lines.push('Je bent een ervaren, gelauwerde radiocopywriter bij TFA. Je schrijft al jaren commercials die op de radio ECHT opvallen — niet omdat ze schreeuwen, maar omdat ze goed geschreven zijn: een scherpe invalshoek, natuurlijk ritme, en zinnen die prettig hardop lezen in plaats van zinnen die eruitzien als een opsomming van een briefingformulier.');
  lines.push('Schrijf een radiocommercial-script in het Nederlands, gebaseerd op de klantbrief hieronder. Lees de hele brief eerst als geheel — waar wil dit merk mee scoren, wat is de emotie of het gemak dat ze verkopen — en schrijf dan pas. Het resultaat moet klinken als één samenhangend verhaal van een copywriter, met een duidelijke opening, opbouw en afsluiting — nooit als losse feitjes uit de brief die na elkaar zijn geplakt.');
  lines.push('');
  lines.push('KLANTBRIEF:');
  if (brief.companyName) lines.push('- Bedrijfsnaam: ' + brief.companyName);
  if (brief.product) lines.push('- Product/dienst: ' + brief.product);
  if (brief.audience === 'b2b') lines.push('- Doelgroep: bedrijven (B2B)' + (brief.decisionMaker ? ', beslisser: ' + brief.decisionMaker : ''));
  if (brief.audience === 'b2c') lines.push('- Doelgroep: consumenten (B2C)' + (brief.audienceAgeInterests ? ', profiel: ' + brief.audienceAgeInterests : ''));
  if (brief.usp) lines.push('- Belangrijkste voordeel (USP): ' + brief.usp);
  if (brief.price && brief.priceDetail) lines.push('- Prijs/aanbieding: ' + brief.priceDetail);
  if (brief.mainMessage) lines.push('- Kernboodschap: ' + brief.mainMessage);
  if (brief.cta) lines.push('- Call-to-action / website: ' + brief.cta);
  if (brief.slogan) lines.push('- Slogan van het bedrijf: "' + brief.slogan + '"');
  if (hasDisclaimer) lines.push('- Verplichte tekst/disclaimer (wettelijk, woordelijk over te nemen): "' + brief.disclaimerText + '"');
  if (brief.extraNote) lines.push('- Productie-opmerking van de klant (dit is instructie voor TFA, GEEN gesproken tekst — bijv. "geen kinderstem"): ' + brief.extraNote);
  const tones = parseTones(brief);
  if (tones.length) {
    lines.push('- Gewenste toon (door de klant zelf gekozen, max. 2): ' + tones.map((t) => TONE_LABELS[t]).join(' & '));
  }
  lines.push('');
  lines.push('OPBOUW (in deze volgorde, vloeiend aan elkaar geschreven — geen losse, korte zinnetjes per punt, geen kopjes):');
  lines.push('1. Pakkende opening: wat het is en voor wie, met de bedrijfsnaam erin verweven. Dit is de zin die de aandacht moet grijpen — geen generieke intro.');
  lines.push('2. De reden om te geloven: het belangrijkste voordeel (USP), als argument — niet als los feitje.');
  lines.push('3. Het aanbod, als dat er is: prijs of actie, natuurlijk ingeleid (bijv. "nu...").');
  lines.push('4. De kernboodschap van de klant.');
  lines.push('5. De call-to-action of website. Dit is VERPLICHT als de brief hem geeft — laat hem nooit weg en zet hem dicht bij het einde.');
  lines.push('6. Afsluiting: de bedrijfsnaam, gevolgd door de slogan exact zoals aangeleverd — als de slogan de bedrijfsnaam al bevat, herhaal die naam er niet nog eens vlak voor. Dit is VERPLICHT als er een slogan is.');
  if (hasDisclaimer) {
    lines.push('7. Helemaal aan het eind, als allerlaatste zin(nen): de verplichte tekst/disclaimer, WOORDELIJK en ONGEWIJZIGD overgenomen uit de brief — dit is wettelijk verplichte tekst, herschrijf, parafraseer of verkort hem nooit.');
  }
  lines.push('Laat een stap uit de opbouw alleen weg als de bijbehorende informatie niet in de brief staat — verzin niets. Stappen 5, 6 en 7 zijn de uitzondering: die laat je NOOIT weg zolang de brief de informatie geeft, ook niet om binnen de doellengte te blijven — kort in dat geval liever de opening of de kernboodschap in (stap 1-4).');
  lines.push('');
  lines.push('EISEN:');
  lines.push('- Doellengte: ' + target + ' seconden. Bij een natuurlijk voorleestempo is dat ongeveer ' + targetWords + ' woorden — dit is een harde eis, geen richtlijn. Kom je boven de ' + Math.round(targetWords * 1.1) + ' woorden uit, kort dan in (nooit door de call-to-action, slogan of disclaimer te schrappen — alleen door de opening, USP of kernboodschap compacter te maken). Kom je onder de ' + Math.round(targetWords * 0.8) + ' woorden, verzin dan geen extra inhoud — een korter script dat klopt is beter dan opvulzinnen.');
  lines.push('- Natuurlijke, gesproken spreektaal — variatie in zinslengte en -opbouw, geen opsomming, geen bullet points, geen kopjes.');
  lines.push('- Vermijd clichés en stockzinnen ("ontdek de wereld van...", "hét adres voor...", "kom snel langs").');
  if (tones.length) {
    lines.push('- Laat de gekozen toon (' + tones.map((t) => TONE_LABELS[t]).join(' & ') + ') duidelijk doorklinken in woordkeuze, ritme en zinsbouw — niet alleen in de opening, maar door het hele script.');
  }
  lines.push('- Verzin geen feiten, cijfers of claims die niet in de brief staan.');
  if (!hasDisclaimer) {
    lines.push('- Er is geen verplichte tekst/disclaimer in deze brief opgegeven — verzin er zelf geen.');
  }
  lines.push('- Neem de productie-opmerking (indien aanwezig) NIET op als gesproken tekst — die is alleen voor TFA, niet voor de luisteraar.');

  if (brief.needsVariations && brief.variationDetail) {
    lines.push('');
    lines.push('Schrijf ook een VARIATIE: exact hetzelfde script, met alleen de openingszin aangepast aan dit verschil: "' + brief.variationDetail + '". De rest van de tekst — inclusief de call-to-action, slogan en verplichte tekst aan het eind — blijft identiek aan het hoofdscript.');
  }

  lines.push('');
  lines.push('Antwoord ALLEEN met geldige JSON, in dit formaat, zonder markdown-codeblok eromheen:');
  lines.push(brief.needsVariations && brief.variationDetail
    ? '{"main": "...", "variation": "..."}'
    : '{"main": "..."}');

  return lines.join('\n');
}

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('no JSON object found in AI response');
  return JSON.parse(candidate.slice(start, end + 1));
}

async function aiGenerate(brief) {
  const prompt = buildPrompt(brief);
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error('Anthropic API error ' + res.status + ': ' + body.slice(0, 300));
  }

  const data = await res.json();
  const text = (data.content || []).map((b) => b.text || '').join('');
  const parsed = extractJson(text);
  if (!parsed.main || typeof parsed.main !== 'string') {
    throw new Error('AI response missing "main" script text');
  }
  return {
    main: parsed.main.trim(),
    variation: typeof parsed.variation === 'string' ? parsed.variation.trim() : '',
    source: 'ai',
  };
}

// --- free, local AI generation via Ollama -------------------------------

async function ollamaGenerate(brief) {
  const prompt = buildPrompt(brief);
  const res = await fetch(OLLAMA_HOST + '/api/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      format: 'json',
      options: { temperature: 0.7 },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error('Ollama error ' + res.status + ': ' + body.slice(0, 300));
  }

  const data = await res.json();
  const text = data.response || '';
  const parsed = extractJson(text);
  if (!parsed.main || typeof parsed.main !== 'string') {
    throw new Error('Ollama response missing "main" script text');
  }
  return {
    main: parsed.main.trim(),
    variation: typeof parsed.variation === 'string' ? parsed.variation.trim() : '',
    source: 'ai',
  };
}

// --- public entry point ----------------------------------------------------

// Always resolves — never throws. Falls back to the template on any
// failure so a broken key, a missing local model, or a network hiccup
// never blocks a client from getting a script.
export async function generateScript(brief) {
  if (!briefHasEnoughContent(brief)) {
    return { main: '', variation: '', source: 'none' };
  }
  if (ANTHROPIC_API_KEY) {
    try {
      return await aiGenerate(brief);
    } catch (err) {
      console.error('[scriptgen] Claude generation failed, falling back to template:', err.message);
      return templateGenerate(brief);
    }
  }
  if (OLLAMA_MODEL) {
    try {
      return await ollamaGenerate(brief);
    } catch (err) {
      console.error('[scriptgen] Ollama generation failed, falling back to template:', err.message);
      return templateGenerate(brief);
    }
  }
  return templateGenerate(brief);
}

export const aiEnabled = !!ANTHROPIC_API_KEY || !!OLLAMA_MODEL;
export const aiProvider = ANTHROPIC_API_KEY ? 'claude' : (OLLAMA_MODEL ? 'ollama' : 'none');

export { templateGenerate };
