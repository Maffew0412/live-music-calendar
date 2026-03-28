const GENRE_NORMALIZE_MAP: Record<string, string> = {
  'rock': 'Rock',
  'pop': 'Pop',
  'hip-hop/rap': 'Hip-Hop/Rap',
  'hip-hop': 'Hip-Hop/Rap',
  'rap': 'Hip-Hop/Rap',
  'r&b': 'R&B',
  'rhythm and blues': 'R&B',
  'jazz': 'Jazz',
  'blues': 'Blues',
  'country': 'Country',
  'electronic': 'Electronic',
  'dance/electronic': 'Electronic',
  'edm': 'Electronic',
  'folk': 'Folk',
  'metal': 'Metal',
  'punk': 'Punk',
  'alternative': 'Alternative',
  'indie': 'Indie',
  'indie rock': 'Indie',
  'classical': 'Classical',
  'latin': 'Latin',
  'reggae': 'Reggae',
  'world': 'World',
};

export function normalizeGenre(genre: string): string | null {
  if (!genre || genre.toLowerCase() === 'undefined' || genre.toLowerCase() === 'other') {
    return null;
  }
  return GENRE_NORMALIZE_MAP[genre.toLowerCase()] ?? genre;
}

export function extractGenres(classifications?: { genre?: { name: string }; subGenre?: { name: string } }[]): string[] {
  if (!classifications) return [];

  const genres = new Set<string>();
  for (const c of classifications) {
    const g = normalizeGenre(c.genre?.name ?? '');
    if (g) genres.add(g);
    const sg = normalizeGenre(c.subGenre?.name ?? '');
    if (sg) genres.add(sg);
  }
  return Array.from(genres);
}
