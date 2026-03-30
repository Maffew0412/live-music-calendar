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

// ── Springfield: Consolidated STL indie venues ──

interface STLVenueEvent {
  title: string;
  url: string;
  date: string;
  time: string;
  price: string;
  venueName: string;
}

// Venue coordinate lookup for all known STL venues
const STL_VENUE_COORDS: Record<string, { lat: number; lng: number; address: string; city: string; state: string }> = {
  'Old Rock House':           { lat: 38.6043, lng: -90.2021, address: '1200 S 7th St, St. Louis, MO 63104', city: 'St. Louis', state: 'MO' },
  'Off Broadway':             { lat: 38.5993, lng: -90.2328, address: '3509 Lemp Ave, St. Louis, MO 63118', city: 'St. Louis', state: 'MO' },
  'Blue Strawberry':          { lat: 38.6393, lng: -90.2410, address: '364 N Boyle Ave, St. Louis, MO 63108', city: 'St. Louis', state: 'MO' },
  'Atomic by Jamo':           { lat: 38.6253, lng: -90.2618, address: '4140 Manchester Ave, St. Louis, MO 63110', city: 'St. Louis', state: 'MO' },
  'Mississippi Underground Hall': { lat: 38.6269, lng: -90.1848, address: 'Laclede\'s Landing, St. Louis, MO 63102', city: 'St. Louis', state: 'MO' },
};

