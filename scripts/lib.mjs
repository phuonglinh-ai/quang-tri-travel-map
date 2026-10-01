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
