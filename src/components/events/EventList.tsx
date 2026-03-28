import { useMemo } from 'react';
import { useEventSearch } from '../../hooks/useEventSearch';
import { useFilters } from '../../hooks/useFilters';
import { EventCard } from './EventCard';
import { EventCardSkeleton } from './EventCardSkeleton';
import { ErrorMessage } from '../ui/ErrorMessage';

export function EventList() {
  const { data, isLoading, isError, error } = useEventSearch();
  const { filters, dispatch } = useFilters();

  const filteredEvents = useMemo(() => {
    if (!data?.events || filters.excludedVenues.length === 0) return data?.events ?? [];
    return data.events.filter((e) => !filters.excludedVenues.includes(e.venue.name));
  }, [data?.events, filters.excludedVenues]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return <ErrorMessage message={error?.message ?? 'Failed to load events'} />;
  }

  if (!data || data.events.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg text-gray-500">No events found</p>
        <p className="mt-1 text-sm text-gray-400">Try adjusting your filters or expanding the radius</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        Showing {filteredEvents.length} of {data.events.length} events
        {filters.excludedVenues.length > 0 && (
          <span className="text-indigo-600"> ({filters.excludedVenues.length} venues hidden)</span>
        )}
      </p>

      <div className="space-y-4">
        {filteredEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            disabled={filters.page === 0}
            onClick={() => dispatch({ type: 'SET_PAGE', payload: filters.page - 1 })}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-40 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {filters.page + 1} of {data.totalPages}
          </span>
          <button
            disabled={filters.page >= data.totalPages - 1}
            onClick={() => dispatch({ type: 'SET_PAGE', payload: filters.page + 1 })}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