async function scrapeSTLVenues(): Promise<UnifiedEvent[]> {
  try {
    const url = isDev ? '/api/stlvenues/' : '/api/stlvenues';
    const response = await fetch(url);
    if (!response.ok) return [];

    const data: { events: STLVenueEvent[] } = await response.json();
    const today = new Date().toISOString().slice(0, 10);

    return (data.events ?? [])
      .filter((e) => e.date >= today)
      .map((e): UnifiedEvent => {
        const coords = STL_VENUE_COORDS[e.venueName] ?? { lat: 38.6270, lng: -90.1994, address: 'St. Louis, MO', city: 'St. Louis', state: 'MO' };
        return {
          id: `venue_stl_${e.venueName.replace(/\W/g, '')}_${e.date}_${e.title.slice(0, 15).replace(/\W/g, '')}`,
          source: 'venue-scraper' as UnifiedEvent['source'],
          name: e.title,
          artistName: e.title.split(/[/,–]/)[0].trim(),
          artistImageUrl: null,
          venue: { name: e.venueName, city: coords.city, state: coords.state, country: 'US', latitude: coords.lat, longitude: coords.lng, address: coords.address },
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

// ── Springfield: Champaign-area venues ──

interface ChamVenueEvent {
  title: string;
  url: string;
  date: string;
  time: string;
  price: string;
  venueName: string;
}

const CHAM_VENUE_COORDS: Record<string, { lat: number; lng: number; address: string; city: string; state: string }> = {
  'State Farm Center':    { lat: 40.0962, lng: -88.2359, address: '1800 S 1st St, Champaign, IL 61820',      city: 'Champaign', state: 'IL' },
  'The City Center':      { lat: 40.1167, lng: -88.2417, address: '505 S Chestnut St, Champaign, IL 61820',  city: 'Champaign', state: 'IL' },
  'Virginia Theatre':     { lat: 40.1174, lng: -88.2420, address: '203 W Park Ave, Champaign, IL 61820',     city: 'Champaign', state: 'IL' },
  'Rose Bowl Tavern':     { lat: 40.1129, lng: -88.2088, address: '106 N Race St, Urbana, IL 61801',         city: 'Urbana',    state: 'IL' },
  'Orpheum Champaign':    { lat: 40.1195, lng: -88.2425, address: '346 N Neil St, Champaign, IL 61820',      city: 'Champaign', state: 'IL' },
  'The Cadillac':         { lat: 40.4619, lng: -88.0977, address: '108 W State St, Paxton, IL 61960',        city: 'Paxton',    state: 'IL' },
  'Cowboy Monkey':        { lat: 40.1163, lng: -88.2417, address: '6 E Taylor St, Champaign, IL 61820',      city: 'Champaign', state: 'IL' },
  'The Space':            { lat: 40.1165, lng: -88.2428, address: '1 E Main St Ste 107, Champaign, IL 61820', city: 'Champaign', state: 'IL' },
};

async function scrapeChampaignVenues(): Promise<UnifiedEvent[]> {
  try {
    const url = isDev ? '/api/chamvenues/' : '/api/chamvenues';
    const response = await fetch(url);
    if (!response.ok) return [];

    const data: { events: ChamVenueEvent[] } = await response.json();
    const today = new Date().toISOString().slice(0, 10);

    return (data.events ?? [])
      .filter((e) => e.date >= today)
      .map((e): UnifiedEvent => {
        const coords = CHAM_VENUE_COORDS[e.venueName] ?? { lat: 40.1164, lng: -88.2434, address: 'Champaign, IL', city: 'Champaign', state: 'IL' };
        return {
          id: `venue_cham_${e.venueName.replace(/\W/g,'')}_${e.date}_${e.title.slice(0,15).replace(/\W/g,'')}`,
          source: 'venue-scraper' as UnifiedEvent['source'],
          name: e.title,
          artistName: e.title.split(/[/,–]/)[0].trim(),
          artistImageUrl: null,
          venue: { name: e.venueName, city: coords.city, state: coords.state, country: 'US', latitude: coords.lat, longitude: coords.lng, address: coords.address },
          dateTime: `${e.date}T${e.time}:00`,
          localDate: e.date,
          localTime: e.time,
          genres: [],
          ticketUrl: e.url,
          priceRange: e.price && e.price !== 'Free'
            ? { min: parseFloat(e.price.replace(/[^0-9.]/g,'')), max: parseFloat(e.price.replace(/[^0-9.]/g,'')), currency: 'USD' }
            : null,
          status: 'onsale',
        };
      });
  } catch { return []; }
}

// ── Springfield: Peoria-area venues ──

interface PeoriaVenueEvent {
  title: string;
  url: string;
  date: string;
  time: string;
  price: string;
  venueName: string;
}

const PEORIA_VENUE_COORDS: Record<string, { lat: number; lng: number; address: string; city: string; state: string }> = {
  'Revival Music Hall':                  { lat: 40.7300, lng: -89.5800, address: '3300 W Willow Knolls Dr, Peoria, IL 61614', city: 'Peoria', state: 'IL' },
  'Peoria Civic Center':                 { lat: 40.6888, lng: -89.5898, address: '201 SW Jefferson Ave, Peoria, IL 61602', city: 'Peoria', state: 'IL' },
  'CEFCU Center Stage at the Landing':   { lat: 40.6903, lng: -89.5858, address: '200 NE Water St, Peoria, IL 61602', city: 'Peoria', state: 'IL' },
  'Rage Club':                           { lat: 40.7100, lng: -89.5900, address: '1114 N Institute Pl, Peoria, IL 61606', city: 'Peoria', state: 'IL' },
  'Venue Chisca':                        { lat: 40.6940, lng: -89.5950, address: '1009 SW Washington St, Peoria, IL 61602', city: 'Peoria', state: 'IL' },
  'The Neon Bison':                      { lat: 40.6940, lng: -89.5910, address: '617 Main St, Peoria, IL 61602', city: 'Peoria', state: 'IL' },
  'Five Points Washington':              { lat: 40.7020, lng: -89.4070, address: '360 N Wilmor Rd, Washington, IL 61571', city: 'Washington', state: 'IL' },
  'The 808 Room':                        { lat: 40.6490, lng: -89.5710, address: '808 Meadow Ave, East Peoria, IL 61611', city: 'East Peoria', state: 'IL' },
};

async function scrapePeoriaVenues(): Promise<UnifiedEvent[]> {
  try {
    const url = isDev ? '/api/peoriavenues/' : '/api/peoriavenues';
    const response = await fetch(url);
    if (!response.ok) return [];

    const data: { events: PeoriaVenueEvent[] } = await response.json();
    const today = new Date().toISOString().slice(0, 10);

    return (data.events ?? [])
      .filter((e) => e.date >= today)
      .map((e): UnifiedEvent => {
        const coords = PEORIA_VENUE_COORDS[e.venueName] ?? { lat: 40.6936, lng: -89.5890, address: 'Peoria, IL', city: 'Peoria', state: 'IL' };
        return {
          id: `venue_peoria_${e.venueName.replace(/\W/g, '')}_${e.date}_${e.title.slice(0, 15).replace(/\W/g, '')}`,
          source: 'venue-scraper' as UnifiedEvent['source'],
          name: e.title,
          artistName: e.title.split(/[/,–]/)[0].trim(),
          artistImageUrl: null,
          venue: { name: e.venueName, city: coords.city, state: coords.state, country: 'US', latitude: coords.lat, longitude: coords.lng, address: coords.address },
          dateTime: `${e.date}T${e.time}:00`,
          localDate: e.date,
          localTime: e.time,
          genres: [],
          ticketUrl: e.url,
          priceRange: e.price && e.price !== 'Free'
            ? { min: parseFloat(e.price.replace(/[^0-9.]/g, '')), max: parseFloat(e.price.replace(/[^0-9.]/g, '')), currency: 'USD' }
            : null,
          status: 'onsale',
        };
      });
  } catch { return []; }
}

// ── Springfield: Bloomington-area venues ──

interface BloomVenueEvent {
  title: string;
  url: string;
  date: string;
  time: string;
  price: string;
  venueName: string;
}

const BLOOM_VENUE_COORDS: Record<string, { lat: number; lng: number; address: string; city: string; state: string }> = {
  'Connie Link Amphitheatre':     { lat: 40.5024, lng: -88.9830, address: '621 S Linden St, Normal, IL 61761', city: 'Normal', state: 'IL' },
  'Six Strings Club':             { lat: 40.4858, lng: -88.9942, address: '525 N Center St, Bloomington, IL 61701', city: 'Bloomington', state: 'IL' },
  'Devon Lakeshore Amphitheater': { lat: 39.8337, lng: -88.9190, address: '2686 E Cantrell St, Decatur, IL 62521', city: 'Decatur', state: 'IL' },
};

async function scrapeBloomingtonVenues(): Promise<UnifiedEvent[]> {
  try {
    const url = isDev ? '/api/bloomvenues/' : '/api/bloomvenues';
    const response = await fetch(url);
    if (!response.ok) return [];

    const data: { events: BloomVenueEvent[] } = await response.json();
    const today = new Date().toISOString().slice(0, 10);

    return (data.events ?? [])
      .filter((e) => e.date >= today)
      .map((e): UnifiedEvent => {
        const coords = BLOOM_VENUE_COORDS[e.venueName] ?? { lat: 40.4842, lng: -88.9937, address: 'Bloomington, IL', city: 'Bloomington', state: 'IL' };
        return {
          id: `venue_bloom_${e.venueName.replace(/\W/g, '')}_${e.date}_${e.title.slice(0, 15).replace(/\W/g, '')}`,
          source: 'venue-scraper' as UnifiedEvent['source'],
          name: e.title,
          artistName: e.title.split(/[/,–]/)[0].trim(),
          artistImageUrl: null,
          venue: { name: e.venueName, city: coords.city, state: coords.state, country: 'US', latitude: coords.lat, longitude: coords.lng, address: coords.address },
          dateTime: `${e.date}T${e.time}:00`,
          localDate: e.date,
          localTime: e.time,
          genres: [],
          ticketUrl: e.url,
          priceRange: e.price && e.price !== 'Free'
            ? { min: parseFloat(e.price.replace(/[^0-9.]/g, '')), max: parseFloat(e.price.replace(/[^0-9.]/g, '')), currency: 'USD' }
            : null,
          status: 'onsale',
        };
      });
  } catch { return []; }
}

// ── Springfield: Local Springfield IL venues ──

interface SPRVenueEvent {
  title: string;
  url: string;
  date: string;
  time: string;
  price: string;
  venueName: string;
}

const SPR_VENUE_COORDS: Record<string, { lat: number; lng: number; address: string; city: string; state: string }> = {
  'Boondocks':                    { lat: 39.8200, lng: -89.6600, address: '2909 N Dirksen Pkwy, Springfield, IL 62702', city: 'Springfield', state: 'IL' },
  'Bank of Springfield Center':   { lat: 39.8011, lng: -89.6443, address: '1 Convention Center Plaza, Springfield, IL 62701', city: 'Springfield', state: 'IL' },
  'UIS Performing Arts Center':   { lat: 39.7700, lng: -89.6300, address: '2200 Ernest Hemingway Dr, Springfield, IL 62703', city: 'Springfield', state: 'IL' },
  'The Blue Grouch':              { lat: 39.7600, lng: -89.6500, address: '510 W Maple Ave S, Springfield, IL 62704', city: 'Springfield', state: 'IL' },
  'The Shed':                     { lat: 39.8358, lng: -89.6373, address: '801 E Sangamon Ave, Springfield, IL 62794', city: 'Springfield', state: 'IL' },
  'Danneberger Family Vineyards': { lat: 39.7126, lng: -89.8789, address: '12341 Irish Rd, New Berlin, IL 62670', city: 'New Berlin', state: 'IL' },
  'The Railyard on Route 66':       { lat: 39.7724, lng: -89.6495, address: '2242 S 6th St, Springfield, IL 62703', city: 'Springfield', state: 'IL' },
  'Harvest Market Farmhouse Brews': { lat: 39.7650, lng: -89.7093, address: '3001 S Veterans Pkwy, Springfield, IL 62704', city: 'Springfield', state: 'IL' },
};

async function scrapeSpringfieldVenues(): Promise<UnifiedEvent[]> {
  try {
    const url = isDev ? '/api/sprvenues/' : '/api/sprvenues';
    const response = await fetch(url);
    if (!response.ok) return [];

    const data: { events: SPRVenueEvent[] } = await response.json();
    const today = new Date().toISOString().slice(0, 10);

    return (data.events ?? [])
      .filter((e) => e.date >= today)
      .map((e): UnifiedEvent => {
        const coords = SPR_VENUE_COORDS[e.venueName] ?? { lat: 39.7817, lng: -89.6501, address: 'Springfield, IL', city: 'Springfield', state: 'IL' };
        return {
          id: `venue_spr_${e.venueName.replace(/\W/g, '')}_${e.date}_${e.title.slice(0, 15).replace(/\W/g, '')}`,
          source: 'venue-scraper' as UnifiedEvent['source'],
          name: e.title,
          artistName: e.title.split(/[/,–]/)[0].trim(),
          artistImageUrl: null,
          venue: { name: e.venueName, city: coords.city, state: coords.state, country: 'US', latitude: coords.lat, longitude: coords.lng, address: coords.address },
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
    ? [scrapeCastleTheatre(), scrapeCanopyClub(), scrapeThePageant(), scrapeSTLVenues(), scrapeSpringfieldVenues(), scrapeBloomingtonVenues(), scrapePeoriaVenues(), scrapeChampaignVenues()]
    : [scrapeFaces(), scrapeOBriens(), scrapeTheMet()];

  const results = await Promise.allSettled(scrapers);

  return results
    .filter((r): r is PromiseFulfilledResult<UnifiedEvent[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);
}
