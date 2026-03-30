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
      scrapeRevivalMusicHall(),
      scrapePeoriaCivicCenter(),
      scrapeCEFCUCenterStage(),
      scrapeVenueChisca(),
      scrapeNeonBison(),
      scrapeFivePointsWashington(),
      scrape808Room(),
      // Rage Club: Facebook-only, no scrapeable website — covered by PredictHQ if data exists
    ]);

    const events: ParsedEvent[] = results
      .filter((r): r is PromiseFulfilledResult<ParsedEvent[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json({ events });
  } catch {
    res.status(500).json({ error: 'Failed to fetch Peoria area venue events' });
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
  const m1 = ctx.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})/i);
  if (m1) {
    const mo = MONTHS[m1[1].toLowerCase()];
    if (mo) { const d = `${m1[3]}-${mo}-${m1[2].padStart(2, '0')}`; return d >= today ? d : null; }
  }
  const m2 = ctx.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
  if (m2) {
    const mo = MONTHS[m2[2].toLowerCase()];
    if (mo) { const d = `${m2[3]}-${mo}-${m2[1].padStart(2, '0')}`; return d >= today ? d : null; }
  }
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
    const resp = await fetch(`${baseUrl}/wp-json/tribe/events/v1/events?per_page=50&start_date=${today}&status=publish`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)', Accept: 'application/json' },
      signal: AbortSignal.timeout(7000),
    });
    if (!resp.ok || !(resp.headers.get('content-type') ?? '').includes('json')) return null;
    const data = await resp.json();
    if (!Array.isArray(data?.events) || data.events.length === 0) return null;
    return data.events.map((e: { title: { rendered: string }; url: string; start_date_details: { year: string; month: string; day: string; hour: string; minutes: string }; cost?: string }) => {
      const d = e.start_date_details;
      return {
        title: e.title.rendered.replace(/<[^>]+>/g, '').trim(),
        url: e.url,
        date: `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`,
        time: `${String(d.hour).padStart(2, '0')}:${String(d.minutes).padStart(2, '0')}`,
        price: e.cost ?? '',
        venueName,
      };
    });
  } catch { return null; }
}

function scrapeLinksFromHTML(html: string, linkRegex: RegExp, venueName: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const seen = new Set<string>();
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1];
    const rawTitle = (match[2] ?? '').trim().replace(/&amp;/g, '&').replace(/&#\d+;/g, '').replace(/\s+/g, ' ');
    if (!rawTitle || rawTitle.length < 3) continue;
    if (seen.has(rawTitle.toLowerCase())) continue;
    seen.add(rawTitle.toLowerCase());
    const ctx = html.slice(Math.max(0, match.index - 300), match.index + match[0].length + 800);
    const date = parseDateFromContext(ctx);
    if (!date) continue;
    events.push({ title: rawTitle, url, date, time: parseTime(ctx), price: parsePrice(ctx), venueName });
  }
  return events;
}

// ── Revival Music Hall ──
// 3300 W Willow Knolls Dr, Peoria, IL 61614

