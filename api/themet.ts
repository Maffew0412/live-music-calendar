import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ParsedEvent {
  title: string;
  url: string;
  date: string;
  time: string;
  price: string;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const response = await fetch('https://themetri.com/events/');
    const html = await response.text();

    const events = parseTheMetHTML(html);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json({ events });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch The Met events' });
  }
}

function parseTheMetHTML(html: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];

  // The Met uses RHP Events plugin.
  // Structure: <a id="eventTitle" class="url" href="..."><h2 class="...">TITLE</h2></a>
  // The title anchor wraps an <h2>, so [^<]+ won't match. Use title attribute instead.
  // Pattern: <a id = "eventTitle" class="url" href="URL" title="TITLE" rel="bookmark">
  const eventBlockRegex = /<a\s+id\s*=\s*"eventTitle"\s+class="url"\s+href="(https:\/\/themetri\.com\/event\/[^"]+)"\s+title="([^"]+)"/gi;

  // Dates are formatted as "Saturday, April 25" (no year) inside id="eventDate" divs.
  // Month separators like "April 2026" appear before event blocks.
  // We track the current year/month from those separators.
  const months: Record<string, string> = {
    january: '01', february: '02', march: '03', april: '04',
    may: '05', june: '06', july: '07', august: '08',
    september: '09', october: '10', november: '11', december: '12',
  };

  // Pre-collect month+year separators and their positions in the HTML.
  // Format: <span class='rhp-events-list-separator-month ...'><span>April 2026</span></span>
  const separatorRegex = /<span[^>]*rhp-events-list-separator-month[^>]*>[\s\S]*?<span>([A-Za-z]+)\s+(\d{4})<\/span>/gi;
  const separators: Array<{ index: number; month: string; year: string }> = [];
  let sepMatch;
  while ((sepMatch = separatorRegex.exec(html)) !== null) {
    const monthKey = sepMatch[1].toLowerCase();
    const m = months[monthKey];
    if (m) {
      separators.push({ index: sepMatch.index, month: m, year: sepMatch[2] });
    }
  }

  const seen = new Set<string>();
  let match;
  while ((match = eventBlockRegex.exec(html)) !== null) {
    const url = match[1];
    // title attribute may contain HTML entities — decode common ones
    const rawTitle = match[2]
      .replace(/&amp;/g, '&')
      .replace(/&#8211;/g, '–')
      .replace(/&#8217;/g, "'")
      .replace(/&lt;br&gt;/gi, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();

    if (seen.has(url)) continue;
    seen.add(url);

    // Determine which month/year separator precedes this match
    let currentMonth = '';
    let currentYear = String(new Date().getFullYear());
    for (const sep of separators) {
      if (sep.index <= match.index) {
        currentMonth = sep.month;
        currentYear = sep.year;
      } else {
        break;
      }
    }

    // Look for date in nearby context
    const context = html.slice(Math.max(0, match.index - 2000), match.index + 2000);

    // Date format in HTML: "Saturday, April 25" or "Friday, May 01"
    const dateMatch = context.match(
      /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+([A-Za-z]+)\s+(\d{1,2})/i
    );

    const timeMatch = context.match(/(?:Doors?|Show):?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i) ||
                      context.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);

    const priceMatch = context.match(/\$(\d+)/);

    let date = '';
    if (dateMatch) {
      const monthKey = dateMatch[1].toLowerCase();
      const eventMonth = months[monthKey] || currentMonth;
      const day = dateMatch[2].padStart(2, '0');
      // Use the year from the nearest preceding month separator
      let year = currentYear;
      // If the event month is earlier than the separator month, it's the next year
      if (eventMonth && currentMonth && parseInt(eventMonth) < parseInt(currentMonth)) {
        year = String(parseInt(currentYear) + 1);
      }
      date = `${year}-${eventMonth}-${day}`;
    } else if (currentMonth) {
      // Fallback: no date found in context but we know the month
      date = `${currentYear}-${currentMonth}-01`;
    }

    let time = '';
    if (timeMatch) {
      let h = parseInt(timeMatch[1]);
      const min = timeMatch[2] || '00';
      const ampm = (timeMatch[3] || '').toUpperCase();
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      time = `${String(h).padStart(2, '0')}:${min}`;
    }

    if (!date) continue;

    events.push({
      title: rawTitle,
      url,
      date,
      time: time || '20:00',
      price: priceMatch ? `$${priceMatch[1]}` : '',
    });
  }

  return events;
}
