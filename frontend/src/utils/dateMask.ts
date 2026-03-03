/**
 * Format a string input as DD-MM-YYYY while typing.
 * Only allows digits and auto-inserts dashes at positions 2 and 4.
 */
export function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

/**
 * Validate that a string matches DD-MM-YYYY and represents a real date.
 */
export function isValidDate(value: string): boolean {
  if (!/^\d{2}-\d{2}-\d{4}$/.test(value)) return false;
  const [d, m, y] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}
