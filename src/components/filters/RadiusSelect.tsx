import { useFilters } from '../../hooks/useFilters';
import { RADIUS_OPTIONS } from '../../config/constants';

export function RadiusSelect() {
  const { filters, dispatch } = useFilters();

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">Radius</label>
      <select
        value={filters.radius}
        onChange={(e) => dispatch({ type: 'SET_RADIUS', payload: Number(e.target.value) })}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        {RADIUS_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {r} miles
          </option>
        ))}
      </select>
    </div>
  );
}
