import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = new URL('https://nominatim.openstreetmap.org/search');

  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string') {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': 'LiveMusicCalendar/1.0' },
  });
  const data = await response.json();

  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
  res.status(response.status).json(data);
}
