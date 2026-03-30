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
      // State Farm Center — Ticketmaster, already in TM search; skip scraping
      scrapeCityCenter(),
      scrapeVirginiaTheatre(),
      scrapeRoseBowlTavern(),
      scrapeCadillac(),
      scrapeCowboyMonkey(),
      scrapeTheSpace(),
      // Orpheum — now a wedding/event venue, no longer live music; skip
    ]);

    const events: ParsedEvent[] = results
      .filter((r): r is PromiseFulfilledResult<ParsedEvent[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json({ events });
  } catch {
    res.status(500).json({ error: 'Failed to fetch Champaign venue events' });
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
  if (m1) { const mo = MONTHS[m1[1].toLowerCase()]; if (mo) { const d = `${m1[3]}-${mo}-${m1[2].padStart(2,'0')}`; return d >= today ? d : null; } }
  const m2 = ctx.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
  if (m2) { const mo = MONTHS[m2[2].toLowerCase()]; if (mo) { const d = `${m2[3]}-${mo}-${m2[1].padStart(2,'0')}`; return d >= today ? d : null; } }
  const m3 = ctx.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (m3) { const y = m3[3].length === 2 ? `20${m3[3]}` : m3[3]; const d = `${y}-${m3[1].padStart(2,'0')}-${m3[2].padStart(2,'0')}`; return d >= today ? d : null; }
  return null;
}

function parseTime(ctx: string): string {
  const m = ctx.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
  if (!m) return '20:00';
  let h = parseInt(m[1]);
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2,'0')}:${m[2] ?? '00'}`;
}

function parsePrice(ctx: string): string {
  const m = ctx.match(/\$(\d+(?:\.\d{2})?)/);
  return m ? `$${m[1]}` : '';
}

function scrapeLinksFromHTML(html: string, linkRegex: RegExp, venueName: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const seen = new Set<string>();
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1];
    const rawTitle = (match[2] ?? '').trim().replace(/&amp;/g,'&').replace(/&#\d+;/g,'').replace(/\s+/g,' ');
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

// ── City Center Champaign ──
// 505 S Chestnut St, Champaign, IL 61820
// ETIX ticketing — scrape both their site and the ETIX venue page

async function scrapeCityCenter(): Promise<ParsedEvent[]> {
  // Try their own event calendar page
  try {
    const resp = await fetch('https://www.citycenterchampaign.com/event-calendar', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (resp.ok) {
      const html = await resp.text();
      // Look for ETIX links embedded on their page
      const etixPattern = /<a[^>]+href="(https?:\/\/(?:www\.)?etix\.com\/ticket\/[^"]+)"[^>]*>([^<]{3,100})<\/a>/gi;
      const etix = scrapeLinksFromHTML(html, etixPattern, 'The City Center');
      if (etix.length) return etix;
    }
  } catch { /* fall through */ }

  // Try ETIX venue page directly
  try {
    const resp = await fetch('https://www.etix.com/ticket/v/30021/the-city-center-champaign', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();

    // ETIX event pages: look for event links + nearby date/title content
    const pattern = /<a[^>]+href="(https?:\/\/(?:www\.)?etix\.com\/ticket\/p\/\d+\/[^"]+)"[^>]*>([^<]{3,100})<\/a>/gi;
    const results = scrapeLinksFromHTML(html, pattern, 'The City Center');
    if (results.length) return results;

    // ETIX sometimes renders as JSON in a script tag
    const jsonMatch = html.match(/window\.__INITIAL_DATA__\s*=\s*(\{[\s\S]{100,50000}?\});/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        const today = new Date().toISOString().slice(0, 10);
        const items = data?.events ?? data?.performances ?? [];
        if (Array.isArray(items)) {
          return items
            .filter((e: Record<string,unknown>) => String(e.date ?? e.startDate ?? '').slice(0,10) >= today)
            .map((e: Record<string,unknown>): ParsedEvent => ({
              title: String(e.name ?? e.title ?? '').trim(),
              url: String(e.url ?? `https://www.etix.com/ticket/v/30021/`),
              date: String(e.date ?? e.startDate ?? '').slice(0,10),
              time: String(e.date ?? e.startDate ?? '').slice(11,16) || '20:00',
              price: String(e.price ?? e.cost ?? ''),
              venueName: 'The City Center',
            }))
            .filter(e => e.title && e.date);
        }
      } catch { /* fall through */ }
    }
    return [];
  } catch { return []; }
}

