import type { UnifiedEvent } from '../../types/event';
import { GenreBadge } from '../ui/GenreBadge';
import { formatEventDate, formatEventTime } from '../../utils/dateFormatting';

export function EventCard({ event }: { event: UnifiedEvent }) {
  return (
    <div className="group flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      {/* Accent left border */}
      <div className="w-1 flex-shrink-0 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500" />

      {/* Artist image */}
      {event.artistImageUrl ? (
        <div className="hidden w-36 flex-shrink-0 sm:block">
          <img
            src={event.artistImageUrl}
            alt={event.artistName}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="hidden w-36 flex-shrink-0 items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-900 sm:flex">
          <span className="text-3xl text-purple-300/50">&#9835;</span>
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

        <p className="text-sm text-gray-500">
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
              className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-md"
            >
              Get Tickets
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
