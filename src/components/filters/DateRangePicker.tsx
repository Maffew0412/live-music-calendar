import { useFilters } from '../../hooks/useFilters';

export function DateRangePicker() {
  const { filters, dispatch } = useFilters();

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex items-end gap-2">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">From</label>
        <input
          type="date"
          min={today}
          value={filters.dateRange?.start ?? ''}
          onChange={(e) => {
            const start = e.target.value;
            if (!start) {
              dispatch({ type: 'SET_DATE_RANGE', payload: null });
              return;
            }
            dispatch({
              type: 'SET_DATE_RANGE',
              payload: { start, end: filters.dateRange?.end ?? start },
            });
          }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">To</label>
        <input
          type="date"
          min={filters.dateRange?.start ?? today}
          value={filters.dateRange?.end ?? ''}
          onChange={(e) => {
            const end = e.target.value;
            if (!end) {
              dispatch({ type: 'SET_DATE_RANGE', payload: null });
              return;
            }
            dispatch({
              type: 'SET_DATE_RANGE',
              payload: { start: filters.dateRange?.start ?? today, end },
            });
          }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      {filters.dateRange && (
        <button
          onClick={() => dispatch({ type: 'SET_DATE_RANGE', payload: null })}
          className="rounded-lg px-2 py-2 text-xs text-gray-500 hover:text-gray-700"
        >
          Clear
        </button>
      )}
    </div>
  );
}
