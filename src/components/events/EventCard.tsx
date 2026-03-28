import type { UnifiedEvent } from '../../types/event';
import { GenreBadge } from '../ui/GenreBadge';
import { formatEventDate, formatEventTime } from '../../utils/dateFormatting';

export function EventCard({ event }: { event: UnifiedEvent }) {
  return (
    <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Artist image */}
      {event.artistImageUrl ? (
        <div className="hidden w-40 flex-shrink-0 sm:block">
          <img
            src={event.artistImageUrl}
            alt={event.artistName}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="hidden w-40 flex-shrink-0 items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 sm:flex">
          <span className="text-3xl text-indigo-300">&#9835;</span>
        </div>
      )}

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="truncate text-base font-semibold text-gray-900">{event.artistName}</h3>
          {event.status === 'cancelled' && (
            <span className="flex-shrink-0 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              Cancelled
            </span>
          )}
        </div>

        <p className="text-sm text-gray-600">
          {event.venue.name}
          {event.venue.city && ` \u2022 ${event.venue.city}`}
          {event.venue.state && `, ${event.venue.state}`}
        </p>

        <p className="mt-1 text-sm font-medium text-indigo-600">
          {formatEventDate(event.localDate)} \u2022 {formatEventTime(event.localTime)}
        </p>

        {/* Genres */}
        {event.genres.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {event.genres.slice(0, 3).map((g) => (
              <GenreBadge key={g} genre={g} />
            ))}
          </div>
        )}

        {/* Bottom row: price + ticket link */}
        <div className="mt-auto flex items-center justify-between pt-3">
          {event.priceRange ? (
            <span className="text-xs text-gray-500">
              ${event.priceRange.min} &ndash; ${event.priceRange.max}
            </span>
          ) : (
            <span />
          )}
          {event.ticketUrl && (
            <a
              href={event.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Get Tickets
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
