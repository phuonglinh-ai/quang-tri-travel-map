// Gộp 78 file xã thành wards.geojson, đơn giản hóa theo topology chung, rồi hợp nhất (dissolve)
// để có đường viền tỉnh khớp tuyệt đối với viền xã. Xuất thêm ranh giới các tỉnh lân cận.
//
// QUY TẮC: luôn đơn giản hóa qua simplifyKeepingIslands() để không làm mất đảo nhỏ
// (đặc khu Cồn Cỏ, cụm đảo Phú Trạch, Hoàng Sa của Đà Nẵng).
import fs from 'node:fs';
import path from 'node:path';
import { OUT, province, provinceDir, geojsonDir, readJson, writeJson, kb, mapshaper, simplifyKeepingIslands } from './lib.mjs';

const WARD_SIMPLIFY_M = 20;
const NEIGHBOR_SIMPLIFY_M = 100;
const PRECISION = 0.00001; // ~1 m

const pick = (p, keys) => Object.fromEntries(keys.map((k) => [k, p[k] ?? null]));
const WARD_KEYS = ['code', 'name', 'nameEn', 'fullName', 'fullNameEn', 'codeName', 'areaKm2', 'postalCode'];

// --- Xã/phường -------------------------------------------------------------
const wardsDir = path.join(geojsonDir(provinceDir), 'wards');
const wardFiles = fs.readdirSync(wardsDir, { encoding: 'utf8' }).filter((f) => f.endsWith('.geojson'));
if (wardFiles.length !== province.wardCount) {
  throw new Error(`Có ${wardFiles.length} file xã, cấu hình ghi ${province.wardCount}`);
}
const wardsRaw = {
  type: 'FeatureCollection',
  features: wardFiles.map((f) => {
    const feat = readJson(path.join(wardsDir, f)).features[0];
    return { type: 'Feature', properties: pick(feat.properties, WARD_KEYS), geometry: feat.geometry };
  }),
};

const out = await mapshaper(
  [
    '-i wards.json snap name=wards',
    ...simplifyKeepingIslands(WARD_SIMPLIFY_M, WARD_KEYS),
    '-clean',
    '-dissolve2 + name=province',
    '-points inner + target=wards name=ward_labels',
    `-o target=* format=geojson geojson-type=FeatureCollection precision=${PRECISION}`,
  ].join(' '),
  { 'wards.json': wardsRaw },
);

// Thuộc tính tỉnh lấy từ file chính thức.
const official = readJson(path.join(geojsonDir(provinceDir), `${provinceDir}.geojson`)).features[0];
const provinceFc = out['province.json'];
provinceFc.features[0].properties = pick(official.properties, ['code', 'name', 'nameEn', 'fullName', 'fullNameEn', 'areaKm2']);

writeJson(path.join(OUT, 'province.geojson'), provinceFc);
writeJson(path.join(OUT, 'wards.geojson'), out['wards.json']);
writeJson(path.join(OUT, 'ward-labels.geojson'), out['ward_labels.json']);

// --- Tỉnh lân cận ----------------------------------------------------------
const NEIGHBOR_KEYS = ['code', 'name', 'fullName'];
const neighborsRaw = {
  type: 'FeatureCollection',
  features: province.neighbors.map((d) => {
    const feat = readJson(path.join(geojsonDir(d), `${d}.geojson`)).features[0];
    return { type: 'Feature', properties: pick(feat.properties, NEIGHBOR_KEYS), geometry: feat.geometry };
  }),
};
const nb = await mapshaper(
  [
    '-i neighbors.json name=neighbors',
    ...simplifyKeepingIslands(NEIGHBOR_SIMPLIFY_M, NEIGHBOR_KEYS),
    `-o format=geojson precision=${PRECISION}`,
  ].join(' '),
  { 'neighbors.json': neighborsRaw },
);
writeJson(path.join(OUT, 'neighbors.geojson'), nb['neighbors.json']);

for (const f of ['province', 'wards', 'ward-labels', 'neighbors']) {
  console.log(`✓ ${f}.geojson  ${kb(path.join(OUT, `${f}.geojson`))}`);
}
