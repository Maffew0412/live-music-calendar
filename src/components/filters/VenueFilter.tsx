import { useState, useMemo } from 'react';
import { useEventSearch } from '../../hooks/useEventSearch';
import { useFilters } from '../../hooks/useFilters';

export function VenueFilter() {
  const { data } = useEventSearch();
  const { filters, dispatch } = useFilters();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(false);

  // Extract unique venues sorted by event count
  const venues = useMemo(() => {
    if (!data?.events) return [];
    const counts = new Map<string, number>();
    for (const event of data.events) {
      const name = event.venue.name;
      if (name && name !== 'Unknown Venue') {
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [data?.events]);

  const filtered = useMemo(() => {
    if (!search) return venues;
    const q = search.toLowerCase();
    return venues.filter((v) => v.name.toLowerCase().includes(q));
  }, [venues, search]);

  if (venues.length === 0) return null;

  const displayedVenues = expanded ? filtered : filtered.slice(0, 10);
  const excludedCount = filters.excludedVenues.length;

  return (
    <div className="border-t border-gray-200 pt-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">
            Venues ({venues.length})
          </label>
          {excludedCount > 0 && (
            <span className="text-xs text-indigo-600">
              {excludedCount} hidden
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {excludedCount > 0 && (
            <button
              onClick={() => dispatch({ type: 'SHOW_ALL_VENUES' })}
              className="text-xs text-indigo-600 hover:text-indigo-800"
            >
              Show All
            </button>
          )}
          <button
            onClick={() =>
              dispatch({
                type: 'HIDE_ALL_VENUES',
                payload: venues.map((v) => v.name),
              })
            }
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Hide All
          </button>
        </div>
      </div>

      {venues.length > 10 && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search venues..."
          className="mb-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      )}

      <div className="flex flex-wrap gap-1.5">
        {displayedVenues.map((v) => {
          const excluded = filters.excludedVenues.includes(v.name);
          return (
            <button
              key={v.name}
              onClick={() => dispatch({ type: 'TOGGLE_VENUE', payload: v.name })}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                excluded
                  ? 'bg-gray-100 text-gray-400 line-through'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
              title={`${v.count} event${v.count > 1 ? 's' : ''}`}
            >
              {v.name}
              <span className="ml-1 text-[10px] opacity-60">{v.count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length > 10 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-indigo-600 hover:text-indigo-800"
        >
          {expanded ? 'Show less' : `Show all ${filtered.length} venues`}
        </button>
      )}
    </div>
  );
}
