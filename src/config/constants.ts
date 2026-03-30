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
    // Keep priority venues minimal — only for genuinely hard-to-find indie spots
    priorityVenues: [
      { query: 'Deep Cuts Medford', lat: 42.4179, lng: -71.1102 },
    ],
  },
  springfield: {
    label: 'Springfield',
    name: 'Springfield, IL',
    coordinates: { lat: 39.7817, lng: -89.6501 },
    postalCode: '62701',
    subtitle: 'Discover live music across Central IL & St. Louis',
    // Keep priority minimal — large venues come through TM; scrapers cover the rest
    priorityVenues: [
      { query: 'Boondocks Springfield Illinois', lat: 39.8200, lng: -89.6600 },
      { query: 'Castle Theatre Bloomington Illinois', lat: 40.4842, lng: -88.9937 },
      { query: 'The Pageant St Louis', lat: 38.6488, lng: -90.2912 },
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
