export function getMonthStart(date = new Date()) {
  return date.toISOString().slice(0, 7);
}
