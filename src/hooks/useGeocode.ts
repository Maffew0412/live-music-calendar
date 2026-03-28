import { useQuery } from '@tanstack/react-query';
import { geocodeLocation } from '../services/geocoding';

export function useGeocode(query: string) {
  return useQuery({
    queryKey: ['geocode', query],
    queryFn: () => geocodeLocation(query),
    enabled: query.length > 2,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 1,
  });
}
