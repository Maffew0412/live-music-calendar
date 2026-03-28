const GENRE_COLORS: Record<string, string> = {
  'Rock': 'bg-red-100 text-red-800',
  'Pop': 'bg-pink-100 text-pink-800',
  'Hip-Hop/Rap': 'bg-purple-100 text-purple-800',
  'R&B': 'bg-violet-100 text-violet-800',
  'Jazz': 'bg-amber-100 text-amber-800',
  'Blues': 'bg-blue-100 text-blue-800',
  'Country': 'bg-orange-100 text-orange-800',
  'Electronic': 'bg-cyan-100 text-cyan-800',
  'Folk': 'bg-green-100 text-green-800',
  'Metal': 'bg-gray-200 text-gray-800',
  'Punk': 'bg-lime-100 text-lime-800',
  'Alternative': 'bg-teal-100 text-teal-800',
  'Indie': 'bg-indigo-100 text-indigo-800',
  'Classical': 'bg-yellow-100 text-yellow-800',
  'Latin': 'bg-rose-100 text-rose-800',
  'Reggae': 'bg-emerald-100 text-emerald-800',
  'World': 'bg-sky-100 text-sky-800',
};

export function GenreBadge({ genre }: { genre: string }) {
  const colors = GENRE_COLORS[genre] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors}`}>
      {genre}
    </span>
  );
}
