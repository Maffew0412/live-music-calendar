export const GENRES = [
  'Rock',
  'Pop',
  'Hip-Hop/Rap',
  'R&B',
  'Jazz',
  'Blues',
  'Country',
  'Electronic',
  'Folk',
  'Metal',
  'Punk',
  'Alternative',
  'Indie',
  'Classical',
  'Latin',
  'Reggae',
  'World',
] as const;

export const RADIUS_OPTIONS = [10, 25, 50, 100] as const;

export const CITY_PROFILES = {
  boston: {
    label: 'Boston',
    name: 'Boston, MA',
    coordinates: { lat: 42.3601, lng: -71.0589 },
    postalCode: '02101',
    subtitle: 'Discover live music across Greater Boston',
    priorityVenues: [
      { query: 'Deep Cuts', lat: 42.4179, lng: -71.1102 },
      { query: 'City Winery', lat: 42.364381, lng: -71.0586485 },
      { query: 'Royale Boston', lat: 42.3566466, lng: -71.1439322 },
    ],
  },
  springfield: {
    label: 'Springfield',
    name: 'Springfield, IL',
    coordinates: { lat: 39.7817, lng: -89.6501 },
    postalCode: '62701',
    subtitle: 'Discover live music across Central IL & St. Louis',
    priorityVenues: [
      { query: 'Castle Theatre Bloomington', lat: 40.4842, lng: -88.9937 },
      { query: 'Canopy Club Champaign', lat: 40.1164, lng: -88.2434 },
      { query: 'Delmar Hall St Louis', lat: 38.6544, lng: -90.2897 },
    ],
  },
} as const;

export type CityKey = keyof typeof CITY_PROFILES;

// Backward-compat aliases
export const DEFAULT_LOCATION = CITY_PROFILES.boston;
export const BOSTON_COORDS = CITY_PROFILES.boston.coordinates;

export const ZOOM_FOR_RADIUS: Record<number, number> = {
  10: 12,
  25: 11,
  50: 10,
  100: 8,
};

export const TM_PAGE_SIZE = 50;
