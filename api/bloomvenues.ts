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
      scrapeConnieLinkAmphitheatre(),
      scrapeSixStrings(),
      scrapeDevonLakeshore(),
    ]);

    const events: ParsedEvent[] = results
      .filter((r): r is PromiseFulfilledResult<ParsedEvent[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json({ events });
  } catch {
    res.status(500).json({ error: 'Failed to fetch Bloomington area venue events' });
  }
}

// ── Helpers ──

const MONTHS: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
};

function parseDateFromContext(ctx: string): string | null {
  const today = new Date().toISOString().slice(0, 10);

  // "March 31, 2026" / "March 31 2026"
  const m1 = ctx.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})/i);
  if (m1) {
    const mo = MONTHS[m1[1].toLowerCase()];
    if (mo) { const d = `${m1[3]}-${mo}-${m1[2].padStart(2, '0')}`; return d >= today ? d : null; }
  }
  // "31 March 2026"
  const m2 = ctx.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
  if (m2) {
    const mo = MONTHS[m2[2].toLowerCase()];
    if (mo) { const d = `${m2[3]}-${mo}-${m2[1].padStart(2, '0')}`; return d >= today ? d : null; }
  }
  // MM/DD/YYYY
  const m3 = ctx.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (m3) {
    const year = m3[3].length === 2 ? `20${m3[3]}` : m3[3];
    const d = `${year}-${m3[1].padStart(2, '0')}-${m3[2].padStart(2, '0')}`;
    return d >= today ? d : null;
  }
  return null;
}

function parseTime(ctx: string): string {
  const m = ctx.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
  if (!m) return '20:00';
  let h = parseInt(m[1]);
  const ampm = m[3].toUpperCase();
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m[2] ?? '00'}`;
}

function parsePrice(ctx: string): string {
  const m = ctx.match(/\$(\d+(?:\.\d{2})?)/);
  return m ? `$${m[1]}` : '';
}

async function tryTribeAPI(baseUrl: string, venueName: string): Promise<ParsedEvent[] | null> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const url = `${baseUrl}/wp-json/tribe/events/v1/events?per_page=50&start_date=${today}&status=publish`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)', Accept: 'application/json' },
      signal: AbortSignal.timeout(7000),
    });
    if (!resp.ok) return null;
    if (!(resp.headers.get('content-type') ?? '').includes('json')) return null;
    const data = await resp.json();
    if (!Array.isArray(data?.events) || data.events.length === 0) return null;
    return data.events.map((e: { title: { rendered: string }; url: string; start_date_details: { year: string; month: string; day: string; hour: string; minutes: string }; cost?: string }) => {
      const d = e.start_date_details;
      const date = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
      const time = `${String(d.hour).padStart(2, '0')}:${String(d.minutes).padStart(2, '0')}`;
      return { title: e.title.rendered.replace(/<[^>]+>/g, '').trim(), url: e.url, date, time, price: e.cost ?? '', venueName };
    });
  } catch { return null; }
}

// ── Connie Link Amphitheatre ──
// 621 S Linden St, Normal, IL 61761
// Municipal calendar: normalil.gov/calendar.aspx?CID=38
// Free events, no ticketing platform

async function scrapeConnieLinkAmphitheatre(): Promise<ParsedEvent[]> {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const events: ParsedEvent[] = [];
    const seen = new Set<string>();

    // Fetch current month and next two months
    for (let i = 0; i < 3; i++) {
      const m = ((month - 1 + i) % 12) + 1;
      const y = year + Math.floor((month - 1 + i) / 12);
      const url = `https://www.normalil.gov/calendar.aspx?CID=38&month=${m}&year=${y}`;

      const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
        signal: AbortSignal.timeout(8000),
      });
      if (!resp.ok) continue;
      const html = await resp.text();

      // Municipality calendar: look for event links with title + date context
      const linkPattern = /<a[^>]+href="([^"]*calendar[^"]*(?:eid|EventID)=[^"]+)"[^>]*>([^<]{3,120})<\/a>/gi;
      let match;
      while ((match = linkPattern.exec(html)) !== null) {
        const rawTitle = match[2].trim().replace(/\s+/g, ' ');
        if (!rawTitle || rawTitle.length < 3) continue;
        if (seen.has(rawTitle.toLowerCase())) continue;

        const ctx = html.slice(Math.max(0, match.index - 200), match.index + match[0].length + 600);
        const date = parseDateFromContext(ctx);
        if (!date) continue;
        seen.add(rawTitle.toLowerCase());

        const fullUrl = match[1].startsWith('http') ? match[1] : `https://www.normalil.gov${match[1]}`;
        events.push({ title: rawTitle, url: fullUrl, date, time: parseTime(ctx), price: 'Free', venueName: 'Connie Link Amphitheatre' });
      }
    }
    return events;
  } catch { return []; }
}

// ── Six Strings Club ──
// 525 N Center St, Bloomington, IL 61701
// WordPress site — try Tribe API then event listing HTML

