import { useFilters } from '../../hooks/useFilters';
import { GENRES } from '../../config/constants';

export function GenreFilter() {
  const { filters, dispatch } = useFilters();

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <label className="text-xs font-medium text-gray-500">Genres</label>
        {filters.genres.length > 0 && (
          <button
            onClick={() => dispatch({ type: 'CLEAR_GENRES' })}
            className="text-xs text-indigo-600 hover:text-indigo-800"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {GENRES.map((genre) => {
          const active = filters.genres.includes(genre);
          return (
            <button
              key={genre}
              onClick={() => dispatch({ type: 'TOGGLE_GENRE', payload: genre })}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {genre}
            </button>
          );
        })}
      </div>
    </div>
  );
}
