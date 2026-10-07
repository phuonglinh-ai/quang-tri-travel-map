// Định dạng và so khớp tháng cho lịch mùa vụ, lễ hội.
import { t } from '../i18n';

/** "Tháng 3–4, 7" (hoặc "Mar–Apr, Jul") từ [3, 4, 7]; gộp các tháng liên tiếp. */
export function formatMonths(months: readonly number[]): string {
  const sorted = [...new Set(months)].sort((a, b) => a - b);
  const groups: [number, number][] = [];
  for (const m of sorted) {
    const last = groups[groups.length - 1];
    if (last && m === last[1] + 1) last[1] = m;
    else groups.push([m, m]);
  }
  return t.monthsLabel(groups);
}

export const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

/** Đọc tham số ?month= từ URL: số nguyên 1–12, ngược lại null. */
export function parseMonth(v: string | null): number | null {
  const n = Number(v);
  return v && Number.isInteger(n) && n >= 1 && n <= 12 ? n : null;
}
