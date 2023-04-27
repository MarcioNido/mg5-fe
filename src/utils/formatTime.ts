import { format, getTime, formatDistanceToNow } from 'date-fns';

// ----------------------------------------------------------------------

type InputValue = Date | string | number | null;

export function fDate(
    date: InputValue,
    newFormat?: 'full' | 'long' | 'medium' | 'short' | undefined
) {
    if (!date) return '';

    const fmt = newFormat || 'short';
    const dateObj = new Date(date);

    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: fmt,
        timeZone: 'UTC',
    }).format(dateObj);
}

export function fMonth(
    date: InputValue
) {
    if (date instanceof Date) {
        return date.toISOString().substring(0, 7);
    }
    return date;
}

export function fDateTime(date: InputValue, newFormat?: string) {
  const fm = newFormat || 'dd MMM yyyy p';

  return date ? format(new Date(date), fm) : '';
}

export function fDateISOString(date: string | Date | null) {
    if (date instanceof Date) {
        return date.toISOString().substring(0, 10);
    }
    return date;
}

export function fTimestamp(date: InputValue) {
  return date ? getTime(new Date(date)) : '';
}

export function fToNow(date: InputValue) {
  return date
    ? formatDistanceToNow(new Date(date), {
        addSuffix: true,
      })
    : '';
}