async function scrapeRevivalMusicHall(): Promise<ParsedEvent[]> {
  const tribe = await tryTribeAPI('https://www.revivalmusichallpeoria.com', 'Revival Music Hall');
  if (tribe?.length) return tribe;

  try {
    for (const path of ['/events', '/shows', '/calendar', '/']) {
      const resp = await fetch(`https://www.revivalmusichallpeoria.com${path}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
        signal: AbortSignal.timeout(8000),
      });
      if (!resp.ok) continue;
      const html = await resp.text();

      const pattern = /<a[^>]+href="(https?:\/\/(?:www\.)?revivalmusichallpeoria\.com\/(?:event|show|ticket)[^"]*)"[^>]*>([^<]{3,100})<\/a>/gi;
      const results = scrapeLinksFromHTML(html, pattern, 'Revival Music Hall');
      if (results.length) return results;

      // Also check for ETIX or Eventbrite links on the page
      const etixPattern = /<a[^>]+href="(https?:\/\/(?:www\.)?etix\.com\/ticket\/[^"]+)"[^>]*>([^<]{3,100})<\/a>/gi;
      const etix = scrapeLinksFromHTML(html, etixPattern, 'Revival Music Hall');
      if (etix.length) return etix;
    }
    return [];
  } catch { return []; }
}

// ── Peoria Civic Center ──
// 201 SW Jefferson Ave, Peoria, IL 61602
// Major events on Ticketmaster — supplement with their own events page

async function scrapePeoriaCivicCenter(): Promise<ParsedEvent[]> {
  const tribe = await tryTribeAPI('https://www.peoriaciviccenter.com', 'Peoria Civic Center');
  if (tribe?.length) return tribe;

  try {
    const resp = await fetch('https://www.peoriaciviccenter.com/events-tickets/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();

    // Their custom ASM platform may embed event data as JSON
    const jsonMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]{10,20000}?\});/);
    if (jsonMatch) {
      try {
        const state = JSON.parse(jsonMatch[1]);
        const today = new Date().toISOString().slice(0, 10);
        const eventsArr: unknown[] = state?.events?.items ?? state?.data?.events ?? [];
        if (Array.isArray(eventsArr) && eventsArr.length > 0) {
          return eventsArr
            .filter((e: unknown) => {
              const ev = e as Record<string, unknown>;
              return ((ev.startDate ?? ev.date ?? '') as string).slice(0, 10) >= today;
            })
            .map((e: unknown) => {
              const ev = e as Record<string, unknown>;
              return {
                title: String(ev.name ?? ev.title ?? '').replace(/<[^>]+>/g, '').trim(),
                url: String(ev.url ?? ev.link ?? 'https://www.peoriaciviccenter.com/events-tickets/'),
                date: String(ev.startDate ?? ev.date ?? '').slice(0, 10),
                time: String(ev.startDate ?? ev.date ?? '').slice(11, 16) || '19:00',
                price: String(ev.price ?? ev.cost ?? ''),
                venueName: 'Peoria Civic Center',
              };
            })
            .filter((e) => e.title && e.date);
        }
      } catch { /* fall through */ }
    }

    const pattern = /<a[^>]+href="(https?:\/\/(?:www\.)?peoriaciviccenter\.com\/(?:event|show|events?)[^"]*)"[^>]*>([^<]{3,100})<\/a>/gi;
    return scrapeLinksFromHTML(html, pattern, 'Peoria Civic Center');
  } catch { return []; }
}

// ── CEFCU Center Stage at the Landing (RiverFront) ──
// 200 NE Water St, Peoria, IL 61602
// Peoria Park District WordPress site

async function scrapeCEFCUCenterStage(): Promise<ParsedEvent[]> {
  const tribe = await tryTribeAPI('https://peoriaparks.org', 'CEFCU Center Stage at the Landing');
  if (tribe?.length) return tribe.filter((e) => /center.stage|landing|riverfront/i.test(e.url + e.title));

  try {
    const resp = await fetch('https://peoriaparks.org/venue/cefcu-center-stage-the-landing/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();

    const pattern = /<a[^>]+href="(https?:\/\/peoriaparks\.org\/event\/[^"]+)"[^>]*>([^<]{3,100})<\/a>/gi;
    return scrapeLinksFromHTML(html, pattern, 'CEFCU Center Stage at the Landing');
  } catch { return []; }
}

// ── Venue Chisca ──
// 1009 SW Washington St, Peoria, IL 61602

async function scrapeVenueChisca(): Promise<ParsedEvent[]> {
  const tribe = await tryTribeAPI('https://www.venuechisca.com', 'Venue Chisca');
  if (tribe?.length) return tribe;

  try {
    const resp = await fetch('https://www.venuechisca.com/events/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();

    const pattern = /<a[^>]+href="(https?:\/\/(?:www\.)?venuechisca\.com\/(?:event|show|events?)[^"]*)"[^>]*>([^<]{3,100})<\/a>/gi;
    return scrapeLinksFromHTML(html, pattern, 'Venue Chisca');
  } catch { return []; }
}

// ── The Neon Bison ──
// 617 Main St, Peoria, IL 61602
// Squarespace — use ?format=json on events collection (same trick as Faces Brewing)

interface SquarespaceItem {
  id: string;
  title: string;
  fullUrl: string;
  startDate?: number; // Unix ms
  endDate?: number;
  location?: string;
  excerpt?: string;
  assetUrl?: string;
}

async function scrapeNeonBison(): Promise<ParsedEvent[]> {
  try {
    const resp = await fetch('https://www.theneonbison.com/events?format=json', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)', Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const data: { items?: SquarespaceItem[] } = await resp.json();
    const items = data.items ?? [];
    const today = new Date().toISOString().slice(0, 10);

    return items
      .map((item): ParsedEvent | null => {
        const title = item.title?.trim();
        if (!title) return null;

        let date = '';
        let time = '21:00';
        if (item.startDate) {
          const d = new Date(item.startDate);
          date = d.toISOString().slice(0, 10);
          time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        } else if (item.excerpt) {
          const parsed = parseDateFromContext(item.excerpt);
          if (parsed) { date = parsed; time = parseTime(item.excerpt); }
        }

        if (!date || date < today) return null;

        return {
          title,
          url: `https://www.theneonbison.com${item.fullUrl}`,
          date,
          time,
          price: parsePrice(item.excerpt ?? ''),
          venueName: 'The Neon Bison',
        };
      })
      .filter((e): e is ParsedEvent => e !== null);
  } catch { return []; }
}

