import { useState, useRef, useEffect } from 'react';
import { useGeocode } from '../../hooks/useGeocode';
import { useFilters } from '../../hooks/useFilters';
import { isZipCode, geocodeLocation } from '../../services/geocoding';

export function LocationInput() {
  const { filters, dispatch } = useFilters();
  const [input, setInput] = useState(filters.location);
  const [debouncedInput, setDebouncedInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { data: suggestions } = useGeocode(debouncedInput);

  // Sync input field when city toggle changes the filter location
  useEffect(() => {
    setInput(filters.location);
  }, [filters.location]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (input.length > 2 && !isZipCode(input)) {
        setDebouncedInput(input);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSubmit() {
    const trimmed = input.trim();
    if (isZipCode(trimmed)) {
      // Geocode zip to get coordinates (TM works better with latlong)
      try {
        const results = await geocodeLocation(trimmed);
        if (results.length > 0) {
          dispatch({
            type: 'SET_LOCATION',
            payload: {
              location: trimmed,
              coordinates: { lat: results[0].lat, lng: results[0].lng },
              postalCode: trimmed,
            },
          });
        }
      } catch {
        // Fallback to postal code only
        dispatch({
          type: 'SET_LOCATION',
          payload: { location: trimmed, postalCode: trimmed, coordinates: null },
        });
      }
      setShowDropdown(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-1 block text-xs font-medium text-gray-500">Location</label>
      <input
        type="text"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setShowDropdown(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
        }}
        placeholder="City or ZIP code"
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      {showDropdown && suggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {suggestions.map((s, i) => (
            <li
              key={i}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-indigo-50"
              onClick={() => {
                const shortName = s.displayName.split(',').slice(0, 2).join(',').trim();
                setInput(shortName);
                dispatch({
                  type: 'SET_LOCATION',
                  payload: {
                    location: shortName,
                    coordinates: { lat: s.lat, lng: s.lng },
                    postalCode: null,
                  },
                });
                setShowDropdown(false);
              }}
            >
              {s.displayName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
