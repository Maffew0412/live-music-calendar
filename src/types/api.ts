// Ticketmaster Discovery API response types

export interface TMSearchResponse {
  _embedded?: {
    events: TMEvent[];
  };
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

export interface TMEvent {
  id: string;
  name: string;
  url: string;
  images: TMImage[];
  dates: {
    start: {
      localDate: string;
      localTime?: string;
      dateTime?: string;
    };
    status: {
      code: string;
    };
  };
  priceRanges?: {
    type: string;
    currency: string;
    min: number;
    max: number;
  }[];
  classifications?: TMClassification[];
  _embedded?: {
    venues?: TMVenue[];
    attractions?: TMAttraction[];
  };
}

export interface TMImage {
  ratio?: string;
  url: string;
  width: number;
  height: number;
}

export interface TMClassification {
  genre?: { name: string };
  subGenre?: { name: string };
  segment?: { name: string };
}

export interface TMVenue {
  name: string;
  city?: { name: string };
  state?: { stateCode: string };
  country?: { countryCode: string };
  address?: { line1: string };
  location?: {
    latitude: string;
    longitude: string;
  };
}

export interface TMAttraction {
  name: string;
  images?: TMImage[];
}

// Bandsintown API response types

export interface BITEvent {
  id: string;
  artist_id: string;
  url: string;
  datetime: string;
  title: string;
  description: string;
  lineup: string[];
  venue: BITVenue;
  offers: BITOffer[];
}

export interface BITVenue {
  name: string;
  city: string;
  region: string;
  country: string;
  latitude: string;
  longitude: string;
}

export interface BITOffer {
  type: string;
  url: string;
  status: string;
}

// PredictHQ API response types

export interface PHQSearchResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PHQEvent[];
}

export interface PHQEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  start: string; // ISO 8601 UTC
  end: string;
  start_local: string; // local time ISO
  end_local: string;
  timezone: string;
  country: string;
  geo: {
    geometry: {
      type: string;
      coordinates: [number, number]; // [longitude, latitude]
    };
    address?: {
      country_code: string;
      formatted_address: string;
      postcode: string;
      locality: string;
      region: string;
    };
  };
  entities: PHQEntity[];
  phq_labels: PHQLabel[];
  rank: number;
  local_rank: number;
  phq_attendance: number | null;
  state: string;
}

export interface PHQEntity {
  entity_id: string;
  type: 'venue' | 'person' | 'event-group';
  name: string;
  formatted_address?: string;
}

export interface PHQLabel {
  label: string;
  weight: number;
}

// Nominatim geocoding response

export interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  type: string;
}
