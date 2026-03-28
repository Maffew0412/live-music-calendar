import { ViewToggle } from '../ui/ViewToggle';

export function Header() {
  return (
    <header className="border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Live Music Calendar</h1>
          <p className="text-sm text-gray-500">Discover concerts near you</p>
        </div>
        <ViewToggle />
      </div>
    </header>
  );
}
