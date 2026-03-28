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

export const DEFAULT_LOCATION = {
  name: 'Boston, MA',
  coordinates: { lat: 42.3601, lng: -71.0589 },
  postalCode: '02101',
};

export const BOSTON_COORDS = { lat: 42.3601, lng: -71.0589 };

export const ZOOM_FOR_RADIUS: Record<number, number> = {
  10: 12,
  25: 11,
  50: 10,
  100: 8,
};

export const TM_PAGE_SIZE = 50;
