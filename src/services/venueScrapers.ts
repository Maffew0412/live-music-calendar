import type { UnifiedEvent } from '../types/event';

const isDev = import.meta.env.DEV;

// ── Faces Brewing (Squarespace JSON) ──

interface SquarespaceItem {
  id: string;
  title: string;
  fullUrl: string;
  excerpt: string;
  assetUrl?: string;
  variants?: { price: number }[];
}

function parseExcerptDate(excerpt: string): { localDate: string; localTime: string | null } | null {
  const match = excerpt.match(
    /(\d{1,2})\s*(am|pm)\s*Doors?\s*-\s*(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i
  );
  if (!match) return null;

  const [, hourStr, ampm, monthName, dayStr, yearStr] = match;
  const months: Record<string, string> = {
    january: '01', february: '02', march: '03', april: '04',
    may: '05', june: '06', july: '07', august: '08',
    september: '09', october: '10', november: '11', december: '12',
  };

  const month = months[monthName.toLowerCase()];
  if (!month) return null;

  let hour = parseInt(hourStr);
  if (ampm.toLowerCase() === 'pm' && hour !== 12) hour += 12;
  if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0;

  const day = dayStr.padStart(2, '0');
  return { localDate: `${yearStr}-${month}-${day}`, localTime: `${String(hour).padStart(2, '0')}:00` };
}

async function scrapeFaces(): Promise<UnifiedEvent[]> {
  try {
    const url = isDev ? '/api/faces/events?format=json' : '/api/faces?format=json';
    const response = await fetch(url);
    if (!response.ok) return [];

    const data: { items: SquarespaceItem[] } = await response.json();
    if (!data.items) return [];

    const today = new Date().toISOString().slice(0, 10);

    return data.items
      .map((item): UnifiedEvent | null => {
        const parsed = parseExcerptDate(item.excerpt);
        if (!parsed || parsed.localDate < today) return null;

        const lowerTitle = item.title.toLowerCase();
        if (lowerTitle.includes('class') || lowerTitle.includes('decorating') ||
            lowerTitle.includes('trivia') || lowerTitle.includes('brunch')) return null;

        const priceCents = item.variants?.[0]?.price ?? 0;

        return {
          id: `venue_faces_${item.id}`,
          source: 'venue-scraper' as UnifiedEvent['source'],
          name: item.title,
          artistName: item.title.split(',')[0].trim(),
          artistImageUrl: item.assetUrl ?? null,
          venue: { name: "Faces Brewing Co.", city: 'Malden', state: 'MA', country: 'US', latitude: 42.4251, longitude: -71.0662, address: '50 Commercial St, Malden, MA 02148' },
          dateTime: `${parsed.localDate}T${parsed.localTime ?? '20:00'}:00`,
          localDate: parsed.localDate,
          localTime: parsed.localTime,
          genres: [],
          ticketUrl: `https://www.facesbrewing.com${item.fullUrl}`,
          priceRange: priceCents > 0 ? { min: priceCents / 100, max: priceCents / 100, currency: 'USD' } : null,
          status: 'onsale',
        };
      })
      .filter((e): e is UnifiedEvent => e !== null);
  } catch { return []; }
}

// ── O'Brien's Pub (serverless HTML scraper) ──

interface ScrapedEvent {
  title: string;
  url: string;
  date: string;
  time: string;
  genre?: string;
  price?: string;
}

async function scrapeOBriens(): Promise<UnifiedEvent[]> {
  try {
    const url = isDev ? '/api/obriens/' : '/api/obriens';
    const response = await fetch(url);
    if (!response.ok) return [];

    const data: { events: ScrapedEvent[] } = await response.json();
    const today = new Date().toISOString().slice(0, 10);

    return (data.events ?? [])
      .filter((e) => e.date >= today)
      .map((e): UnifiedEvent => ({
        id: `venue_obriens_${e.date}_${e.title.slice(0, 20).replace(/\W/g, '')}`,
        source: 'venue-scraper' as UnifiedEvent['source'],
        name: e.title,
        artistName: e.title.split('/')[0].trim(),
        artistImageUrl: null,
        venue: { name: "O'Brien's Pub", city: 'Allston', state: 'MA', country: 'US', latitude: 42.3528, longitude: -71.1316, address: "3 Harvard Ave, Allston, MA 02134" },
        dateTime: `${e.date}T${e.time}:00`,
        localDate: e.date,
        localTime: e.time,
        genres: e.genre ? [e.genre] : [],
        ticketUrl: e.url,
        priceRange: null,
        status: 'onsale',
      }));
  } catch { return []; }
}

// ── The Met RI (serverless HTML scraper) ──

async function scrapeTheMet(): Promise<UnifiedEvent[]> {
  try {
    const url = isDev ? '/api/themet/events/' : '/api/themet';
    const response = await fetch(url);
    if (!response.ok) return [];

    const data: { events: ScrapedEvent[] } = await response.json();
    const today = new Date().toISOString().slice(0, 10);

    return (data.events ?? [])
      .filter((e) => e.date >= today)
      .map((e): UnifiedEvent => ({
        id: `venue_themet_${e.date}_${e.title.slice(0, 20).replace(/\W/g, '')}`,
        source: 'venue-scraper' as UnifiedEvent['source'],
        name: e.title,
        artistName: e.title.split(/[/,]/)[0].trim(),
        artistImageUrl: null,
        venue: { name: 'The Met', city: 'Pawtucket', state: 'RI', country: 'US', latitude: 41.8787, longitude: -71.3826, address: '1005 Main St, Pawtucket, RI 02860' },
        dateTime: `${e.date}T${e.time}:00`,
        localDate: e.date,
        localTime: e.time,
        genres: [],
        ticketUrl: e.url,
        priceRange: e.price ? { min: parseFloat(e.price.replace('$', '')), max: parseFloat(e.price.replace('$', '')), currency: 'USD' } : null,
        status: 'onsale',
      }));
  } catch { return []; }
}

// ── Export ──

export async function scrapeAllVenues(): Promise<UnifiedEvent[]> {
  const results = await Promise.allSettled([
    scrapeFaces(),
    scrapeOBriens(),
    scrapeTheMet(),
  ]);

  return results
    .filter((r): r is PromiseFulfilledResult<UnifiedEvent[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);
}
