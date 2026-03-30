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
      scrapeBoondocks(),
      scrapeBoSCenter(),
      scrapeUISPAC(),
      scrapeBlueGrouch(),
      scrapeTheShed(),
      scrapeDanneberger(),
      scrapeTheRailyard(),
      scrapeHarvestMarket(),
    ]);

    const events: ParsedEvent[] = results
      .filter((r): r is PromiseFulfilledResult<ParsedEvent[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json({ events });
  } catch {
    res.status(500).json({ error: 'Failed to fetch Springfield venue events' });
  }
}

// ── Helpers ──

const MONTHS: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
};

const SHORT_MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function parseDateFromContext(ctx: string): string | null {
  const today = new Date().toISOString().slice(0, 10);
  const currentYear = new Date().getFullYear();

  // "March 31, 2026" / "March 31 2026"
  const m1 = ctx.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})/i);
  if (m1) {
    const mo = MONTHS[m1[1].toLowerCase()];
    if (mo) {
      const d = `${m1[3]}-${mo}-${m1[2].padStart(2, '0')}`;
      return d >= today ? d : null;
    }
  }

  // "31 March 2026"
  const m2 = ctx.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
  if (m2) {
    const mo = MONTHS[m2[2].toLowerCase()];
    if (mo) {
      const d = `${m2[3]}-${mo}-${m2[1].padStart(2, '0')}`;
      return d >= today ? d : null;
    }
  }

  // MM/DD/YYYY or MM/DD/YY
  const m3 = ctx.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (m3) {
    const year = m3[3].length === 2 ? `20${m3[3]}` : m3[3];
    const d = `${year}-${m3[1].padStart(2, '0')}-${m3[2].padStart(2, '0')}`;
    return d >= today ? d : null;
  }

  // "Sat Apr 11" / "Fri May 8" — short month, no year (infer current or next year)
  const m4 = ctx.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i);
  if (m4) {
    const mo = SHORT_MONTHS[m4[1].toLowerCase()];
    if (mo) {
      const candidate = `${currentYear}-${mo}-${m4[2].padStart(2, '0')}`;
      if (candidate >= today) return candidate;
      return `${currentYear + 1}-${mo}-${m4[2].padStart(2, '0')}`;
    }
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

function scrapeLinksFromHTML(
  html: string,
  linkRegex: RegExp,
  venueName: string,
): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const seen = new Set<string>();
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1];
    const rawTitle = (match[2] ?? '').trim().replace(/&amp;/g, '&').replace(/&#\d+;/g, '').replace(/\s+/g, ' ');
    if (!rawTitle || rawTitle.length < 3) continue;
    if (seen.has(rawTitle.toLowerCase())) continue;
    seen.add(rawTitle.toLowerCase());

    const cStart = Math.max(0, match.index - 300);
    const cEnd = Math.min(html.length, match.index + match[0].length + 800);
    const ctx = html.slice(cStart, cEnd);

    const date = parseDateFromContext(ctx);
    if (!date) continue;

    events.push({ title: rawTitle, url, date, time: parseTime(ctx), price: parsePrice(ctx), venueName });
  }
  return events;
}

// ── Boondocks ──
// 2909 N Dirksen Pkwy, Springfield, IL 62702
// Uses ETIX ticketing — try their calendar page for embedded event links

async function scrapeBoondocks(): Promise<ParsedEvent[]> {
  const tribe = await tryTribeAPI('https://theboondockspub.com', 'Boondocks');
  if (tribe?.length) return tribe;

  try {
    // ETIX venues often embed a widget; try fetching the events/calendar page
    for (const path of ['/calendar', '/events', '/shows', '/']) {
      const resp = await fetch(`https://theboondockspub.com${path}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
        signal: AbortSignal.timeout(8000),
      });
      if (!resp.ok) continue;
      const html = await resp.text();

      // Look for ETIX event links
      const etixPattern = /<a[^>]+href="(https?:\/\/(?:www\.)?etix\.com\/ticket\/[^"]+)"[^>]*>([^<]{3,120})<\/a>/gi;
      const etixEvents = scrapeLinksFromHTML(html, etixPattern, 'Boondocks');
      if (etixEvents.length) return etixEvents;

      // Look for internal event links
      const pattern = /<a[^>]+href="(https?:\/\/(?:www\.)?theboondockspub\.com\/(?:event|show|ticket)[^"]*)"[^>]*>([^<]{3,100})<\/a>/gi;
      const results = scrapeLinksFromHTML(html, pattern, 'Boondocks');
      if (results.length) return results;

      // Look for any event-like title + date pairs in the page
      const titlePattern = /<(?:h[1-4]|strong)[^>]*>([^<]{5,100})<\/(?:h[1-4]|strong)>/gi;
      const today = new Date().toISOString().slice(0, 10);
      const titles: { title: string; idx: number }[] = [];
      let tm;
      while ((tm = titlePattern.exec(html)) !== null) {
        titles.push({ title: tm[1].trim(), idx: tm.index });
      }
      const found: ParsedEvent[] = [];
      for (const { title, idx } of titles) {
        const ctx = html.slice(idx, idx + 400);
        const date = parseDateFromContext(ctx);
        if (!date || date < today) continue;
        found.push({ title, url: `https://theboondockspub.com${path}`, date, time: parseTime(ctx), price: parsePrice(ctx), venueName: 'Boondocks' });
      }
      if (found.length) return found;
    }
    return [];
  } catch { return []; }
}

