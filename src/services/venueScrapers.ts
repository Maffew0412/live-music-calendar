import type { UnifiedEvent } from '../types/event';
import type { CityKey } from '../config/constants';

const isDev = import.meta.env.DEV;

// ── Shared ──

interface ScrapedEvent {
  title: string;
  url: string;
  date: string;
  time: string;
  genre?: string;
  price?: string;
}

// ── Boston: Faces Brewing (Squarespace JSON) ──

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

// ── Boston: O'Brien's Pub (serverless HTML scraper) ──

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

// ── Boston: The Met RI (serverless HTML scraper) ──

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

// ── Springfield: Castle Theatre, Bloomington IL ──

async function scrapeCastleTheatre(): Promise<UnifiedEvent[]> {
  try {
    const url = isDev ? '/api/castletheatre/' : '/api/castletheatre';
    const response = await fetch(url);
    if (!response.ok) return [];

    const data: { events: ScrapedEvent[] } = await response.json();
    const today = new Date().toISOString().slice(0, 10);

    return (data.events ?? [])
      .filter((e) => e.date >= today)
      .map((e): UnifiedEvent => ({
        id: `venue_castle_${e.date}_${e.title.slice(0, 20).replace(/\W/g, '')}`,
        source: 'venue-scraper' as UnifiedEvent['source'],
        name: e.title,
        artistName: e.title.split(/[/,–-]/)[0].trim(),
        artistImageUrl: null,
        venue: { name: 'Castle Theatre', city: 'Bloomington', state: 'IL', country: 'US', latitude: 40.4842, longitude: -88.9937, address: '209 E Washington St, Bloomington, IL 61701' },
        dateTime: `${e.date}T${e.time}:00`,
        localDate: e.date,
        localTime: e.time,
        genres: e.genre ? [e.genre] : [],
        ticketUrl: e.url,
        priceRange: e.price ? { min: parseFloat(e.price.replace(/[^0-9.]/g, '')), max: parseFloat(e.price.replace(/[^0-9.]/g, '')), currency: 'USD' } : null,
        status: 'onsale',
      }));
  } catch { return []; }
}

// ── Springfield: Canopy Club, Champaign IL ──

async function scrapeCanopyClub(): Promise<UnifiedEvent[]> {
  try {
    const url = isDev ? '/api/canopyclub/' : '/api/canopyclub';
    const response = await fetch(url);
    if (!response.ok) return [];

    const data: { events: ScrapedEvent[] } = await response.json();
    const today = new Date().toISOString().slice(0, 10);

    return (data.events ?? [])
      .filter((e) => e.date >= today)
      .map((e): UnifiedEvent => ({
        id: `venue_canopy_${e.date}_${e.title.slice(0, 20).replace(/\W/g, '')}`,
        source: 'venue-scraper' as UnifiedEvent['source'],
        name: e.title,
        artistName: e.title.split(/[/,–-]/)[0].trim(),
        artistImageUrl: null,
        venue: { name: 'Canopy Club', city: 'Champaign', state: 'IL', country: 'US', latitude: 40.1164, longitude: -88.2434, address: '708 S Goodwin Ave, Urbana, IL 61801' },
        dateTime: `${e.date}T${e.time}:00`,
        localDate: e.date,
        localTime: e.time,
        genres: e.genre ? [e.genre] : [],
        ticketUrl: e.url,
        priceRange: e.price ? { min: parseFloat(e.price.replace(/[^0-9.]/g, '')), max: parseFloat(e.price.replace(/[^0-9.]/g, '')), currency: 'USD' } : null,
        status: 'onsale',
      }));
  } catch { return []; }
}

// ── Springfield: The Pageant, St. Louis MO ──

interface PageantEvent {
  title: string;
  url: string;
  date: string;
  time: string;
  price: string;
  venue: string;
}

async function scrapeThePageant(): Promise<UnifiedEvent[]> {
  try {
    const url = isDev ? '/api/thepageant/' : '/api/thepageant';
    const response = await fetch(url);
    if (!response.ok) return [];

    const data: { events: PageantEvent[] } = await response.json();
    const today = new Date().toISOString().slice(0, 10);

    return (data.events ?? [])
      .filter((e) => e.date >= today)
      .map((e): UnifiedEvent => {
        // The Pageant complex has three stages — use correct coords for each
        const venueDetails: Record<string, { lat: number; lng: number; address: string }> = {
          'Delmar Hall': { lat: 38.6544, lng: -90.2897, address: '6133 Delmar Blvd, St. Louis, MO 63112' },
          'Blueberry Hill Duck Room': { lat: 38.6488, lng: -90.2912, address: '6504 Delmar Blvd, St. Louis, MO 63130' },
        };
        const details = venueDetails[e.venue] ?? { lat: 38.6488, lng: -90.2912, address: '6161 Delmar Blvd, St. Louis, MO 63112' };
        const venueName = e.venue || 'The Pageant';

        return {
          id: `venue_pageant_${e.date}_${e.title.slice(0, 20).replace(/\W/g, '')}`,
          source: 'venue-scraper' as UnifiedEvent['source'],
          name: e.title,
          artistName: e.title.split(/[/,–]/)[0].trim(),
          artistImageUrl: null,
          venue: { name: venueName, city: 'St. Louis', state: 'MO', country: 'US', latitude: details.lat, longitude: details.lng, address: details.address },
          dateTime: `${e.date}T${e.time}:00`,
          localDate: e.date,
          localTime: e.time,
          genres: [],
          ticketUrl: e.url,
          priceRange: e.price ? { min: parseFloat(e.price.replace(/[^0-9.]/g, '')), max: parseFloat(e.price.replace(/[^0-9.]/g, '')), currency: 'USD' } : null,
          status: 'onsale',
        };
      });
  } catch { return []; }
}

// ── Export ──

export async function scrapeAllVenues(city: CityKey = 'boston'): Promise<UnifiedEvent[]> {
  const scrapers = city === 'springfield'
    ? [scrapeCastleTheatre(), scrapeCanopyClub(), scrapeThePageant()]
    : [scrapeFaces(), scrapeOBriens(), scrapeTheMet()];

  const results = await Promise.allSettled(scrapers);

  return results
    .filter((r): r is PromiseFulfilledResult<UnifiedEvent[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);
}
