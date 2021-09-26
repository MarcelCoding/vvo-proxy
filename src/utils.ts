export function parseDate(date: string | null | undefined): Date | null {
  if (!date) {
    return null;
  }
  const [timestamp, offset] = date.substring(6, date.length - 2).split("-");
  return new Date(parseInt(timestamp) - parseInt(offset));
}
