// Liên kết góp ý/báo lỗi: mở GitHub Issues của repo, điền sẵn tiêu đề và nội dung gợi ý.
// Không đưa dữ liệu cá nhân vào URL; chỉ có tên và id địa điểm.
import { PROVINCE } from '../config/province';

const ISSUES_URL = `https://github.com/${PROVINCE.cms.repo}/issues`;

export const issuesListUrl = ISSUES_URL;

/** Địa chỉ trang tạo issue mới; `place` điền sẵn thông tin địa điểm đang xem. */
export function feedbackUrl(place?: { id: string; name: string }): string {
  const params = new URLSearchParams();
  if (place) {
    const link = `${location.origin}${location.pathname}?place=${place.id}`;
    params.set('title', `[Góp ý] ${place.name}`);
    params.set(
      'body',
      `**Địa điểm:** ${place.name} (\`${place.id}\`)\n**Liên kết:** ${link}\n\n**Nội dung góp ý** (sai thông tin, thiếu ảnh, đề xuất bổ sung…):\n\n`,
    );
  } else {
    params.set('title', '[Góp ý] ');
    params.set('body', '**Nội dung góp ý:**\n\n');
  }
  return `${ISSUES_URL}/new?${params}`;
}
