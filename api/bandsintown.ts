import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { artist, ...rest } = req.query;
  if (!artist || typeof artist !== 'string') {
    return res.status(400).json({ error: 'artist parameter required' });
  }

  const url = new URL(`https://rest.bandsintown.com/artists/${encodeURIComponent(artist)}/events`);
  url.searchParams.set('app_id', process.env.BANDSINTOWN_APP_ID ?? 'live-music-calendar');
  for (const [key, value] of Object.entries(rest)) {
    if (typeof value === 'string') {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString());
  const data = await response.json();

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  res.status(response.status).json(data);
}
