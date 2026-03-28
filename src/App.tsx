import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FilterProvider } from './context/FilterContext';
import { Header } from './components/layout/Header';
import { SearchBar } from './components/layout/SearchBar';
import { EventList } from './components/events/EventList';
import { EventMap } from './components/map/EventMap';
import { useFilters } from './hooks/useFilters';

const queryClient = new QueryClient();

function MainContent() {
  const { filters } = useFilters();

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {filters.viewMode === 'list' ? <EventList /> : <EventMap />}
    </main>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FilterProvider>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <SearchBar />
          <MainContent />
        </div>
      </FilterProvider>
    </QueryClientProvider>
  );
}
