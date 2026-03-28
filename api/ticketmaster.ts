import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json');

  // Forward all query params except apikey
  for (const [key, value] of Object.entries(req.query)) {
    if (key !== 'apikey' && typeof value === 'string') {
      url.searchParams.set(key, value);
    }
  }

  // Add server-side API key
  url.searchParams.set('apikey', process.env.TICKETMASTER_API_KEY ?? '');

  const response = await fetch(url.toString());
  const data = await response.json();

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  res.status(response.status).json(data);
}
