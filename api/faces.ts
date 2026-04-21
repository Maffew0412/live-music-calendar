import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const url = new URL('https://www.facesbrewing.com/events');

    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HubLive/1.0)',
        Accept: 'application/json, text/html',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      res.status(502).json({ error: 'Upstream error', status: response.status });
      return;
    }

    const ct = response.headers.get('content-type') ?? '';
    if (!ct.includes('json')) {
      res.status(502).json({ error: 'Unexpected content-type from Squarespace', ct });
      return;
    }

    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json(data);
  } catch {
    res.status(500).json({ error: 'Failed to fetch Faces events' });
  }
}
