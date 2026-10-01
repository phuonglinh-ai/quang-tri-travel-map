// Kiểm tra content/places.json và xuất public/data/places.json:
//  - gán wardCode/wardName bằng point-in-polygon (CLAUDE.md mục 7: không nhập tay);
//  - điểm nằm sát bờ biển/ranh giới ngoài polygon (sai số đơn giản hóa) được gán xã gần nhất, tối đa 1 km;
//  - dừng với mã lỗi nếu dữ liệu sai quy tắc.
import fs from 'node:fs';
import path from 'node:path';
import pointInPolygon from '@turf/boolean-point-in-polygon';
import { pointToPolygonDistance } from '@turf/point-to-polygon-distance';
import { ROOT, OUT, readJson, writeJson, kb } from './lib.mjs';

const MAX_OUTSIDE_KM = 1;
const places = readJson(path.join(ROOT, 'content', 'places.json'));
const { layers } = readJson(path.join(ROOT, 'src', 'config', 'layers.data.json'));
const wards = readJson(path.join(OUT, 'wards.geojson')).features;
const layerIds = new Set(layers.map((l) => l.id));

const errors = [];
const warnings = [];
const ids = new Set();

const out = places.map((p, i) => {
  const at = `#${i} ${p.id ?? '(thiếu id)'}`;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.id ?? '')) errors.push(`${at}: id phải là slug a-z, 0-9, dấu gạch ngang`);
  if (ids.has(p.id)) errors.push(`${at}: trùng id`);
  ids.add(p.id);
  if (!layerIds.has(p.layer)) errors.push(`${at}: lớp "${p.layer}" không có trong layers.data.json`);
  if (!p.name?.trim()) errors.push(`${at}: thiếu tên`);
  if (!p.summary?.trim()) errors.push(`${at}: thiếu mô tả`);
  // Quy tắc 4: dữ liệu mẫu phải được đánh dấu rõ.
  if (typeof p.isSample !== 'boolean') errors.push(`${at}: thiếu isSample (true/false)`);
  // Ảnh phải có file thật và đủ thông tin ghi công (giấy phép CC BY/BY-SA bắt buộc ghi tác giả).
  for (const img of p.images ?? []) {
    if (typeof img !== 'object') { errors.push(`${at}: ảnh phải là đối tượng { src, credit, license, sourceUrl }`); continue; }
    for (const f of [img.src, img.thumb].filter(Boolean)) {
      if (!fs.existsSync(path.join(ROOT, 'public', f))) errors.push(`${at}: không có file public/${f}`);
    }
    if (!img.credit?.trim() || !img.license?.trim()) errors.push(`${at}: ảnh thiếu tác giả hoặc giấy phép`);
    if (!/^https:\/\//.test(img.sourceUrl ?? '')) errors.push(`${at}: ảnh thiếu liên kết nguồn (sourceUrl)`);
  }
  for (const l of p.links ?? []) if (!/^https:\/\//.test(l.url)) errors.push(`${at}: liên kết phải là https`);
  if (p.mapZoom != null && !(p.mapZoom >= 6 && p.mapZoom <= 17)) errors.push(`${at}: mapZoom phải trong khoảng 6–17`);
  for (const m of p.months ?? []) if (!(m >= 1 && m <= 12)) errors.push(`${at}: tháng không hợp lệ ${m}`);

  const [lon, lat] = p.coordinates ?? [];
  if (!(lon >= 102 && lon <= 110 && lat >= 8 && lat <= 24)) {
    errors.push(`${at}: tọa độ [kinh độ, vĩ độ] không hợp lệ`);
    return p;
  }
  let ward = wards.find((w) => pointInPolygon(p.coordinates, w));
  if (!ward) {
    const nearest = wards
      .map((w) => ({ w, d: pointToPolygonDistance(p.coordinates, w, { units: 'kilometers' }) }))
      .sort((a, b) => a.d - b.d)[0];
    if (nearest.d <= MAX_OUTSIDE_KM) {
      ward = nearest.w;
      warnings.push(`${at}: nằm ngoài ranh giới ${Math.round(nearest.d * 1000)} m, gán vào xã gần nhất ${ward.properties.name}`);
    } else {
      errors.push(`${at}: nằm ngoài tỉnh (cách xã gần nhất ${nearest.d.toFixed(1)} km)`);
    }
  }
  const { wardCode, wardName, ...rest } = p;
  return { ...rest, wardCode: ward?.properties.code ?? null, wardName: ward?.properties.name ?? null };
});

for (const w of warnings) console.warn(`! ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  process.exit(1);
}

const file = path.join(OUT, 'places.json');
writeJson(file, out);
const counts = {};
for (const p of out) counts[p.layer] = (counts[p.layer] ?? 0) + 1;
const byLayer = Object.entries(counts).map(([k, n]) => `${k} ${n}`);
console.log(`✓ places.json  ${kb(file)}  ${out.length} địa điểm (${out.filter((p) => p.isSample).length} mẫu): ${byLayer.join(', ')}`);
