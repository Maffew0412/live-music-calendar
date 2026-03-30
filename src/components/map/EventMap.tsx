import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix default marker icons not loading in production builds
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
import { useEventSearch } from '../../hooks/useEventSearch';
import { useFilters } from '../../hooks/useFilters';
import { CITY_PROFILES, ZOOM_FOR_RADIUS } from '../../config/constants';
import { EventMarker } from './EventMarker';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';

function MapUpdater() {
  const map = useMap();
  const { filters } = useFilters();

  useEffect(() => {
    const fallback = CITY_PROFILES[filters.activeCity].coordinates;
    const center = filters.coordinates ?? fallback;
    const zoom = ZOOM_FOR_RADIUS[filters.radius] ?? 10;
    map.setView([center.lat, center.lng], zoom);
  }, [map, filters.coordinates, filters.radius, filters.activeCity]);

  return null;
}

export function EventMap() {
  const { data, isLoading, isError, error } = useEventSearch();
  const { filters } = useFilters();

  const fallback = CITY_PROFILES[filters.activeCity].coordinates;
  const center = filters.coordinates ?? fallback;
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
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <MapContainer
        {...{
          center: [center.lat, center.lng] as [number, number],
          zoom,
          className: "h-[calc(100vh-280px)] w-full",
          scrollWheelZoom: true,
        } as any}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <TileLayer
          {...{
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          } as any}
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
