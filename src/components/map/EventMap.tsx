import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import { useEventSearch } from '../../hooks/useEventSearch';
import { useFilters } from '../../hooks/useFilters';
import { BOSTON_COORDS, ZOOM_FOR_RADIUS } from '../../config/constants';
import { EventMarker } from './EventMarker';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';

function MapUpdater() {
  const map = useMap();
  const { filters } = useFilters();

  useEffect(() => {
    const center = filters.coordinates ?? BOSTON_COORDS;
    const zoom = ZOOM_FOR_RADIUS[filters.radius] ?? 10;
    map.setView([center.lat, center.lng], zoom);
  }, [map, filters.coordinates, filters.radius]);

  return null;
}

export function EventMap() {
  const { data, isLoading, isError, error } = useEventSearch();
  const { filters } = useFilters();

  const center = filters.coordinates ?? BOSTON_COORDS;
  const zoom = ZOOM_FOR_RADIUS[filters.radius] ?? 10;

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorMessage message={error?.message ?? 'Failed to load events'} />;

  const eventsWithCoords = (data?.events ?? []).filter(
    (e) =>
      e.venue.latitude != null &&
      e.venue.longitude != null &&
      !filters.excludedVenues.includes(e.venue.name)
  );

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <MapContainer
        center={[center.lat, center.lng] as [number, number]}
        zoom={zoom}
        className="h-[calc(100vh-280px)] w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater />
        {eventsWithCoords.map((event) => (
          <EventMarker key={event.id} event={event} />
        ))}
      </MapContainer>
      <div className="bg-white px-4 py-2 text-sm text-gray-500">
        {eventsWithCoords.length} events on map
        {data && eventsWithCoords.length < data.events.length && (
          <span> ({data.events.length - eventsWithCoords.length} without location data)</span>
        )}
      </div>
    </div>
  );
}
