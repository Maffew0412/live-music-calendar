import { format, parseISO } from 'date-fns';

export function formatEventDate(isoDate: string): string {
  return format(parseISO(isoDate), 'EEE, MMM d, yyyy');
}

export function formatEventTime(time: string | null): string {
  if (!time) return 'TBA';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function toTMDateTime(date: string): string {
  return `${date}T00:00:00Z`;
}

export function toTMEndDateTime(date: string): string {
  return `${date}T23:59:59Z`;
}
