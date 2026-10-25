export const WEEKDAYS = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

export const minutesOf = (time) => {
  const [hours, minutes] = String(time || '').split(':').map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
};

export const formatDuration = (minutes) => {
  if (minutes <= 0) return 'now';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (!hours) return `${remainingMinutes} min`;
  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
};

export const dayKey = (date) => WEEKDAYS[(date.getDay() + 6) % 7].key;

export function slotTiming(slot, nowMinutes) {
  const [start, end] = String(slot.time || '').split('-').map((time) => minutesOf(time.trim()));
  if (start === null || end === null || end <= start) return { status: 'scheduled', progress: 0 };
  if (nowMinutes < start) return { status: 'upcoming', progress: 0 };
  if (nowMinutes >= end) return { status: 'completed', progress: 100 };
  return { status: 'live', progress: Math.round(((nowMinutes - start) / (end - start)) * 100) };
}
