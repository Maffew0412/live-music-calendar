import { useFilters } from '../../hooks/useFilters';

export function ViewToggle() {
  const { filters, dispatch } = useFilters();

  return (
    <div className="inline-flex rounded-lg border border-white/20 bg-white/10 p-0.5 backdrop-blur-sm">
      <button
        onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'list' })}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          filters.viewMode === 'list'
            ? 'bg-white text-indigo-900 shadow-sm'
            : 'text-indigo-200 hover:text-white'
        }`}
      >
        List
      </button>
      <button
        onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'map' })}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          filters.viewMode === 'map'
            ? 'bg-white text-indigo-900 shadow-sm'
            : 'text-indigo-200 hover:text-white'
        }`}
      >
        Map
      </button>
    </div>
  );
}
