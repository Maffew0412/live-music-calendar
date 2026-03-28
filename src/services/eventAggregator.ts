import type { SearchFilters } from '../types/filters';
import type { UnifiedEvent } from '../types/event';
import { searchTicketmaster } from './ticketmaster';
import { fetchArtistEvents } from './bandsintown';
import { searchPredictHQ } from './predicthq';
import { scrapeAllVenues } from './venueScrapers';
import { deduplicateEvents } from '../utils/deduplication';

export interface SearchResult {
  events: UnifiedEvent[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
}

export async function searchEvents(filters: SearchFilters): Promise<SearchResult> {
  // Run Ticketmaster, PredictHQ, and venue scrapers in parallel
  const [tmResult, phqEvents, venueEvents] = await Promise.all([
    searchTicketmaster(filters),
    searchPredictHQ(filters).catch(() => [] as UnifiedEvent[]),
    scrapeAllVenues().catch(() => [] as UnifiedEvent[]),
  ]);

  // Supplement: Bandsintown for top unique artists (non-blocking enrichment)
  const uniqueArtists = [...new Set(tmResult.events.map((e) => e.artistName))].slice(0, 5);

  let bitEvents: UnifiedEvent[] = [];
  try {
    const bitResults = await Promise.allSettled(
      uniqueArtists.map((artist) => fetchArtistEvents(artist))
    );
    bitEvents = bitResults
      .filter((r): r is PromiseFulfilledResult<UnifiedEvent[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value);
  } catch {
    // BIT enrichment is optional — don't fail the search
  }

  // Merge all sources and deduplicate
  const allEvents = [...tmResult.events, ...phqEvents, ...bitEvents, ...venueEvents];
  const deduplicated = deduplicateEvents(allEvents);

  // Sort by date
  deduplicated.sort((a, b) => a.dateTime.localeCompare(b.dateTime));

  return {
    events: deduplicated,
    totalPages: tmResult.totalPages,
    totalElements: Math.max(tmResult.totalElements, deduplicated.length),
    currentPage: tmResult.currentPage,
  };
}