// ── Virginia Theatre ──
// 203 W Park Ave, Champaign, IL 61820
// Showare ticketing — calendarRequests.asp returns JSON performance data

async function scrapeVirginiaTheatre(): Promise<ParsedEvent[]> {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // Showare calendar JSON endpoint
    const showareResp = await fetch(
      `https://thevirginia.showare.com/calendarRequests.asp?action=GetPerformances&startDate=${today}&months=4`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)', Accept: 'application/json, text/javascript, */*' },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (showareResp.ok) {
      const ct = showareResp.headers.get('content-type') ?? '';
      if (ct.includes('json') || ct.includes('javascript')) {
        const raw = await showareResp.text();
        // Showare returns JSONP or JSON
        const jsonStr = raw.replace(/^[^[{]*/, '').replace(/[^}\]]*$/, '');
        try {
          const data = JSON.parse(jsonStr);
          const performances: unknown[] = data?.performances ?? data?.Performances ?? (Array.isArray(data) ? data : []);
          if (Array.isArray(performances) && performances.length > 0) {
            return performances
              .map((p: unknown): ParsedEvent | null => {
                const perf = p as Record<string, unknown>;
                const title = String(perf.name ?? perf.Name ?? perf.eventName ?? perf.EventName ?? '').trim();
                const rawDate = String(perf.date ?? perf.Date ?? perf.performanceDate ?? perf.PerformanceDate ?? '');
                const date = rawDate.slice(0, 10);
                if (!title || !date || date < today) return null;
                const time = rawDate.slice(11, 16) || String(perf.time ?? perf.Time ?? '19:30');
                const url = String(perf.url ?? perf.Url ?? perf.link ?? 'https://thevirginia.showare.com/');
                return { title, url, date, time, price: String(perf.price ?? perf.Price ?? perf.cost ?? ''), venueName: 'Virginia Theatre' };
              })
              .filter((e): e is ParsedEvent => e !== null);
          }
        } catch { /* fall through */ }
      }
    }

    // Fallback: scrape Virginia Theatre website
    const resp = await fetch('https://thevirginia.org/events/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const pattern = /<a[^>]+href="(https?:\/\/(?:www\.)?thevirginia\.(?:org|showare\.com)\/[^"]+)"[^>]*>([^<]{3,100})<\/a>/gi;
    return scrapeLinksFromHTML(html, pattern, 'Virginia Theatre');
  } catch { return []; }
}

// ── Rose Bowl Tavern ──
// 106 N Race St, Urbana, IL 61801
// WordPress + Eventbrite — scrape their Eventbrite organizer page

async function scrapeRoseBowlTavern(): Promise<ParsedEvent[]> {
  // Try their own site first (WordPress)
  try {
    const resp = await fetch('https://rosebowltavern.com/events/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (resp.ok) {
      const html = await resp.text();
      // WordPress Tribe Events API
      const tribeResp = await fetch('https://rosebowltavern.com/wp-json/tribe/events/v1/events?per_page=50&start_date=' + new Date().toISOString().slice(0,10), {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)', Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      });
      if (tribeResp.ok && (tribeResp.headers.get('content-type') ?? '').includes('json')) {
        const data = await tribeResp.json();
        if (Array.isArray(data?.events) && data.events.length > 0) {
          return data.events.map((e: { title: { rendered: string }; url: string; start_date_details: { year: string; month: string; day: string; hour: string; minutes: string }; cost?: string }) => {
            const d = e.start_date_details;
            return { title: e.title.rendered.replace(/<[^>]+>/g,'').trim(), url: e.url, date: `${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}`, time: `${String(d.hour).padStart(2,'0')}:${String(d.minutes).padStart(2,'0')}`, price: e.cost ?? '', venueName: 'Rose Bowl Tavern' };
          });
        }
      }
      // HTML scrape for event links
      const pattern = /<a[^>]+href="(https?:\/\/(?:www\.)?rosebowltavern\.com\/(?:event|show)[^"]+)"[^>]*>([^<]{3,100})<\/a>/gi;
      const results = scrapeLinksFromHTML(html, pattern, 'Rose Bowl Tavern');
      if (results.length) return results;
    }
  } catch { /* fall through */ }

  // Eventbrite organizer page fallback
  return scrapeEventbritePage('https://www.eventbrite.com/o/rose-bowl-tavern-38837864223', 'Rose Bowl Tavern');
}

