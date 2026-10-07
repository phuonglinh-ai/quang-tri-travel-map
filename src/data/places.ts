// Mô hình dữ liệu địa điểm (CLAUDE.md mục 7) và tải dữ liệu.
import { fold } from '../lib/text';
import { getLang, localized, isUntranslated } from '../i18n';

export interface PlaceLink {
  label: string;
  /** Tên liên kết tiếng Anh (tùy chọn). */
  labelEn?: string;
  url: string;
}

export interface PlaceImage {
  /** Đường dẫn trong public/, ví dụ "images/places/thanh-co-quang-tri.jpg". */
  src: string;
  /** Bản nhỏ cho carousel, danh sách. */
  thumb?: string;
  alt: string;
  altEn?: string;
  /** Tác giả, bắt buộc theo giấy phép CC BY / CC BY-SA. */
  credit: string;
  license: string;
  /** Tên giấy phép tiếng Anh, chỉ có với các giấy phép viết bằng tiếng Việt. */
  licenseEn?: string;
  licenseUrl: string | null;
  /** Trang gốc của ảnh; có thể trống với ảnh tự chụp hoặc do cơ quan cung cấp. */
  sourceUrl: string | null;
}

export interface Place {
  id: string;
  layer: string;
  name: string;
  nameEn: string | null;
  coordinates: [number, number];
  wardCode: string | null;
  wardName: string | null;
  summary: string;
  /** Mô tả tiếng Anh (tùy chọn); chưa nhập thì hiển thị mô tả tiếng Việt. */
  summaryEn?: string;
  images: PlaceImage[];
  links: PlaceLink[];
  months: number[];
  featured: boolean;
  isSample: boolean;
  /** Mức zoom khi mở địa điểm dạng vùng rộng (vườn quốc gia, khu bảo tồn); mặc định 13. */
  mapZoom?: number;
  /** Icon riêng, thay icon của lớp (ví dụ ✈️ cho sân bay trong lớp giao thông). */
  icon?: string;
  source?: { osm?: string; osmName?: string | null };
  extra: Record<string, unknown>;
}

export interface IndexedPlace extends Place {
  /** Chuỗi đã bỏ dấu dùng cho tìm kiếm. */
  searchText: string;
  foldedName: string;
}

// Nội dung hiển thị theo ngôn ngữ đang chọn; trường tiếng Anh chưa nhập thì dùng tiếng Việt thay thế.
export const placeName = (p: Place) => localized(p.name, p.nameEn);
/** Tên còn lại (tên gốc tiếng Việt khi đang ở tiếng Anh; tên tiếng Anh khi đang ở tiếng Việt), để hiện phụ dưới tên chính. */
export const placeAltName = (p: Place) => (!p.nameEn ? '' : getLang() === 'en' ? p.name : p.nameEn);
export const placeSummary = (p: Place) => localized(p.summary, p.summaryEn);
export const placeSummaryUntranslated = (p: Place) => isUntranslated(p.summaryEn);
export const imageAlt = (i: PlaceImage) => localized(i.alt, i.altEn);
export const imageLicense = (i: PlaceImage) => localized(i.license, i.licenseEn);
export const linkLabel = (l: PlaceLink) => localized(l.label, l.labelEn);

/** URL đầy đủ của file trong public/ (tính cả BASE_URL khi triển khai dưới thư mục con). */
export const assetPath = (src: string) => `${import.meta.env.BASE_URL}${src}`;

export async function loadPlaces(): Promise<IndexedPlace[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/places.json`);
  const places = (await res.json()) as Place[];
  return places.map((p) => ({
    ...p,
    foldedName: fold(p.name),
    searchText: fold([p.name, p.nameEn, p.wardName, p.source?.osmName].filter(Boolean).join(' | ')),
  }));
}

/** Xếp hạng khớp: bắt đầu bằng từ khóa > bắt đầu một từ > chứa ở đâu đó. -1 nếu không khớp. */
export function matchScore(p: IndexedPlace, q: string): number {
  if (!q) return 0;
  if (p.foldedName.startsWith(q)) return 3;
  if (p.foldedName.includes(` ${q}`)) return 2;
  if (p.searchText.includes(q)) return 1;
  return -1;
}
