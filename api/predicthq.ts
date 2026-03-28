import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = new URL('https://api.predicthq.com/v1/events/');

  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string') {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.PREDICTHQ_TOKEN ?? ''}`,
      Accept: 'application/json',
    },
  });
  const data = await response.json();

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  res.status(response.status).json(data);
}
