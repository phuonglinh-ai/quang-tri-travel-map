// Tiện ích dùng chung cho các script xử lý dữ liệu.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CACHE = path.join(ROOT, '.cache');
export const OUT = path.join(ROOT, 'public', 'data');

export const province = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src/config/province.data.json'), 'utf8'),
);
export const provinceDir = `${province.code}_${province.codeName}`;

export const VN_DATA = path.join(CACHE, 'vn-data');
export const geojsonDir = (dir) => path.join(VN_DATA, 'json', 'geojson', dir);

export const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
export function writeJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data));
}

export const kb = (p) => `${(fs.statSync(p).size / 1024).toFixed(0)} KB`;

/** Bbox mở rộng quanh tỉnh: vùng dữ liệu nền và giới hạn kéo bản đồ (maxBounds). */
export function viewBounds() {
  const [w, s, e, n] = readJson(path.join(geojsonDir(provinceDir), `${provinceDir}.geojson`)).features[0].bbox;
  const p = province.viewPaddingDeg;
  const r = (x) => Math.round(x * 1000) / 1000;
  return [r(w - p), r(s - p), r(e + p), r(n + p)];
}

export const USER_AGENT = 'travel-map-data-pipeline/0.1 (personal demo project)';

const R = 6378137;
const rad = (d) => (d * Math.PI) / 180;
/** Diện tích (m²) của một vòng tọa độ [kinh độ, vĩ độ], công thức trên mặt cầu. */
export function ringArea(ring) {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    a += rad(x2 - x1) * (2 + Math.sin(rad(y1)) + Math.sin(rad(y2)));
  }
  return Math.abs((a * R * R) / 2);
}

/** Danh sách polygon (mảng các vòng) của một geometry Polygon/MultiPolygon. */
export const polygonsOf = (g) =>
  g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];

/** Chạy lệnh mapshaper trên dữ liệu trong bộ nhớ, trả về các file đầu ra đã parse. */
export async function mapshaper(commands, input) {
  const { default: ms } = await import('mapshaper');
  const files = Object.fromEntries(Object.entries(input).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));
  const out = await ms.applyCommands(commands, files);
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, JSON.parse(v)]));
}

/** Tỉnh hoặc xã nhỏ hơn ngưỡng này (m²) được coi là mảnh rác hình học, không phải đảo thật. */
export const MIN_REAL_POLYGON_M2 = 1000;

/**
 * Lệnh mapshaper đơn giản hóa mà KHÔNG làm mất đảo nhỏ.
 * `keep-shapes` chỉ bảo vệ từng feature, không bảo vệ từng phần của MultiPolygon: đảo nhỏ nằm chung
 * feature với đất liền vẫn có thể bị xóa. Vì vậy tách từng phần ra (explode), đơn giản hóa, rồi gộp lại.
 */
export const simplifyKeepingIslands = (intervalM, fields) => [
  '-explode',
  `-simplify interval=${intervalM} keep-shapes`,
  `-dissolve code copy-fields=${fields.filter((f) => f !== 'code').join(',')}`,
];

/** Khoảng cách (km) giữa hai tọa độ [kinh độ, vĩ độ]. */
export function distanceKm([x1, y1], [x2, y2]) {
  const r = (d) => (d * Math.PI) / 180;
  const a = Math.sin(r(y2 - y1) / 2) ** 2 + Math.cos(r(y1)) * Math.cos(r(y2)) * Math.sin(r(x2 - x1) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

// ---- Nội dung địa điểm: content/places/<id>.json (mỗi địa điểm một file, tên file là id) ----
export const PLACES_DIR = path.join(ROOT, 'content', 'places');
/** Ảnh gốc do người biên tập tải lên (Sveltia CMS) hoặc lấy từ Commons; bản cho web được build ra public/. */
export const IMAGES_SRC_DIR = path.join(ROOT, 'content', 'images');
/** Đường dẫn công khai của ảnh lưu trong file địa điểm, ví dụ "/images/places/thanh-co-quang-tri.jpg". */
export const IMAGES_PUBLIC_PREFIX = '/images/places/';

/**
 * Tọa độ nhập theo kiểu Google Maps "vĩ độ, kinh độ" (ví dụ "16.75393, 107.189536")
 * → [kinh độ, vĩ độ] như GeoJSON. Trả về null nếu sai định dạng.
 */
export function parseLatLng(s) {
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(s ?? '');
  return m ? [Number(m[2]), Number(m[1])] : null;
}
export const formatLatLng = ([lon, lat]) => `${lat}, ${lon}`;

/** Đọc tất cả địa điểm, sắp theo id. Mỗi phần tử: { id, file, data } với data là nội dung file. */
export function readPlaces() {
  return fs
    .readdirSync(PLACES_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({ id: f.slice(0, -5), file: path.join(PLACES_DIR, f), data: readJson(path.join(PLACES_DIR, f)) }));
}
export function writePlace(id, data) {
  fs.mkdirSync(PLACES_DIR, { recursive: true });
  fs.writeFileSync(path.join(PLACES_DIR, `${id}.json`), `${JSON.stringify(data, null, 2)}\n`);
}

/** Dải "Nổi bật" (carousel): danh sách id địa điểm theo thứ tự hiển thị, sửa trong CMS mục "Dải Nổi bật". */
export const FEATURED_FILE = path.join(ROOT, 'content', 'featured.json');
export const readFeatured = () => readJson(FEATURED_FILE).places ?? [];

/**
 * Giấy phép ảnh chọn được trong CMS. `url` dùng để tự điền licenseUrl khi trống.
 * `ownSource: true` = ảnh tự chụp / do cơ quan cung cấp: không bắt buộc liên kết nguồn,
 * nhưng phải lưu lại sự đồng ý của tác giả/cơ quan ngoài hệ thống.
 */
export const LICENSES = [
  { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0' },
  { name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0' },
  { name: 'CC BY 3.0', url: 'https://creativecommons.org/licenses/by/3.0' },
  { name: 'CC BY-SA 3.0', url: 'https://creativecommons.org/licenses/by-sa/3.0' },
  { name: 'CC BY 2.0', url: 'https://creativecommons.org/licenses/by/2.0' },
  { name: 'CC BY-SA 2.0', url: 'https://creativecommons.org/licenses/by-sa/2.0' },
  { name: 'CC0', url: 'https://creativecommons.org/publicdomain/zero/1.0' },
  { name: 'Public domain', url: null },
  { name: 'Ảnh tự chụp, tác giả đồng ý cho sử dụng', nameEn: 'Own photo, used with the author’s permission', url: null, ownSource: true },
  { name: 'Do cơ quan cung cấp, có văn bản đồng ý', nameEn: 'Provided by the agency, with written consent', url: null, ownSource: true },
];
