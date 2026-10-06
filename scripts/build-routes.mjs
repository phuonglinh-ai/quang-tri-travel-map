// Kiểm tra content/routes/*.json (mỗi tuyến một file, tên file là id) và xuất public/data/routes.json:
//  - các điểm dừng phải trỏ tới địa điểm có thật (public/data/places.json, chạy sau build-places);
//  - dựng đường đi giữa các điểm dừng bám theo mạng đường OSM của dự án (scripts/route-path.mjs);
//  - tính km từng chặng và cả tuyến, bbox để bản đồ canh khung.
// Chạy trong `npm run places` (cả trên Vercel), nên mọi thay đổi từ Sveltia CMS đều được xử lý khi deploy.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, OUT, readJson, writeJson, kb } from './lib.mjs';
import { buildGraph, routeThrough } from './route-path.mjs';

const ROUTES_DIR = path.join(ROOT, 'content', 'routes');
const { themes, maxStops } = readJson(path.join(ROOT, 'src', 'config', 'routes.data.json'));
const themeIndex = new Map(themes.map((t, i) => [t.id, i]));
const places = new Map(readJson(path.join(OUT, 'places.json')).map((p) => [p.id, p]));
const graph = buildGraph(readJson(path.join(OUT, 'roads.geojson')).features);

/** Quãng đường thực tế dài hơn đường chim bay quá mức này thường là do mạng đường thiếu hoặc điểm dừng sai thứ tự. */
const DETOUR_WARN = 2.5;

const errors = [];
const warnings = [];
const files = fs.existsSync(ROUTES_DIR) ? fs.readdirSync(ROUTES_DIR).filter((f) => f.endsWith('.json')).sort() : [];

const routes = files.map((file) => {
  const id = file.replace(/\.json$/, '');
  const at = `content/routes/${file}`;
  const r = readJson(path.join(ROUTES_DIR, file));
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) errors.push(`${at}: tên file (id) chỉ gồm a-z, 0-9 và dấu gạch ngang`);
  if (!r.name?.trim()) errors.push(`${at}: thiếu tên`);
  if (!r.summary?.trim()) errors.push(`${at}: thiếu mô tả`);
  if (!themeIndex.has(r.theme)) errors.push(`${at}: chủ đề "${r.theme}" không có trong routes.data.json`);
  // Quy tắc 4: dữ liệu mẫu phải được đánh dấu rõ.
  if (typeof r.isSample !== 'boolean') errors.push(`${at}: thiếu isSample (true/false)`);
  const stops = r.stops ?? [];
  if (stops.length < 2) errors.push(`${at}: cần ít nhất 2 điểm dừng`);
  if (stops.length > maxStops) errors.push(`${at}: tối đa ${maxStops} điểm dừng (liên kết Google Maps chỉ nhận chừng đó)`);
  const seen = new Set();
  stops.forEach((s, i) => {
    if (!places.has(s.place)) errors.push(`${at}: điểm dừng ${i + 1} trỏ tới địa điểm "${s.place}" không tồn tại (đã xóa hoặc đổi tên?)`);
    if (seen.has(s.place)) errors.push(`${at}: địa điểm "${s.place}" xuất hiện nhiều lần`);
    seen.add(s.place);
  });
  if (errors.some((e) => e.startsWith(at))) return null;

  const coords = stops.map((s) => places.get(s.place).coordinates);
  const { features, legs } = routeThrough(graph, coords);
  legs.forEach((leg, i) => {
    const direct = Math.hypot(...[0, 1].map((k) => (coords[i + 1][k] - coords[i][k]) * (k ? 111.19 : 111.19 * Math.cos((coords[i][1] * Math.PI) / 180))));
    if (leg.approx) warnings.push(`${at}: chặng ${i + 1}→${i + 2} không nối được vào mạng đường, vẽ đường thẳng`);
    else if (leg.km > direct * DETOUR_WARN + 2) warnings.push(`${at}: chặng ${i + 1}→${i + 2} dài ${leg.km.toFixed(0)} km so với ${direct.toFixed(0)} km đường chim bay, nên kiểm tra thứ tự điểm dừng`);
  });

  const xs = [];
  const ys = [];
  for (const f of features) for (const [x, y] of f.geometry.coordinates) (xs.push(x), ys.push(y));
  const round = (n) => Math.round(n * 1e4) / 1e4;
  return {
    id,
    name: r.name.trim(),
    theme: r.theme,
    summary: r.summary.trim(),
    ...(r.duration?.trim() && { duration: r.duration.trim() }),
    ...(r.audience?.trim() && { audience: r.audience.trim() }),
    isSample: r.isSample,
    stops: stops.map((s) => ({ place: s.place, ...(s.note?.trim() && { note: s.note.trim() }) })),
    legs: legs.map((l) => ({ km: Math.round(l.km * 10) / 10, approx: l.approx })),
    totalKm: Math.round(legs.reduce((sum, l) => sum + l.km, 0) * 10) / 10,
    bbox: [round(Math.min(...xs)), round(Math.min(...ys)), round(Math.max(...xs)), round(Math.max(...ys))],
    line: { type: 'FeatureCollection', features },
  };
});

for (const w of warnings) console.warn(`! ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  process.exit(1);
}

const out = routes.filter(Boolean).sort((a, b) => themeIndex.get(a.theme) - themeIndex.get(b.theme) || a.name.localeCompare(b.name, 'vi'));
const file = path.join(OUT, 'routes.json');
writeJson(file, out);
const detail = out.map((r) => `${r.id} (${r.stops.length} điểm, ${r.totalKm} km)`).join('; ');
console.log(`✓ routes.json  ${kb(file)}  ${out.length} tuyến (${out.filter((r) => r.isSample).length} mẫu)${detail ? `: ${detail}` : ''}`);
