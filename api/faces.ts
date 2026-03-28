import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = new URL('https://www.facesbrewing.com/events');

  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string') {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString());
  const data = await response.json();

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  res.status(response.status).json(data);
}
