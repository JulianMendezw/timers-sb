export function stripItemNumberPrefix(value?: string | null): string {
  if (!value) return value ?? '';
  return String(value).replace(/^SB/i, '');
}
