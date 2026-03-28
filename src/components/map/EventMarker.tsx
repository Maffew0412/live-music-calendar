import { Marker, Popup } from 'react-leaflet';
import type { UnifiedEvent } from '../../types/event';
import { formatEventDate, formatEventTime } from '../../utils/dateFormatting';

export function EventMarker({ event }: { event: UnifiedEvent }) {
  if (event.venue.latitude == null || event.venue.longitude == null) return null;

  return (
    <Marker position={[event.venue.latitude, event.venue.longitude]}>
      <Popup>
        <div className="min-w-48">
          <p className="font-semibold">{event.artistName}</p>
          <p className="text-sm text-gray-600">{event.venue.name}</p>
          <p className="text-sm text-indigo-600">
            {formatEventDate(event.localDate)} &bull; {formatEventTime(event.localTime)}
          </p>
          {event.ticketUrl && (
            <a
              href={event.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm text-indigo-600 underline"
            >
              Get Tickets
            </a>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
