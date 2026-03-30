import type { CityKey } from '../config/constants';

export interface SearchFilters {
  activeCity: CityKey;
  location: string;
  coordinates: { lat: number; lng: number } | null;
  postalCode: string | null;
  radius: number;
  genres: string[];
  excludedVenues: string[];
  dateRange: { start: string; end: string } | null;
  viewMode: 'list' | 'map';
  page: number;
}

export type FilterAction =
  | { type: 'SET_CITY'; payload: CityKey }
  | { type: 'SET_LOCATION'; payload: { location: string; coordinates?: { lat: number; lng: number } | null; postalCode?: string | null } }
  | { type: 'SET_RADIUS'; payload: number }
  | { type: 'TOGGLE_GENRE'; payload: string }
  | { type: 'SET_DATE_RANGE'; payload: { start: string; end: string } | null }
  | { type: 'SET_VIEW_MODE'; payload: 'list' | 'map' }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'CLEAR_GENRES' }
  | { type: 'TOGGLE_VENUE'; payload: string }
  | { type: 'SHOW_ALL_VENUES' }
  | { type: 'HIDE_ALL_VENUES'; payload: string[] };