async function scrapeSixStrings(): Promise<ParsedEvent[]> {
  const tribe = await tryTribeAPI('https://www.sixstringsblono.com', 'Six Strings Club');
  if (tribe?.length) return tribe;

  try {
    for (const path of ['/events/', '/events/tags/show/', '/shows/']) {
      const resp = await fetch(`https://www.sixstringsblono.com${path}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
        signal: AbortSignal.timeout(8000),
      });
      if (!resp.ok) continue;
      const html = await resp.text();

      // WordPress event links
      const pattern = /<a[^>]+href="(https?:\/\/(?:www\.)?sixstringsblono\.com\/(?:event|show|events?)[^"]+)"[^>]*>([^<]{3,100})<\/a>/gi;
      const events: ParsedEvent[] = [];
      const seen = new Set<string>();
      let match;

      while ((match = pattern.exec(html)) !== null) {
        const url = match[1];
        const rawTitle = match[2].trim().replace(/\s+/g, ' ');
        if (!rawTitle || rawTitle.length < 3) continue;
        if (seen.has(rawTitle.toLowerCase())) continue;
        seen.add(rawTitle.toLowerCase());

        const ctx = html.slice(Math.max(0, match.index - 300), match.index + match[0].length + 800);
        const date = parseDateFromContext(ctx);
        if (!date) continue;

        events.push({ title: rawTitle, url, date, time: parseTime(ctx), price: parsePrice(ctx), venueName: 'Six Strings Club' });
      }
      if (events.length) return events;

      // Fallback: scrape heading-style event titles with nearby dates
      const headingPattern = /<(?:h[1-4]|strong)[^>]*class="[^"]*(?:event|title|entry)[^"]*"[^>]*>([^<]{3,100})<\/(?:h[1-4]|strong)>/gi;
      const fallback: ParsedEvent[] = [];
      const seenFallback = new Set<string>();
      let hm;
      while ((hm = headingPattern.exec(html)) !== null) {
        const title = hm[1].trim();
        if (!title || seenFallback.has(title.toLowerCase())) continue;
        const ctx = html.slice(hm.index, hm.index + 600);
        const date = parseDateFromContext(ctx);
        if (!date) continue;
        seenFallback.add(title.toLowerCase());
        fallback.push({ title, url: `https://www.sixstringsblono.com${path}`, date, time: parseTime(ctx), price: parsePrice(ctx), venueName: 'Six Strings Club' });
      }
      if (fallback.length) return fallback;
    }
    return [];
  } catch { return []; }
}

// ── Devon Lakeshore Amphitheater ──
// 2686 E Cantrell St, Decatur, IL 62521
// WordPress + My Calendar plugin + eTix ticketing

async function scrapeDevonLakeshore(): Promise<ParsedEvent[]> {
  // Try Tribe Events Calendar REST API first
  const tribe = await tryTribeAPI('https://devonamphitheater.com', 'Devon Lakeshore Amphitheater');
  if (tribe?.length) return tribe;

  // Try WordPress REST API for posts/events (My Calendar plugin uses different endpoints)
  try {
    const today = new Date().toISOString().slice(0, 10);
    const wpResp = await fetch(
      `https://devonamphitheater.com/wp-json/wp/v2/mec-events?per_page=50&after=${today}T00:00:00`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)', Accept: 'application/json' },
        signal: AbortSignal.timeout(7000),
      }
    );
    if (wpResp.ok && (wpResp.headers.get('content-type') ?? '').includes('json')) {
      const items = await wpResp.json();
      if (Array.isArray(items) && items.length > 0) {
        return items.map((e: { title: { rendered: string }; link: string; meta?: Record<string, string> }) => ({
          title: e.title.rendered.replace(/<[^>]+>/g, '').trim(),
          url: e.link,
          date: (e.meta?.['mec_start_date'] ?? today),
          time: e.meta?.['mec_start_time'] ?? '19:00',
          price: e.meta?.['mec_cost'] ?? '',
          venueName: 'Devon Lakeshore Amphitheater',
        }));
      }
    }
  } catch { /* fall through */ }

  // Fallback: HTML scrape their events page
  try {
    const resp = await fetch('https://devonamphitheater.com/events-tickets/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const events: ParsedEvent[] = [];
    const seen = new Set<string>();

    // Devon uses eTix: look for etix.com links with surrounding event context
    const etixPattern = /<a[^>]+href="(https?:\/\/(?:www\.)?etix\.com\/ticket\/[^"]+)"[^>]*>([^<]{3,100})<\/a>/gi;
    let match;
    while ((match = etixPattern.exec(html)) !== null) {
      const url = match[1];
      const rawTitle = match[2].trim().replace(/\s+/g, ' ');
      if (!rawTitle || rawTitle.length < 3 || rawTitle.toLowerCase().includes('buy ticket') || rawTitle.toLowerCase().includes('more info')) continue;
      if (seen.has(rawTitle.toLowerCase())) continue;
      seen.add(rawTitle.toLowerCase());

      const ctx = html.slice(Math.max(0, match.index - 500), match.index + match[0].length + 400);
      const date = parseDateFromContext(ctx);
      if (!date) continue;

      events.push({ title: rawTitle, url, date, time: parseTime(ctx), price: parsePrice(ctx), venueName: 'Devon Lakeshore Amphitheater' });
    }
    if (events.length) return events;

    // Look for internal Devon event links
    const internalPattern = /<a[^>]+href="(https?:\/\/devonamphitheater\.com\/(?:event|show|events?)[^"]+)"[^>]*>([^<]{3,100})<\/a>/gi;
    while ((match = internalPattern.exec(html)) !== null) {
      const url = match[1];
      const rawTitle = match[2].trim().replace(/\s+/g, ' ');
      if (!rawTitle || rawTitle.length < 3) continue;
      if (seen.has(rawTitle.toLowerCase())) continue;
      seen.add(rawTitle.toLowerCase());

      const ctx = html.slice(Math.max(0, match.index - 300), match.index + match[0].length + 800);
      const date = parseDateFromContext(ctx);
      if (!date) continue;

      events.push({ title: rawTitle, url, date, time: parseTime(ctx), price: parsePrice(ctx), venueName: 'Devon Lakeshore Amphitheater' });
    }
    return events;
  } catch { return []; }
}