// ── Five Points Washington ──
// 360 N Wilmor Rd, Washington, IL 61571
// WordPress + Beaver Builder — try Tribe API then HTML

async function scrapeFivePointsWashington(): Promise<ParsedEvent[]> {
  const tribe = await tryTribeAPI('https://fivepointswashington.org', 'Five Points Washington');
  if (tribe?.length) return tribe;

  try {
    for (const path of ['/events', '/calendar', '/performing-arts', '/shows']) {
      const resp = await fetch(`https://fivepointswashington.org${path}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
        signal: AbortSignal.timeout(8000),
      });
      if (!resp.ok) continue;
      const html = await resp.text();

      const pattern = /<a[^>]+href="(https?:\/\/(?:www\.)?fivepointswashington\.org\/(?:event|show|events?|perform)[^"]*)"[^>]*>([^<]{3,100})<\/a>/gi;
      const results = scrapeLinksFromHTML(html, pattern, 'Five Points Washington');
      if (results.length) return results;
    }
    return [];
  } catch { return []; }
}

// ── The 808 Room ──
// 808 Meadow Ave, East Peoria, IL 61611
// Webflow site — try HTML scrape of live-music page

async function scrape808Room(): Promise<ParsedEvent[]> {
  try {
    for (const path of ['/live-music', '/events', '/shows', '/']) {
      const resp = await fetch(`https://808room.com${path}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
        signal: AbortSignal.timeout(8000),
      });
      if (!resp.ok) continue;
      const html = await resp.text();

      // Webflow often embeds collection data as JSON in script tags
      const jsonMatch = html.match(/<script[^>]*type="application\/json"[^>]*>([\s\S]{20,50000}?)<\/script>/gi);
      if (jsonMatch) {
        for (const scriptTag of jsonMatch) {
          try {
            const content = scriptTag.replace(/<\/?script[^>]*>/gi, '');
            const data = JSON.parse(content);
            const today = new Date().toISOString().slice(0, 10);
            const items: unknown[] = Array.isArray(data) ? data : (data?.items ?? data?.events ?? data?.data ?? []);
            if (Array.isArray(items) && items.length > 0) {
              const parsed = items
                .filter((e: unknown) => {
                  const ev = e as Record<string, unknown>;
                  const d = String(ev.date ?? ev.startDate ?? ev['start-date'] ?? '').slice(0, 10);
                  return d >= today;
                })
                .map((e: unknown): ParsedEvent => {
                  const ev = e as Record<string, unknown>;
                  const title = String(ev.name ?? ev.title ?? ev['event-name'] ?? '').trim();
                  const dateStr = String(ev.date ?? ev.startDate ?? ev['start-date'] ?? '').slice(0, 10);
                  const timeStr = String(ev.date ?? ev.startDate ?? '').slice(11, 16) || '21:00';
                  return { title, url: String(ev.url ?? ev.link ?? 'https://808room.com/live-music'), date: dateStr, time: timeStr, price: '', venueName: 'The 808 Room' };
                })
                .filter((e) => e.title && e.date);
              if (parsed.length) return parsed;
            }
          } catch { continue; }
        }
      }

      // Generic heading + date pattern fallback
      const headingPattern = /<(?:h[1-4]|[^>]+class="[^"]*(?:title|name|heading|event)[^"]*")[^>]*>([^<]{4,100})<\/[^>]+>/gi;
      const fallback: ParsedEvent[] = [];
      const seen = new Set<string>();
      let hm;
      while ((hm = headingPattern.exec(html)) !== null) {
        const title = hm[1].trim().replace(/\s+/g, ' ');
        if (!title || seen.has(title.toLowerCase())) continue;
        const ctx = html.slice(hm.index, hm.index + 600);
        const date = parseDateFromContext(ctx);
        if (!date) continue;
        seen.add(title.toLowerCase());
        fallback.push({ title, url: `https://808room.com${path}`, date, time: parseTime(ctx), price: parsePrice(ctx), venueName: 'The 808 Room' });
      }
      if (fallback.length) return fallback;
    }
    return [];
  } catch { return []; }
}