// ── The Cadillac ──
// 108 W State St, Paxton, IL 61960 (~20 miles from Champaign)
// Eventbrite

async function scrapeCadillac(): Promise<ParsedEvent[]> {
  // Try their own site first
  try {
    const resp = await fetch('https://thecadillacevents.com/events', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (resp.ok) {
      const html = await resp.text();
      const tribeCheck = await fetch('https://thecadillacevents.com/wp-json/tribe/events/v1/events?per_page=50&start_date=' + new Date().toISOString().slice(0,10), {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)', Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      });
      if (tribeCheck.ok && (tribeCheck.headers.get('content-type') ?? '').includes('json')) {
        const data = await tribeCheck.json();
        if (Array.isArray(data?.events) && data.events.length > 0) {
          return data.events.map((e: { title: { rendered: string }; url: string; start_date_details: { year: string; month: string; day: string; hour: string; minutes: string }; cost?: string }) => {
            const d = e.start_date_details;
            return { title: e.title.rendered.replace(/<[^>]+>/g,'').trim(), url: e.url, date: `${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}`, time: `${String(d.hour).padStart(2,'0')}:${String(d.minutes).padStart(2,'0')}`, price: e.cost ?? '', venueName: 'The Cadillac' };
          });
        }
      }
      const ebPattern = /<a[^>]+href="(https?:\/\/(?:www\.)?eventbrite\.com\/e\/[^"]+)"[^>]*>([^<]{3,100})<\/a>/gi;
      const eb = scrapeLinksFromHTML(html, ebPattern, 'The Cadillac');
      if (eb.length) return eb;
    }
  } catch { /* fall through */ }

  return scrapeEventbritePage('https://www.eventbrite.com/o/the-cadillac-102970143541', 'The Cadillac');
}

// ── Cowboy Monkey ──
// 6 E Taylor St, Champaign, IL 61820
// BentoBox platform calendar

async function scrapeCowboyMonkey(): Promise<ParsedEvent[]> {
  try {
    const resp = await fetch('https://www.cowboy-monkey.com/calendar/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();

    // BentoBox event calendar: look for event entries with title + date
    // BentoBox often has structured JSON-LD or embedded data
    const jsonLdMatch = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]+?)<\/script>/gi);
    if (jsonLdMatch) {
      const today = new Date().toISOString().slice(0, 10);
      const events: ParsedEvent[] = [];
      for (const tag of jsonLdMatch) {
        try {
          const content = tag.replace(/<\/?script[^>]*>/gi, '');
          const data = JSON.parse(content);
          const items = Array.isArray(data) ? data : [data];
          for (const item of items) {
            if (item['@type'] !== 'Event' && item['@type'] !== 'MusicEvent') continue;
            const title = String(item.name ?? '').trim();
            const dateStr = String(item.startDate ?? '').slice(0, 10);
            if (!title || !dateStr || dateStr < today) continue;
            const time = String(item.startDate ?? '').slice(11, 16) || '21:00';
            const url = String(item.url ?? item['@id'] ?? 'https://www.cowboy-monkey.com/calendar/');
            events.push({ title, url, date: dateStr, time, price: String(item.offers?.price ?? ''), venueName: 'Cowboy Monkey' });
          }
        } catch { continue; }
      }
      if (events.length) return events;
    }

    // HTML scrape fallback: look for event title + date combinations
    const pattern = /<a[^>]+href="(https?:\/\/(?:www\.)?cowboy-monkey\.com\/[^"]*(?:event|show|calendar)[^"]*)"[^>]*>([^<]{3,100})<\/a>/gi;
    const results = scrapeLinksFromHTML(html, pattern, 'Cowboy Monkey');
    if (results.length) return results;

    // Final fallback: headings near dates on calendar page
    const headingRegex = /<(?:h[2-4]|[^>]+class="[^"]*(?:event|title|name)[^"]*")[^>]*>([^<]{3,80})<\/[^>]+>/gi;
    const fallback: ParsedEvent[] = [];
    const seen = new Set<string>();
    let hm;
    while ((hm = headingRegex.exec(html)) !== null) {
      const title = hm[1].trim().replace(/\s+/g, ' ');
      if (!title || seen.has(title.toLowerCase())) continue;
      const ctx = html.slice(hm.index, hm.index + 500);
      const date = parseDateFromContext(ctx);
      if (!date) continue;
      seen.add(title.toLowerCase());
      fallback.push({ title, url: 'https://www.cowboy-monkey.com/calendar/', date, time: parseTime(ctx), price: parsePrice(ctx), venueName: 'Cowboy Monkey' });
    }
    return fallback;
  } catch { return []; }
}

