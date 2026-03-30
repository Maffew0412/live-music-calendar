import { createContext, useReducer, type ReactNode } from 'react';
import type { SearchFilters, FilterAction } from '../types/filters';
import { CITY_PROFILES, type CityKey } from '../config/constants';

function cityDefaults(city: CityKey): Pick<SearchFilters, 'activeCity' | 'location' | 'coordinates' | 'postalCode'> {
  const profile = CITY_PROFILES[city];
  return {
    activeCity: city,
    location: profile.name,
    coordinates: profile.coordinates,
    postalCode: profile.postalCode,
  };
}

const initialFilters: SearchFilters = {
  ...cityDefaults('boston'),
  radius: 100,
  genres: [],
  excludedVenues: [],
  dateRange: null,
  viewMode: 'list',
  page: 0,
};

function filterReducer(state: SearchFilters, action: FilterAction): SearchFilters {
  switch (action.type) {
    case 'SET_CITY': {
      return {
        ...state,
        ...cityDefaults(action.payload),
        genres: [],
        excludedVenues: [],
        dateRange: null,
        page: 0,
      };
    }
    case 'SET_LOCATION':
      return {
        ...state,
        location: action.payload.location,
        coordinates: action.payload.coordinates ?? state.coordinates,
        postalCode: action.payload.postalCode ?? null,
        page: 0,
      };
    case 'SET_RADIUS':
      return { ...state, radius: action.payload, page: 0 };
    case 'TOGGLE_GENRE': {
      const genre = action.payload;
      const genres = state.genres.includes(genre)
        ? state.genres.filter((g) => g !== genre)
        : [...state.genres, genre];
      return { ...state, genres, page: 0 };
    }
    case 'CLEAR_GENRES':
      return { ...state, genres: [], page: 0 };
    case 'SET_DATE_RANGE':
      return { ...state, dateRange: action.payload, page: 0 };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    case 'SET_PAGE':
      return { ...state, page: action.payload };
    case 'TOGGLE_VENUE': {
      const venue = action.payload;
      const excludedVenues = state.excludedVenues.includes(venue)
        ? state.excludedVenues.filter((v) => v !== venue)
        : [...state.excludedVenues, venue];
      return { ...state, excludedVenues };
    }
    case 'SHOW_ALL_VENUES':
      return { ...state, excludedVenues: [] };
    case 'HIDE_ALL_VENUES':
      return { ...state, excludedVenues: action.payload };
    default:
      return state;
  }
}

export const FilterContext = createContext<{
  filters: SearchFilters;
  dispatch: React.Dispatch<FilterAction>;
}>({
  filters: initialFilters,
  dispatch: () => {},
});

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, dispatch] = useReducer(filterReducer, initialFilters);

  return (
    <FilterContext.Provider value={{ filters, dispatch }}>
      {children}
    </FilterContext.Provider>
  );
}
