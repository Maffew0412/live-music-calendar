export function EventCardSkeleton() {
  return (
    <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white animate-pulse">
      <div className="hidden w-40 bg-gray-200 sm:block" />
      <div className="flex-1 p-4 space-y-3">
        <div className="h-5 w-3/4 rounded bg-gray-200" />
        <div className="h-4 w-1/2 rounded bg-gray-200" />
        <div className="h-4 w-2/5 rounded bg-gray-200" />
        <div className="flex gap-1.5">
          <div className="h-5 w-14 rounded-full bg-gray-200" />
          <div className="h-5 w-14 rounded-full bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
