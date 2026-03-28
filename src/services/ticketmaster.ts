import type { TMSearchResponse, TMEvent } from '../types/api';
import type { UnifiedEvent } from '../types/event';
import type { SearchFilters } from '../types/filters';
import { env } from '../config/env';
import { TM_PAGE_SIZE } from '../config/constants';
import { extractGenres } from '../utils/genreMapping';

const isDev = import.meta.env.DEV;
const BASE_URL = isDev
  ? '/api/ticketmaster/discovery/v2/events.json'
  : '/api/ticketmaster';

export interface TMSearchResult {
  events: UnifiedEvent[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
}

export async function searchTicketmaster(filters: SearchFilters): Promise<TMSearchResult> {
  const params = new URLSearchParams({
    ...(isDev && { apikey: env.ticketmasterApiKey }),
    classificationName: 'music',
    size: String(TM_PAGE_SIZE),
    page: String(filters.page),
    sort: 'date,asc',
    unit: 'miles',
  });

  // Prefer latlong over postalCode — more reliable results from TM API
  if (filters.coordinates) {
    params.set('latlong', `${filters.coordinates.lat},${filters.coordinates.lng}`);
  } else if (filters.postalCode) {
    params.set('postalCode', filters.postalCode);
  }

  params.set('radius', String(filters.radius));

  if (filters.genres.length > 0) {
    params.set('classificationName', filters.genres.join(','));
  }

  if (filters.dateRange) {
    params.set('startDateTime', `${filters.dateRange.start}T00:00:00Z`);
    params.set('endDateTime', `${filters.dateRange.end}T23:59:59Z`);
  }

  const response = await fetch(`${BASE_URL}?${params}`);
  if (!response.ok) {
    throw new Error(`Ticketmaster API error: ${response.status}`);
  }

  const data: TMSearchResponse = await response.json();

  return {
    events: (data._embedded?.events ?? []).map(transformTMEvent),
    totalPages: data.page.totalPages,
    totalElements: data.page.totalElements,
    currentPage: data.page.number,
  };
}

function transformTMEvent(event: TMEvent): UnifiedEvent {
  const venue = event._embedded?.venues?.[0];
  const attraction = event._embedded?.attractions?.[0];

  // Pick best image: prefer 16:9, largest width
  const image = event.images
    .filter((img) => img.ratio === '16_9')
    .sort((a, b) => b.width - a.width)[0]
    ?? event.images[0]
    ?? null;

  const priceRange = event.priceRanges?.[0];

  const statusCode = event.dates.status.code.toLowerCase();
  const status: UnifiedEvent['status'] =
    statusCode === 'onsale' ? 'onsale' :
    statusCode === 'offsale' ? 'offsale' :
    statusCode === 'cancelled' || statusCode === 'canceled' ? 'cancelled' :
    'unknown';

  return {
    id: `tm_${event.id}`,
    source: 'ticketmaster',
    name: event.name,
    artistName: attraction?.name ?? event.name,
    artistImageUrl: image?.url ?? null,
    venue: {
      name: venue?.name ?? 'Unknown Venue',
      city: venue?.city?.name ?? '',
      state: venue?.state?.stateCode ?? null,
      country: venue?.country?.countryCode ?? 'US',
      latitude: venue?.location ? parseFloat(venue.location.latitude) : null,
      longitude: venue?.location ? parseFloat(venue.location.longitude) : null,
      address: venue?.address?.line1 ?? null,
    },
    dateTime: event.dates.start.dateTime ?? `${event.dates.start.localDate}T00:00:00`,
    localDate: event.dates.start.localDate,
    localTime: event.dates.start.localTime ?? null,
    genres: extractGenres(event.classifications),
    ticketUrl: event.url,
    priceRange: priceRange ? { min: priceRange.min, max: priceRange.max, currency: priceRange.currency } : null,
    status,
  };
}
