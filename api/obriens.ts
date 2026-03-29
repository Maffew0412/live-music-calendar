import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ParsedEvent {
  title: string;
  url: string;
  date: string;
  time: string;
  genre: string;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const response = await fetch('https://obrienspubboston.com/');
    const html = await response.text();

    const events = parseOBriensHTML(html);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json({ events });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch O\'Brien\'s events' });
  }
}

function parseOBriensHTML(html: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];

  // Match event entries: title with link + date excerpt
  const entryRegex = /<a href="(https:\/\/obrienspubboston\.com\/show\/[^"]+)"[^>]*>([^<]+)<\/a>.*?<p>([^<]+)<\/p>/gs;

  const seen = new Set<string>();
  let match;
  while ((match = entryRegex.exec(html)) !== null) {
    const url = match[1];
    const title = match[2].trim();
    const excerpt = match[3].trim();

    // Deduplicate
    const key = `${title}|${excerpt}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Parse date from excerpt like "Sunday, March 29 7PM 21+"
    const dateMatch = excerpt.match(
      /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(?:(\d{4})\s*,?\s*)?(\d{1,2})\s*(AM|PM)/i
    );
    if (!dateMatch) continue;

    const monthName = dateMatch[1];
    const day = dateMatch[2];
    const year = dateMatch[3] || '2026';
    const hour = dateMatch[4];
    const ampm = dateMatch[5];

    const months: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04',
      may: '05', june: '06', july: '07', august: '08',
      september: '09', october: '10', november: '11', december: '12',
    };
    const month = months[monthName.toLowerCase()];
    if (!month) continue;

    let h = parseInt(hour);
    if (ampm.toUpperCase() === 'PM' && h !== 12) h += 12;
    if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;

    const date = `${year}-${month}-${day.padStart(2, '0')}`;
    const time = `${String(h).padStart(2, '0')}:00`;

    // Extract genre from nearby category link
    let genre = '';
    const genreMatch = html.slice(Math.max(0, match.index - 500), match.index + match[0].length + 500)
      .match(/genre\/([^/"]+)/);
    if (genreMatch) {
      genre = genreMatch[1].replace(/-/g, '/').replace(/\b\w/g, c => c.toUpperCase());
    }

    events.push({ title, url, date, time, genre });
  }

  return events;
}