// ── The Space ──
// 1 E Main St Ste 107, Champaign, IL 61820
// Shopify site + Eventbrite

async function scrapeTheSpace(): Promise<ParsedEvent[]> {
  // Try Eventbrite organizer page
  const eb = await scrapeEventbritePage('https://www.eventbrite.com/o/the-space-61346348363', 'The Space');
  if (eb.length) return eb;

  // Try their own site for event data
  try {
    const resp = await fetch('https://thespacecu.com/events', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const pattern = /<a[^>]+href="(https?:\/\/(?:www\.)?eventbrite\.com\/e\/[^"]+)"[^>]*>([^<]{3,100})<\/a>/gi;
    return scrapeLinksFromHTML(html, pattern, 'The Space');
  } catch { return []; }
}

// ── Shared: Scrape an Eventbrite organizer page ──

async function scrapeEventbritePage(url: string, venueName: string): Promise<ParsedEvent[]> {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();

    // Eventbrite embeds structured event data as JSON-LD or window.__SERVER_DATA__
    const serverDataMatch = html.match(/window\.__SERVER_DATA__\s*=\s*(\{[\s\S]{50,100000}?\});\s*<\/script>/);
    if (serverDataMatch) {
      try {
        const data = JSON.parse(serverDataMatch[1]);
        const today = new Date().toISOString().slice(0, 10);
        // Navigate the Eventbrite data structure
        const events = data?.organizer_profile?.events?.results ?? data?.events?.results ?? data?.search_data?.events?.results ?? [];
        if (Array.isArray(events) && events.length > 0) {
          return events
            .filter((e: Record<string,unknown>) => {
              const start = (e.start_date ?? e.start?.local ?? e.start?.utc ?? '') as string;
              return start.slice(0, 10) >= today;
            })
            .map((e: Record<string,unknown>): ParsedEvent => {
              const start = String(e.start_date ?? e.start?.local ?? e.start?.utc ?? '');
              return {
                title: String(e.name?.text ?? e.name ?? e.title ?? '').trim(),
                url: String(e.url ?? e.eventUrl ?? url),
                date: start.slice(0, 10),
                time: start.slice(11, 16) || '20:00',
                price: String(e.ticket_availability?.minimum_ticket_price?.display ?? e.is_free ? 'Free' : ''),
                venueName,
              };
            })
            .filter(e => e.title && e.date);
        }
      } catch { /* fall through */ }
    }

    // HTML fallback: Eventbrite event card links
    const pattern = /<a[^>]+href="(https?:\/\/(?:www\.)?eventbrite\.com\/e\/[^"?]+)"[^>]*>([^<]{3,120})<\/a>/gi;
    return scrapeLinksFromHTML(html, pattern, venueName);
  } catch { return []; }
}
