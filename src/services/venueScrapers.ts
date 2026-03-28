import type { UnifiedEvent } from '../types/event';

interface SquarespaceItem {
  id: string;
  title: string;
  fullUrl: string;
  excerpt: string;
  assetUrl?: string;
  variants?: { price: number }[];
}

interface SquarespaceResponse {
  items: SquarespaceItem[];
}

interface VenueConfig {
  name: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  address: string;
  eventsJsonUrl: string;
  siteBaseUrl: string;
}

const VENUE_CONFIGS: VenueConfig[] = [
  {
    name: 'Faces Brewing Co.',
    city: 'Malden',
    state: 'MA',
    country: 'US',
    latitude: 42.4251,
    longitude: -71.0662,
    address: '50 Commercial St, Malden, MA 02148',
    eventsJsonUrl: import.meta.env.DEV
      ? '/api/faces/events?format=json'
      : '/api/faces?format=json',
    siteBaseUrl: 'https://www.facesbrewing.com',
  },
];

function parseExcerptDate(excerpt: string): { localDate: string; localTime: string | null } | null {
  // Format: "8 pm Doors - March 28th, 2026" or "7 pm Doors - April 18th, 2026"
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
  const localDate = `${yearStr}-${month}-${day}`;
  const localTime = `${String(hour).padStart(2, '0')}:00`;

  return { localDate, localTime };
}

async function scrapeSquarespaceVenue(config: VenueConfig): Promise<UnifiedEvent[]> {
  try {
    const response = await fetch(config.eventsJsonUrl);
    if (!response.ok) return [];

    const data: SquarespaceResponse = await response.json();
    if (!data.items) return [];

    const today = new Date().toISOString().slice(0, 10);

    return data.items
      .map((item): UnifiedEvent | null => {
        const parsed = parseExcerptDate(item.excerpt);
        if (!parsed) return null;

        // Skip past events
        if (parsed.localDate < today) return null;

        // Skip non-music events (cookie decorating, etc.)
        const lowerTitle = item.title.toLowerCase();
        if (lowerTitle.includes('class') || lowerTitle.includes('decorating') ||
            lowerTitle.includes('trivia') || lowerTitle.includes('brunch')) {
          return null;
        }

        const priceCents = item.variants?.[0]?.price ?? 0;
        const priceRange = priceCents > 0
          ? { min: priceCents / 100, max: priceCents / 100, currency: 'USD' }
          : null;

        return {
          id: `venue_faces_${item.id}`,
          source: 'venue-scraper' as UnifiedEvent['source'],
          name: item.title,
          artistName: item.title.split(',')[0].trim(),
          artistImageUrl: item.assetUrl ?? null,
          venue: {
            name: config.name,
            city: config.city,
            state: config.state,
            country: config.country,
            latitude: config.latitude,
            longitude: config.longitude,
            address: config.address,
          },
          dateTime: `${parsed.localDate}T${parsed.localTime ?? '20:00'}:00`,
          localDate: parsed.localDate,
          localTime: parsed.localTime,
          genres: [],
          ticketUrl: `${config.siteBaseUrl}${item.fullUrl}`,
          priceRange,
          status: 'onsale',
        };
      })
      .filter((e): e is UnifiedEvent => e !== null);
  } catch {
    return [];
  }
}

export async function scrapeAllVenues(): Promise<UnifiedEvent[]> {
  const results = await Promise.allSettled(
    VENUE_CONFIGS.map((config) => scrapeSquarespaceVenue(config))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<UnifiedEvent[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);
}
