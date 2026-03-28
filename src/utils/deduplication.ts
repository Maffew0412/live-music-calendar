import type { UnifiedEvent } from '../types/event';

// Priority: ticketmaster > predicthq > bandsintown
const SOURCE_PRIORITY: Record<string, number> = {
  ticketmaster: 3,
  predicthq: 2,
  bandsintown: 1,
};

function eventKey(event: UnifiedEvent): string {
  return `${event.artistName.toLowerCase().trim()}|${event.localDate}|${event.venue.city.toLowerCase().trim()}`;
}

function priority(event: UnifiedEvent): number {
  return SOURCE_PRIORITY[event.source] ?? 0;
}

export function deduplicateEvents(events: UnifiedEvent[]): UnifiedEvent[] {
  const seen = new Map<string, UnifiedEvent>();

  for (const event of events) {
    const key = eventKey(event);
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, event);
    } else if (priority(event) > priority(existing)) {
      // Higher-priority source wins, but keep ticket URL from the other if missing
      const merged = { ...event };
      if (!merged.ticketUrl && existing.ticketUrl) {
        merged.ticketUrl = existing.ticketUrl;
      }
      if (merged.genres.length === 0 && existing.genres.length > 0) {
        merged.genres = existing.genres;
      }
      seen.set(key, merged);
    } else {
      // Existing has higher priority — enrich it
      if (!existing.ticketUrl && event.ticketUrl) {
        seen.set(key, { ...existing, ticketUrl: event.ticketUrl });
      }
    }
  }

  return Array.from(seen.values());
}
