import type { BITEvent } from '../types/api';
import type { UnifiedEvent } from '../types/event';
import { env } from '../config/env';

const isDev = import.meta.env.DEV;

export async function fetchArtistEvents(artistName: string): Promise<UnifiedEvent[]> {
  const encoded = encodeURIComponent(artistName);

  const url = isDev
    ? `/api/bandsintown/artists/${encoded}/events?app_id=${env.bandsintownAppId}&date=upcoming`
    : `/api/bandsintown?artist=${encoded}&date=upcoming`;

  const response = await fetch(url);

  if (!response.ok) return [];

  const data: BITEvent[] = await response.json();
  if (!Array.isArray(data)) return [];

  return data.map(transformBITEvent);
}

function transformBITEvent(event: BITEvent): UnifiedEvent {
  const dt = new Date(event.datetime);
  const localDate = event.datetime.slice(0, 10);
  const localTime = event.datetime.slice(11, 16) || null;

  return {
    id: `bit_${event.id}`,
    source: 'bandsintown',
    name: event.title || event.lineup.join(', '),
    artistName: event.lineup[0] ?? '',
    artistImageUrl: null,
    venue: {
      name: event.venue.name,
      city: event.venue.city,
      state: event.venue.region || null,
      country: event.venue.country,
      // BIT coordinates are known to be inaccurate — don't use for map
      latitude: null,
      longitude: null,
      address: null,
    },
    dateTime: dt.toISOString(),
    localDate,
    localTime,
    genres: [], // BIT doesn't provide genre data
    ticketUrl: event.offers[0]?.url ?? event.url,
    priceRange: null,
    status: 'unknown',
  };
}
