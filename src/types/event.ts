export interface UnifiedEvent {
  id: string;
  source: 'ticketmaster' | 'bandsintown' | 'predicthq' | 'venue-scraper';
  name: string;
  artistName: string;
  artistImageUrl: string | null;
  venue: Venue;
  dateTime: string; // ISO 8601
  localDate: string; // YYYY-MM-DD
  localTime: string | null; // HH:mm
  genres: string[];
  ticketUrl: string | null;
  priceRange: { min: number; max: number; currency: string } | null;
  status: 'onsale' | 'offsale' | 'cancelled' | 'unknown';
}

export interface Venue {
  name: string;
  city: string;
  state: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}
