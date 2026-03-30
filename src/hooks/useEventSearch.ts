import { useQuery } from '@tanstack/react-query';
import { searchEvents } from '../services/eventAggregator';
import { useFilters } from './useFilters';

export function useEventSearch() {
  const { filters } = useFilters();

  return useQuery({
    queryKey: ['events', filters.activeCity, filters.location, filters.radius, filters.genres, filters.dateRange, filters.page],
    queryFn: () => searchEvents(filters),
    enabled: !!(filters.coordinates || filters.postalCode),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