// ── Bank of Springfield Center ──
// 1 Convention Center Plaza, Springfield, IL 62701
// Major events on Ticketmaster; scrape their own site calendar for smaller shows

async function scrapeBoSCenter(): Promise<ParsedEvent[]> {
  const tribe = await tryTribeAPI('https://www.theboscenter.com', 'Bank of Springfield Center');
  if (tribe?.length) return tribe;

  try {
    const resp = await fetch('https://www.theboscenter.com/events', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const pattern = /<a[^>]+href="(https?:\/\/(?:www\.)?theboscenter\.com\/(?:event|show|events?)[^"]*)"[^>]*>([^<]{3,100})<\/a>/gi;
    return scrapeLinksFromHTML(html, pattern, 'Bank of Springfield Center');
  } catch { return []; }
}

// ── UIS Performing Arts Center ──
// 2200 Ernest Hemingway Dr, Springfield, IL 62703
// Uses Showare ticketing (uisticketoffice.showare.com)
// Note: Sangamon Auditorium under renovation, reopening Fall 2026

async function scrapeUISPAC(): Promise<ParsedEvent[]> {
  const tribe = await tryTribeAPI('https://uispac.com', 'UIS Performing Arts Center');
  if (tribe?.length) return tribe;

  try {
    // Try Showare API for upcoming events
    const showareResp = await fetch(
      'https://uisticketoffice.showare.com/api/events?status=onsale&pagesize=50',
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)', Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (showareResp.ok) {
      const ct = showareResp.headers.get('content-type') ?? '';
      if (ct.includes('json')) {
        const data = await showareResp.json();
        const today = new Date().toISOString().slice(0, 10);
        const items = data?.items ?? data?.events ?? data?.data ?? [];
        if (Array.isArray(items) && items.length > 0) {
          return items
            .filter((e: { eventDate?: string; startDate?: string }) => {
              const d = (e.eventDate ?? e.startDate ?? '').slice(0, 10);
              return d >= today;
            })
            .map((e: { name?: string; eventName?: string; title?: string; eventDate?: string; startDate?: string; url?: string; eventUrl?: string }) => {
              const title = (e.name ?? e.eventName ?? e.title ?? '').replace(/<[^>]+>/g, '').trim();
              const dateStr = (e.eventDate ?? e.startDate ?? '').slice(0, 10);
              const timeStr = (e.eventDate ?? e.startDate ?? '').slice(11, 16) || '20:00';
              const url = e.url ?? e.eventUrl ?? 'https://uisticketoffice.showare.com';
              return { title, url, date: dateStr, time: timeStr, price: '', venueName: 'UIS Performing Arts Center' };
            })
            .filter((e: ParsedEvent) => e.title && e.date);
        }
      }
    }

    // Fallback: scrape uispac.com events page
    const resp = await fetch('https://uispac.com/events/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const pattern = /<a[^>]+href="(https?:\/\/(?:www\.)?uispac\.com\/(?:event|show|events?)[^"]*)"[^>]*>([^<]{3,100})<\/a>/gi;
    return scrapeLinksFromHTML(html, pattern, 'UIS Performing Arts Center');
  } catch { return []; }
}

// ── The Blue Grouch Pub ──
// 510 W Maple Ave S, Springfield, IL 62704
// Wix Thunderbolt site — shows page uses Wix Pro Gallery widget (not Wix Events)
// Events are stored as flyer PNG images; filenames encode date: "BG Artist MMDDYY.png"

