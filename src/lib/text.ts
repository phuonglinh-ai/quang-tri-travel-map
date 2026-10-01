/** Chuẩn hóa để tìm kiếm không phân biệt dấu, hoa thường: "Đồng Hới" → "dong hoi". */
export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Khoảng cách (km) giữa hai tọa độ [kinh độ, vĩ độ]. */
export function distanceKm([x1, y1]: [number, number], [x2, y2]: [number, number]): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(r(y2 - y1) / 2) ** 2 + Math.cos(r(y1)) * Math.cos(r(y2)) * Math.sin(r(x2 - x1) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}
