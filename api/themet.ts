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

  // The Met uses RHP Events plugin - look for event links and dates
  // Pattern: event title in h2/h3 tags with links, dates nearby
  const eventBlockRegex = /<a[^>]*href="(https:\/\/themetri\.com\/event\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;

  const seen = new Set<string>();
  let match;
  while ((match = eventBlockRegex.exec(html)) !== null) {
    const url = match[1];
    const title = match[2].trim();

    if (seen.has(title)) continue;
    seen.add(title);

    // Look for date near this match
    const context = html.slice(match.index, match.index + 1000);

    const dateMatch = context.match(
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4}/i
    ) || context.match(
      /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/
    );

    const timeMatch = context.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i) ||
                      context.match(/Doors?:?\s*(\d{1,2})\s*(am|pm)/i);

    const priceMatch = context.match(/\$(\d+)/);

    let date = '';
    if (dateMatch) {
      const dateStr = dateMatch[0];
      const fullMatch = dateStr.match(
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})/i
      );
      if (fullMatch) {
        const months: Record<string, string> = {
          january: '01', february: '02', march: '03', april: '04',
          may: '05', june: '06', july: '07', august: '08',
          september: '09', october: '10', november: '11', december: '12',
        };
        const m = months[fullMatch[1].toLowerCase()];
        if (m) {
          date = `${fullMatch[3]}-${m}-${fullMatch[2].padStart(2, '0')}`;
        }
      }
    }

    let time = '';
    if (timeMatch) {
      let h = parseInt(timeMatch[1]);
      const ampm = (timeMatch[3] || timeMatch[2] || '').toUpperCase();
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      time = `${String(h).padStart(2, '0')}:00`;
    }

    if (!date) continue;

    events.push({
      title,
      url,
      date,
      time: time || '20:00',
      price: priceMatch ? `$${priceMatch[1]}` : '',
    });
  }

  return events;
}
