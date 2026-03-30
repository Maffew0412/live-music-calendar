import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ParsedEvent {
  title: string;
  url: string;
  date: string;
  time: string;
  genre: string;
  price: string;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const response = await fetch('https://www.castletheatre.com/events/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)' },
    });
    const html = await response.text();
    const events = parseCastleHTML(html);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json({ events });
  } catch {
    res.status(500).json({ error: 'Failed to fetch Castle Theatre events' });
  }
}

function parseCastleHTML(html: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const seen = new Set<string>();

  // Try The Events Calendar (WordPress plugin) format
  // Matches event links like /event/artist-name/
  const eventLinkRegex = /<a[^>]+href="(https?:\/\/(?:www\.)?castletheatre\.com\/event\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;

  let match;
  while ((match = eventLinkRegex.exec(html)) !== null) {
    const url = match[1];
    const rawTitle = match[2].trim();

    // Skip navigation/meta links
    if (!rawTitle || rawTitle.length < 3 || rawTitle.toLowerCase().includes('event')) continue;

    const key = rawTitle.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    // Look for date in surrounding context
    const contextStart = Math.max(0, match.index - 200);
    const contextEnd = Math.min(html.length, match.index + match[0].length + 600);
    const context = html.slice(contextStart, contextEnd);

    const dateMatch = context.match(
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s*(\d{4})/i
    );

    if (!dateMatch) continue;

    const months: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04',
      may: '05', june: '06', july: '07', august: '08',
      september: '09', october: '10', november: '11', december: '12',
    };
    const month = months[dateMatch[1].toLowerCase()];
    if (!month) continue;

    const date = `${dateMatch[3]}-${month}-${dateMatch[2].padStart(2, '0')}`;

    const timeMatch = context.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
    let time = '20:00';
    if (timeMatch) {
      let h = parseInt(timeMatch[1]);
      const ampm = timeMatch[3].toUpperCase();
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      time = `${String(h).padStart(2, '0')}:${timeMatch[2] ?? '00'}`;
    }

    const priceMatch = context.match(/\$(\d+(?:\.\d{2})?)/);
    const price = priceMatch ? `$${priceMatch[1]}` : '';

    events.push({ title: rawTitle, url, date, time, genre: '', price });
  }

  return events;
}
