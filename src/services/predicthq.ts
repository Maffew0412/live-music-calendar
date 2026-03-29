import type { PHQSearchResponse, PHQEvent } from '../types/api';
import type { UnifiedEvent } from '../types/event';
import type { SearchFilters } from '../types/filters';
import { env } from '../config/env';

const isDev = import.meta.env.DEV;
const BASE_URL = isDev ? '/api/predicthq/v1/events/' : '/api/predicthq';

// Priority venues — always fetch their events via text search + tight location
const PRIORITY_VENUES = [
  { query: 'Deep Cuts', lat: 42.4179, lng: -71.1102 },
  { query: 'City Winery', lat: 42.364381, lng: -71.0586485 },
  { query: 'Royale Boston', lat: 42.3566466, lng: -71.1439322 },
];

export async function searchPredictHQ(filters: SearchFilters): Promise<UnifiedEvent[]> {
  if (isDev && !env.predictHQToken) return [];
  if (!filters.coordinates) return [];

  const today = new Date().toISOString().slice(0, 10);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(isDev && { Authorization: `Bearer ${env.predictHQToken}` }),
  };

  // Run general search and priority venue searches in parallel
  const [generalEvents, ...priorityResults] = await Promise.all([
    fetchPHQEvents({
      category: 'concerts',
      'start.gte': filters.dateRange?.start ?? today,
      ...(filters.dateRange?.end && { 'start.lte': filters.dateRange.end }),
      within: `${filters.radius}mi@${filters.coordinates.lat},${filters.coordinates.lng}`,
      limit: '50',
      sort: 'start',
      state: 'active',
    }, headers),
    ...PRIORITY_VENUES.map((venue) =>
      fetchPHQEvents({
        category: 'concerts',
        'start.gte': filters.dateRange?.start ?? today,
        ...(filters.dateRange?.end && { 'start.lte': filters.dateRange.end }),
        q: venue.query,
        within: `5mi@${venue.lat},${venue.lng}`,
        limit: '10',
        sort: 'start',
        state: 'active',
      }, headers)
    ),
  ]);

  // Merge and deduplicate by PHQ event ID
  const seen = new Set<string>();
  const allEvents: UnifiedEvent[] = [];
  for (const event of [...generalEvents, ...priorityResults.flat()]) {
    if (!seen.has(event.id)) {
      seen.add(event.id);
      allEvents.push(event);
    }
  }

  return allEvents;
}

async function fetchPHQEvents(
  queryParams: Record<string, string>,
  headers: Record<string, string>,
): Promise<UnifiedEvent[]> {
  try {
    const params = new URLSearchParams(queryParams);
    const response = await fetch(`${BASE_URL}?${params}`, { headers });
    if (!response.ok) return [];
    const data: PHQSearchResponse = await response.json();
    return data.results.map(transformPHQEvent);
  } catch {
    return [];
  }
}

function transformPHQEvent(event: PHQEvent): UnifiedEvent {
  const venueEntity = event.entities.find((e) => e.type === 'venue');
  const artistEntity = event.entities.find((e) => e.type === 'person');

  // PHQ geo coordinates are [longitude, latitude]
  const lng = event.geo.geometry.coordinates[0];
  const lat = event.geo.geometry.coordinates[1];

  const localDate = event.start_local?.slice(0, 10) ?? event.start.slice(0, 10);
  const localTime = event.start_local?.slice(11, 16) ?? null;

  // Extract genre from phq_labels
  const genres = event.phq_labels
    .filter((l) => l.weight > 0.1)
    .map((l) => normalizePhqLabel(l.label))
    .filter((g): g is string => g !== null);

  return {
    id: `phq_${event.id}`,
    source: 'predicthq' as UnifiedEvent['source'],
    name: event.title,
    artistName: artistEntity?.name ?? event.title,
    artistImageUrl: null,
    venue: {
      name: venueEntity?.name ?? 'Unknown Venue',
      city: event.geo.address?.locality ?? extractCity(venueEntity?.formatted_address),
      state: event.geo.address?.region ?? extractState(venueEntity?.formatted_address),
      country: event.geo.address?.country_code ?? event.country,
      latitude: lat,
      longitude: lng,
      address: event.geo.address?.formatted_address ?? venueEntity?.formatted_address ?? null,
    },
    dateTime: event.start,
    localDate,
    localTime,
    genres,
    ticketUrl: null,
    priceRange: null,
    status: event.state === 'active' ? 'onsale' : 'unknown',
  };
}

function normalizePhqLabel(label: string): string | null {
  const map: Record<string, string> = {
    'pop': 'Pop',
    'rock': 'Rock',
    'hip-hop': 'Hip-Hop/Rap',
    'country': 'Country',
    'jazz': 'Jazz',
    'classical': 'Classical',
    'electronic': 'Electronic',
    'folk': 'Folk',
    'metal': 'Metal',
    'punk': 'Punk',
    'alternative': 'Alternative',
    'indie': 'Indie',
    'latin': 'Latin',
    'reggae': 'Reggae',
    'blues': 'Blues',
    'r&b': 'R&B',
    'world': 'World',
  };
  return map[label.toLowerCase()] ?? null;
}

function extractCity(address: string | undefined): string {
  if (!address) return '';
  const parts = address.split('\n');
  if (parts.length >= 2) {
    const cityLine = parts[parts.length - 2];
    return cityLine.split(',')[0]?.trim() ?? '';
  }
  return '';
}

function extractState(address: string | undefined): string | null {
  if (!address) return null;
  const match = address.match(/,\s*([A-Z]{2})\s+\d{5}/);
  return match?.[1] ?? null;
}
