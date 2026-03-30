import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface ParsedEvent {
  title: string;
  url: string;
  date: string;
  time: string;
  price: string;
  venueName: string;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const results = await Promise.allSettled([
      scrapeOldRockHouse(),
      scrapeOffBroadway(),
      scrapeBlueStrawberry(),
      scrapeAtomicByJamo(),
      scrapeMississippiUnderground(),
    ]);

    const events: ParsedEvent[] = results
      .filter((r): r is PromiseFulfilledResult<ParsedEvent[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json({ events });
  } catch {
    res.status(500).json({ error: 'Failed to fetch STL venue events' });
  }
}

// ── Helpers ──

const MONTHS: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
};

function parseMonthDayYear(str: string): string | null {
  // "March 31, 2026" or "March 31 2026"
  const m = str.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})/i);
  if (m) {
    const mo = MONTHS[m[1].toLowerCase()];
    if (mo) return `${m[3]}-${mo}-${m[2].padStart(2, '0')}`;
  }
  // "31 March 2026"
  const m2 = str.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
  if (m2) {
    const mo = MONTHS[m2[2].toLowerCase()];
    if (mo) return `${m2[3]}-${mo}-${m2[1].padStart(2, '0')}`;
  }
  return null;
}

function parseTime(context: string): string {
  const m = context.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
  if (!m) return '20:00';
  let h = parseInt(m[1]);
  const ampm = m[3].toUpperCase();
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m[2] ?? '00'}`;
}

function parsePrice(context: string): string {
  const m = context.match(/\$(\d+(?:\.\d{2})?)/);
  return m ? `$${m[1]}` : '';
}

// Try WordPress Tribe Events Calendar REST API
async function tryTribeAPI(baseUrl: string, venueName: string): Promise<ParsedEvent[] | null> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const url = `${baseUrl}/wp-json/tribe/events/v1/events?per_page=50&start_date=${today}&status=publish`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)', Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    const ct = resp.headers.get('content-type') ?? '';
    if (!ct.includes('json')) return null;
    const data = await resp.json();
    if (!Array.isArray(data?.events) || data.events.length === 0) return null;

    return data.events.map((e: { title: { rendered: string }; url: string; start_date_details: { year: string; month: string; day: string; hour: string; minutes: string }; cost?: string }) => {
      const d = e.start_date_details;
      const date = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
      const time = `${String(d.hour).padStart(2, '0')}:${String(d.minutes).padStart(2, '0')}`;
      const title = e.title.rendered.replace(/<[^>]+>/g, '').trim();
      return { title, url: e.url, date, time, price: e.cost ?? '', venueName };
    });
  } catch { return null; }
}

// Generic HTML scraper — looks for event links matching a path pattern
function scrapeEventsFromHTML(
  html: string,
  linkPattern: RegExp,
  venueName: string,
): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const seen = new Set<string>();
  const today = new Date().toISOString().slice(0, 10);

  let match;
  while ((match = linkPattern.exec(html)) !== null) {
    const url = match[1];
    const rawTitle = (match[2] ?? '').trim().replace(/\s+/g, ' ');
    if (!rawTitle || rawTitle.length < 3) continue;
    if (seen.has(rawTitle.toLowerCase())) continue;
    seen.add(rawTitle.toLowerCase());

    const cStart = Math.max(0, match.index - 300);
    const cEnd = Math.min(html.length, match.index + match[0].length + 800);
    const ctx = html.slice(cStart, cEnd);

    const date = parseMonthDayYear(ctx);
    if (!date || date < today) continue;

    events.push({ title: rawTitle, url, date, time: parseTime(ctx), price: parsePrice(ctx), venueName });
  }
  return events;
}

// ── Old Rock House ──
// 1200 S 7th St, St. Louis, MO 63104

async function scrapeOldRockHouse(): Promise<ParsedEvent[]> {
  const base = 'https://www.oldrockhouse.com';
  const tribe = await tryTribeAPI(base, 'Old Rock House');
  if (tribe) return tribe;

  try {
    const resp = await fetch(`${base}/events/`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const pattern = /<a[^>]+href="(https?:\/\/(?:www\.)?oldrockhouse\.com\/event\/[^"]+)"[^>]*>([^<]{3,100})<\/a>/gi;
    return scrapeEventsFromHTML(html, pattern, 'Old Rock House');
  } catch { return []; }
}

// ── Off Broadway ──
// 3509 Lemp Ave, St. Louis, MO 63118

async function scrapeOffBroadway(): Promise<ParsedEvent[]> {
  const base = 'https://www.offbroadwaystl.com';
  const tribe = await tryTribeAPI(base, 'Off Broadway');
  if (tribe) return tribe;

  try {
    const resp = await fetch(`${base}/events/`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const pattern = /<a[^>]+href="(https?:\/\/(?:www\.)?offbroadwaystl\.com\/(?:event|show|events?)\/[^"]+)"[^>]*>([^<]{3,100})<\/a>/gi;
    return scrapeEventsFromHTML(html, pattern, 'Off Broadway');
  } catch { return []; }
}

// ── Blue Strawberry ──
// 364 N Boyle Ave, St. Louis, MO 63108

async function scrapeBlueStrawberry(): Promise<ParsedEvent[]> {
  const base = 'https://www.bluestrawberrystl.com';
  const tribe = await tryTribeAPI(base, 'Blue Strawberry');
  if (tribe) return tribe;

  try {
    // Blue Strawberry may use Eventbrite or a simple calendar
    const resp = await fetch(`${base}/events`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const pattern = /<a[^>]+href="(https?:\/\/(?:www\.)?bluestrawberrystl\.com\/(?:event|show|events?)\/[^"]+)"[^>]*>([^<]{3,100})<\/a>/gi;
    return scrapeEventsFromHTML(html, pattern, 'Blue Strawberry');
  } catch { return []; }
}

// ── Atomic by Jamo ──
// 4140 Manchester Ave, St. Louis, MO 63110  (formerly Atomic Cowboy)

async function scrapeAtomicByJamo(): Promise<ParsedEvent[]> {
  // Try atomiccowboy.com and atomicbyjamo.com
  for (const base of ['https://www.atomiccowboy.com', 'https://www.atomicbyjamo.com']) {
    const tribe = await tryTribeAPI(base, 'Atomic by Jamo');
    if (tribe?.length) return tribe;

    try {
      const resp = await fetch(`${base}/events`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
        signal: AbortSignal.timeout(6000),
      });
      if (!resp.ok) continue;
      const html = await resp.text();
      const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(
        `<a[^>]+href="(${escaped}\\/(?:event|show|events?)\\/[^"]+)"[^>]*>([^<]{3,100})<\\/a>`,
        'gi'
      );
      const results = scrapeEventsFromHTML(html, pattern, 'Atomic by Jamo');
      if (results.length) return results;
    } catch { continue; }
  }
  return [];
}

// ── Mississippi Underground Hall ──
// Riverfront area, St. Louis

async function scrapeMississippiUnderground(): Promise<ParsedEvent[]> {
  // Try a few possible URLs for this venue
  for (const url of [
    'https://www.mississippiunderground.com/events',
    'https://mississippiunderground.com/events',
  ]) {
    try {
      const tribe = await tryTribeAPI(url.replace(/\/events$/, ''), 'Mississippi Underground Hall');
      if (tribe?.length) return tribe;

      const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
        signal: AbortSignal.timeout(6000),
      });
      if (!resp.ok) continue;
      const html = await resp.text();
      const pattern = /<a[^>]+href="(https?:\/\/(?:www\.)?mississippiunderground\.com\/(?:event|show|events?)\/[^"]+)"[^>]*>([^<]{3,100})<\/a>/gi;
      const results = scrapeEventsFromHTML(html, pattern, 'Mississippi Underground Hall');
      if (results.length) return results;
    } catch { continue; }
  }
  return [];
}
