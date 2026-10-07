// Liên kết góp ý/báo lỗi: mở GitHub Issues của repo, điền sẵn tiêu đề và nội dung gợi ý.
// Không đưa dữ liệu cá nhân vào URL; chỉ có tên và id địa điểm.
import { PROVINCE } from '../config/province';
import { getLang, t } from '../i18n';

const ISSUES_URL = `https://github.com/${PROVINCE.cms.repo}/issues`;

export const issuesListUrl = ISSUES_URL;

/** Địa chỉ trang tạo issue mới; `place` điền sẵn thông tin địa điểm đang xem. Nội dung gợi ý theo ngôn ngữ đang chọn. */
export function feedbackUrl(place?: { id: string; name: string }): string {
  const params = new URLSearchParams();
  if (place) {
    const lang = getLang() === 'en' ? '&lang=en' : '';
    const link = `${location.origin}${location.pathname}?place=${place.id}${lang}`;
    params.set('title', `${t.feedbackTitle} ${place.name}`);
    params.set('body', t.feedbackBodyPlace(place.name, place.id, link));
  } else {
    params.set('title', `${t.feedbackTitle} `);
    params.set('body', t.feedbackBodyGeneral);
  }
  return `${ISSUES_URL}/new?${params}`;
}
