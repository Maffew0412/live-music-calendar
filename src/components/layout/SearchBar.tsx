import { LocationInput } from '../filters/LocationInput';
import { RadiusSelect } from '../filters/RadiusSelect';
import { GenreFilter } from '../filters/GenreFilter';
import { DateRangePicker } from '../filters/DateRangePicker';
import { VenueFilter } from '../filters/VenueFilter';

export function SearchBar() {
  return (
    <div className="border-b border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-56">
            <LocationInput />
          </div>
          <RadiusSelect />
          <DateRangePicker />
        </div>
        <GenreFilter />
        <VenueFilter />
      </div>
    </div>
  );
}
