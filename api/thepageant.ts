import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ParsedEvent {
  title: string;
  url: string;
  date: string;
  time: string;
  price: string;
  venue: string;
}

// Tribe Events Calendar REST API shape
interface TribeEvent {
  title: { rendered: string };
  url: string;
  slug: string;
  start_date: string; // "2026-03-31 19:00:00"
  start_date_details: { year: string; month: string; day: string; hour: string; minutes: string };
  cost: string;
  venue?: { venue?: string };
}

interface TribeResponse {
  events: TribeEvent[];
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const events = await fetchViaRestApi() ?? await fetchViaHTML();
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json({ events });
  } catch {
    res.status(500).json({ error: 'Failed to fetch The Pageant events' });
  }
}

// ── Strategy 1: Tribe Events Calendar REST API ──

async function fetchViaRestApi(): Promise<ParsedEvent[] | null> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const url = `https://www.thepageant.com/wp-json/tribe/events/v1/events?per_page=50&start_date=${today}&status=publish`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)', Accept: 'application/json' },
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('json')) return null;

    const data: TribeResponse = await response.json();
    if (!Array.isArray(data?.events) || data.events.length === 0) return null;

    return data.events.map((e): ParsedEvent => {
      const d = e.start_date_details;
      const date = `${d.year}-${d.month.padStart(2, '0')}-${d.day.padStart(2, '0')}`;
      const time = `${d.hour.padStart(2, '0')}:${d.minutes.padStart(2, '0')}`;
      const venueName = e.venue?.venue ?? 'The Pageant';
      // Strip HTML tags from title
      const title = e.title.rendered.replace(/<[^>]+>/g, '').trim();
      return { title, url: e.url, date, time, price: e.cost ?? '', venue: venueName };
    });
  } catch {
    return null;
  }
}

// ── Strategy 2: HTML scraping fallback ──

async function fetchViaHTML(): Promise<ParsedEvent[]> {
  const response = await fetch('https://www.thepageant.com/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
  });
  const html = await response.text();
  return parsePageantHTML(html);
}

function parsePageantHTML(html: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const seen = new Set<string>();
  const today = new Date().toISOString().slice(0, 10);

  // Match event page links: /event/slug/
  const eventLinkRegex = /<a[^>]+href="(https?:\/\/(?:www\.)?thepageant\.com\/event\/[^"]+)"[^>]*>([^<]{3,120})<\/a>/gi;

  let match;
  while ((match = eventLinkRegex.exec(html)) !== null) {
    const url = match[1];
    const rawTitle = match[2].trim().replace(/\s+/g, ' ');

    if (!rawTitle || rawTitle.length < 3) continue;
    const key = rawTitle.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const contextStart = Math.max(0, match.index - 400);
    const contextEnd = Math.min(html.length, match.index + match[0].length + 800);
    const context = html.slice(contextStart, contextEnd);

    // Date formats: "31 March 2026" or "March 31, 2026"
    const dateMatch =
      context.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i) ||
      context.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})/i);

    if (!dateMatch) continue;

    const months: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04',
      may: '05', june: '06', july: '07', august: '08',
      september: '09', october: '10', november: '11', december: '12',
    };

    let date = '';
    // "31 March 2026" format
    const ddMonthYear = dateMatch[0].match(
      /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i
    );
    if (ddMonthYear) {
      const m = months[ddMonthYear[2].toLowerCase()];
      if (m) date = `${ddMonthYear[3]}-${m}-${ddMonthYear[1].padStart(2, '0')}`;
    } else {
      // "March 31, 2026" format
      const monthDdYear = dateMatch[0].match(
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})/i
      );
      if (monthDdYear) {
        const m = months[monthDdYear[1].toLowerCase()];
        if (m) date = `${monthDdYear[3]}-${m}-${monthDdYear[2].padStart(2, '0')}`;
      }
    }

    if (!date || date < today) continue;

    const timeMatch = context.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
    let time = '20:00';
    if (timeMatch) {
      let h = parseInt(timeMatch[1]);
      const ampm = timeMatch[3].toUpperCase();
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      time = `${String(h).padStart(2, '0')}:${timeMatch[2]}`;
    }

    const priceMatch = context.match(/\$(\d+(?:\.\d{2})?)/);

    // Try to detect which sub-venue (Pageant, Delmar Hall, Duck Room)
    let venue = 'The Pageant';
    if (/delmar\s*hall/i.test(context)) venue = 'Delmar Hall';
    else if (/duck\s*room/i.test(context)) venue = "Blueberry Hill Duck Room";

    events.push({ title: rawTitle, url, date, time, price: priceMatch ? `$${priceMatch[1]}` : '', venue });
  }

  return events;
}