async function scrapeBlueGrouch(): Promise<ParsedEvent[]> {
  try {
    const resp = await fetch('https://www.thebluegrouch.com/shows', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();

    // Wix embeds all page data in a script#wix-warmup-data JSON block
    const warmupMatch = html.match(/<script[^>]+id="wix-warmup-data"[^>]*>([\s\S]*?)<\/script>/i);
    if (!warmupMatch) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let warmup: any;
    try { warmup = JSON.parse(warmupMatch[1]); } catch { return []; }

    // Events live in the Wix Pro Gallery app data under appsWarmupData
    const appsData = warmup?.appsWarmupData ?? {};
    const events: ParsedEvent[] = [];
    const today = new Date().toISOString().slice(0, 10);

    for (const appId of Object.keys(appsData)) {
      const appData = appsData[appId];
      for (const key of Object.keys(appData ?? {})) {
        const galleryData = appData[key]?.items;
        if (!Array.isArray(galleryData)) continue;

        for (const item of galleryData) {
          const fileName: string = item?.metaData?.fileName ?? item?.fileName ?? '';
          if (!fileName) continue;

          // Filename pattern: "BG Artist Name MMDDYY.png"
          const m = fileName.match(/^BG\s+(.+?)\s+(\d{6})\.\w+$/i);
          if (!m) continue;

          const title = m[1].trim();
          const raw = m[2]; // MMDDYY
          const mm = raw.slice(0, 2);
          const dd = raw.slice(2, 4);
          const yy = raw.slice(4, 6);
          const date = `20${yy}-${mm}-${dd}`;
          if (date < today) continue;

          events.push({
            title,
            url: 'https://www.thebluegrouch.com/shows',
            date,
            time: '21:00',
            price: '',
            venueName: 'The Blue Grouch',
          });
        }
        if (events.length) return events;
      }
    }
    return events;
  } catch { return []; }
}

// ── The Shed ──
// 801 E Sangamon Ave (Illinois State Fairgrounds), Springfield, IL 62794
// Seasonal — State Fair website lists events

async function scrapeTheShed(): Promise<ParsedEvent[]> {
  try {
    const resp = await fetch(
      'https://www.illinoisstatefair.info/entertainment/',
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!resp.ok) return [];
    const html = await resp.text();

    // Look for The Shed mentions with dates nearby
    const shedIdx = html.toLowerCase().indexOf('the shed');
    if (shedIdx === -1) return [];

    const events: ParsedEvent[] = [];
    const seen = new Set<string>();

    // Find heading tags near "The Shed" occurrences
    const headingRegex = /<(?:h[1-5]|strong|b)[^>]*>([^<]{3,120})<\/(?:h[1-5]|strong|b)>/gi;
    let m;
    while ((m = headingRegex.exec(html)) !== null) {
      const title = m[1].trim();
      if (!title || title.length < 3) continue;
      if (seen.has(title.toLowerCase())) continue;

      const ctx = html.slice(m.index, m.index + 600);
      // Only include if near a "Shed" mention
      if (!/shed/i.test(ctx)) continue;

      const date = parseDateFromContext(ctx);
      if (!date) continue;
      seen.add(title.toLowerCase());
      events.push({ title, url: 'https://www.illinoisstatefair.info/entertainment/', date, time: parseTime(ctx), price: '', venueName: 'The Shed' });
    }
    return events;
  } catch { return []; }
}

// ── Danneberger Family Vineyards ──
// 12341 Irish Road, New Berlin, IL 62670
// Events live on the homepage as direct wl.seetickets.us links
// Dates appear as "Sat Apr 11" / "Fri May 8" in surrounding context

async function scrapeDanneberger(): Promise<ParsedEvent[]> {
  try {
    const resp = await fetch('https://danenbergerfamilyvineyards.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();

    const events: ParsedEvent[] = [];
    const seen = new Set<string>();

    // Events are hardcoded wl.seetickets.us anchor links in the homepage HTML
    // Note: href values are UNQUOTED in their WP template (href=https://... with no quotes)
    const pattern = /<a[^>]+href=["']?(https?:\/\/wl\.seetickets\.us\/event\/[^\s"'>]+)["']?[^>]*>([^<]{3,120})<\/a>/gi;
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const url = match[1].split('?')[0]; // strip affiliate query params
      const rawTitle = match[2].trim().replace(/&amp;/g, '&').replace(/&#\d+;/g, '').replace(/\s+/g, ' ');
      if (!rawTitle || rawTitle.length < 3) continue;
      if (seen.has(rawTitle.toLowerCase())) continue;
      seen.add(rawTitle.toLowerCase());

      const ctx = html.slice(Math.max(0, match.index - 400), match.index + match[0].length + 400);
      const date = parseDateFromContext(ctx);
      if (!date) continue;

      events.push({
        title: rawTitle,
        url,
        date,
        time: parseTime(ctx),
        price: parsePrice(ctx),
        venueName: 'Danneberger Family Vineyards',
      });
    }
    return events;
  } catch { return []; }
}

// ── The Railyard on Route 66 ──
// 2242 S 6th St, Springfield, IL 62703
// Square Online SPA — events stored in window.__BOOTSTRAP_STATE__ JSON (quill delta format)

async function scrapeTheRailyard(): Promise<ParsedEvent[]> {
  try {
    const resp = await fetch('https://www.therailyardon66.com/events', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();

    // Square Online embeds all page data in window.__BOOTSTRAP_STATE__
    const assignIdx = html.indexOf('window.__BOOTSTRAP_STATE__');
    if (assignIdx === -1) return [];
    const jsonStart = html.indexOf('{', assignIdx);
    const scriptEnd = html.indexOf('</script>', jsonStart);
    if (jsonStart === -1 || scriptEnd === -1) return [];

    const rawJson = html.slice(jsonStart, scriptEnd).replace(/;\s*$/, '').trimEnd();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let bootstrap: any;
    try { bootstrap = JSON.parse(rawJson); } catch { return []; }

    // Navigate to quill ops — path may shift; try a few common locations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function findOps(obj: any): Array<{ insert: unknown }> | null {
      if (!obj || typeof obj !== 'object') return null;
      if (Array.isArray(obj?.ops) && obj.ops.length > 0 && typeof obj.ops[0]?.insert === 'string') {
        const text = obj.ops.map((o: { insert: unknown }) => (typeof o.insert === 'string' ? o.insert : '')).join('');
        if (/(?:january|february|march|april|may|june|july|august|september|october|november|december)/i.test(text)) {
          return obj.ops;
        }
      }
      for (const key of Object.keys(obj)) {
        const result = findOps(obj[key]);
        if (result) return result;
      }
      return null;
    }

    const ops = findOps(bootstrap);
    if (!ops) return [];

    const text = ops
      .filter((op) => typeof op.insert === 'string')
      .map((op) => op.insert as string)
      .join('');

    const monthMap: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04',
      may: '05', june: '06', july: '07', august: '08',
      september: '09', october: '10', november: '11', december: '12',
    };

    const events: ParsedEvent[] = [];
    const today = new Date().toISOString().slice(0, 10);
    const currentYear = new Date().getFullYear();
    let currentMonth = '';

    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Month header: "MARCH:" or "APRIL:"
      const monthMatch = trimmed.match(/^(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER):?\s*$/i);
      if (monthMatch) {
        currentMonth = monthMatch[1].toLowerCase();
        continue;
      }

      if (!currentMonth) continue;

      // Event line: "13th & 14th: EVENT NAME" or "27th & 28th - EVENT NAME"
      const eventMatch = trimmed.match(/^(\d{1,2})(?:st|nd|rd|th)(?:\s*(?:[&–-])\s*\d{1,2}(?:st|nd|rd|th))?(?:\s*[-:(]\s*)(.{3,})/i);
      if (!eventMatch) continue;

      const day = eventMatch[1].padStart(2, '0');
      const title = eventMatch[2].replace(/[)]+$/, '').replace(/\s+/g, ' ').trim();
      if (!title || title.length < 3) continue;

      // Filter to music-relevant events
      const isMusicEvent = /blues|punk|rock|jazz|country|folk|music|dj\b|band|tribute|concert|open.?mic|soul|hip.?hop|metal|indie|swifties|era.?night|halloween/i.test(title);
      if (!isMusicEvent) continue;

      const mo = monthMap[currentMonth];
      if (!mo) continue;

      let year = currentYear;
      const candidate = `${year}-${mo}-${day}`;
      if (candidate < today) year = currentYear + 1;
      const date = `${year}-${mo}-${day}`;
      if (date < today) continue;

      events.push({
        title,
        url: 'https://www.therailyardon66.com/events',
        date,
        time: '18:00',
        price: '',
        venueName: 'The Railyard on Route 66',
      });
    }
    return events;
  } catch { return []; }
}

// ── Harvest Market Farmhouse Brews ──
// 3001 S Veterans Pkwy, Springfield, IL 62704
// WordPress + Tribe Events Calendar Pro — live music Fri/Sat evenings

async function scrapeHarvestMarket(): Promise<ParsedEvent[]> {
  const tribe = await tryTribeAPI('https://www.goharvestmarket.com', 'Harvest Market Farmhouse Brews');
  if (tribe?.length) return tribe;

  try {
    const resp = await fetch(
      'https://www.goharvestmarket.com/events-at-our-niemann-harvest-market-store-in-springfield-il/',
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!resp.ok) return [];
    const html = await resp.text();

    const pattern = /<a[^>]+href="(https?:\/\/(?:www\.)?goharvestmarket\.com\/(?:event|events?)[^"]+)"[^>]*>([^<]{3,100})<\/a>/gi;
    return scrapeLinksFromHTML(html, pattern, 'Harvest Market Farmhouse Brews');
  } catch { return []; }
}
