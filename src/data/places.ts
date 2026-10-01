// Mô hình dữ liệu địa điểm (CLAUDE.md mục 7) và tải dữ liệu.
import { fold } from '../lib/text';

export interface PlaceLink {
  label: string;
  url: string;
}

export interface PlaceImage {
  /** Đường dẫn trong public/, ví dụ "images/places/thanh-co-quang-tri.jpg". */
  src: string;
  /** Bản nhỏ cho carousel, danh sách. */
  thumb?: string;
  alt: string;
  /** Tác giả, bắt buộc theo giấy phép CC BY / CC BY-SA. */
  credit: string;
  license: string;
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
