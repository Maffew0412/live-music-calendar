import { useFilters } from '../../hooks/useFilters';

export function ViewToggle() {
  const { filters, dispatch } = useFilters();

  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
      <button
        onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'list' })}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          filters.viewMode === 'list'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        List
      </button>
      <button
        onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'map' })}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          filters.viewMode === 'map'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        Map
      </button>
    </div>
  );
}
