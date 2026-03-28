import type { NominatimResult } from '../types/api';
import { nominatimLimiter } from './rateLimiter';

const isDev = import.meta.env.DEV;
const BASE_URL = isDev ? '/api/nominatim/search' : '/api/nominatim';

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
}

export async function geocodeLocation(query: string): Promise<GeocodingResult[]> {
  return nominatimLimiter.execute(async () => {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '5',
      countrycodes: 'us',
    });

    const response = await fetch(`${BASE_URL}?${params}`, {
      headers: { 'User-Agent': 'LiveMusicCalendar/1.0' },
    });

    if (!response.ok) {
      throw new Error(`Geocoding error: ${response.status}`);
    }

    const data: NominatimResult[] = await response.json();

    return data.map((r) => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      displayName: r.display_name,
    }));
  });
}

export function isZipCode(input: string): boolean {
  return /^\d{5}$/.test(input.trim());
}
