// Kiểm tra dữ liệu đầu ra trong public/data. Thoát với mã lỗi nếu có vi phạm.
// Trọng tâm: không được mất đảo khi đơn giản hóa (Cồn Cỏ, các đảo ven bờ, Hoàng Sa của Đà Nẵng).
import fs from 'node:fs';
import path from 'node:path';
import pointInPolygon from '@turf/boolean-point-in-polygon';
import { OUT, province, provinceDir, geojsonDir, readJson, kb, ringArea, polygonsOf, MIN_REAL_POLYGON_M2 } from './lib.mjs';

let failed = 0;
const check = (ok, msg) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) failed++;
};
const realPolygons = (g) => polygonsOf(g).filter((p) => ringArea(p[0]) > MIN_REAL_POLYGON_M2);
const bboxOf = (coords) => {
  const xs = coords.map((c) => c[0]);
  const ys = coords.map((c) => c[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};
const within = ([w, s, e, n], [W, S, E, N]) => w >= W && s >= S && e <= E && n <= N;

// --- Tỉnh ------------------------------------------------------------------
const prov = readJson(path.join(OUT, 'province.geojson'));
check(prov.features.length === 1 && prov.features[0].properties.code === province.code, `province.geojson: 1 đối tượng, mã ${province.code}`);
const provPolys = realPolygons(prov.features[0].geometry);
const CON_CO_BOX = [107.32, 17.14, 107.36, 17.18];
check(
  provPolys.some((p) => within(bboxOf(p[0]), CON_CO_BOX)),
  `province.geojson: còn polygon đặc khu Cồn Cỏ (${provPolys.length} polygon)`,
);

// --- Xã/phường: so từng xã với dữ liệu gốc ----------------------------------
const wards = readJson(path.join(OUT, 'wards.geojson')).features;
const rawDir = path.join(geojsonDir(provinceDir), 'wards');
const raw = new Map(
  fs.readdirSync(rawDir).map((f) => {
    const feat = readJson(path.join(rawDir, f)).features[0];
    return [feat.properties.code, feat];
  }),
);
check(wards.length === province.wardCount, `wards.geojson: ${wards.length}/${province.wardCount} xã/phường/đặc khu`);
check(new Set(wards.map((w) => w.properties.code)).size === wards.length, 'wards.geojson: mã xã không trùng');
const lost = [];
for (const [code, r] of raw) {
  const w = wards.find((x) => x.properties.code === code);
  if (!w) { lost.push(`${code} (thiếu cả xã)`); continue; }
  const before = realPolygons(r.geometry).length;
  const after = realPolygons(w.geometry).length;
  if (after < before) lost.push(`${r.properties.name}: ${before} → ${after} polygon`);
  if (w.properties.name !== r.properties.name) lost.push(`${code}: tên bị thay đổi`);
}
check(lost.length === 0, `wards.geojson: không mất polygon > ${MIN_REAL_POLYGON_M2} m² nào${lost.length ? ' — ' + lost.join('; ') : ''}`);
check(wards.some((w) => w.properties.code === '19742'), 'wards.geojson: có đặc khu Cồn Cỏ (19742)');
const labels = readJson(path.join(OUT, 'ward-labels.geojson')).features;
check(labels.length === wards.length, `ward-labels.geojson: ${labels.length} nhãn`);

// --- Tỉnh lân cận (Đà Nẵng phải còn quần đảo Hoàng Sa) ----------------------
const neighbors = readJson(path.join(OUT, 'neighbors.geojson')).features;
for (const d of province.neighbors) {
  const r = readJson(path.join(geojsonDir(d), `${d}.geojson`)).features[0];
  const n = neighbors.find((x) => x.properties.code === r.properties.code);
  const before = realPolygons(r.geometry).length;
  const after = n ? realPolygons(n.geometry).length : 0;
  check(after >= before, `neighbors: ${r.properties.name} giữ đủ ${after}/${before} polygon`);
  if (r.properties.code === '48') {
    const east = bboxOf(polygonsOf(n.geometry).flatMap((p) => p[0]))[2];
    check(east > 112.5, `neighbors: Đà Nẵng còn quần đảo Hoàng Sa (kinh độ đông nhất ${east.toFixed(2)}°E)`);
  }
}

// --- Lớp nền: phải nằm trong tỉnh, không mang tên từ nguồn ngoài ------------
const [w, s, e, n] = readJson(path.join(geojsonDir(provinceDir), `${provinceDir}.geojson`)).features[0].bbox;
const provBox = [w - 0.01, s - 0.01, e + 0.01, n + 0.01];
for (const f of ['roads', 'road-shields', 'water']) {
  const feats = readJson(path.join(OUT, `${f}.geojson`)).features;
  const outside = feats.filter((x) => !within(bboxOf([x.geometry.coordinates].flat(Infinity).reduce((a, v, i, arr) => (i % 2 ? a : [...a, [v, arr[i + 1]]]), [])), provBox));
  check(outside.length === 0, `${f}.geojson: ${feats.length} đối tượng, tất cả nằm trong tỉnh`);
}

// --- Biển số đường: đúng định dạng chuẩn hóa, có các tuyến chính của tỉnh -----
const shields = readJson(path.join(OUT, 'road-shields.geojson')).features;
const REF_RE = /^(CT\.\d+[A-Z]?|QL\.\d+[A-Z]?|ĐT\.\d+[A-Z]?|HCM)$/u;
const NET_OF = { CT: 'ct', QL: 'ql', 'ĐT': 'dt', HCM: 'hcm' };
const badShields = shields.filter(({ properties: p }) => {
  const refs = String(p.shield).split(' · ');
  const net = NET_OF[refs[0].split('.')[0]];
  return !refs.every((r) => REF_RE.test(r)) || new Set(refs).size !== refs.length || p.net !== net || p.tier !== (net === 'dt' ? 'minor' : 'major');
});
check(badShields.length === 0, `road-shields.geojson: ${shields.length} tuyến, số hiệu đúng định dạng${badShields.length ? ' — sai: ' + badShields.map((f) => f.properties.shield).join(', ') : ''}`);
check(new Set(shields.map((f) => f.properties.shield)).size === shields.length, 'road-shields.geojson: mỗi số hiệu một đối tượng');
const KEY_ROUTES = ['CT.01', 'QL.1', 'QL.9', 'HCM'];
const allRefs = new Set(shields.flatMap((f) => f.properties.shield.split(' · ')));
const missingRoutes = KEY_ROUTES.filter((r) => !allRefs.has(r));
check(missingRoutes.length === 0, `road-shields.geojson: có các tuyến chính ${KEY_ROUTES.join(', ')}${missingRoutes.length ? ' — thiếu: ' + missingRoutes.join(', ') : ''}`);

const land = readJson(path.join(OUT, 'land.geojson')).features;
check(land.every((x) => Object.keys(x.properties ?? {}).length === 0), 'land.geojson: không mang thuộc tính/tên từ Natural Earth');

// --- Nhãn tự đặt phải nằm đúng chỗ ------------------------------------------
const vnFeatures = [...prov.features, ...neighbors];
const inAny = (pt, feats) => feats.some((f) => pointInPolygon(pt, f));
const labelsFc = readJson(path.join(OUT, 'region-labels.geojson')).features;
for (const l of labelsFc.filter((x) => x.properties.kind !== 'province')) {
  const pt = l.geometry.coordinates;
  const onLand = inAny(pt, land);
  const inVn = inAny(pt, vnFeatures);
  const ok = l.properties.kind === 'country' ? onLand && !inVn : !onLand && !inVn;
  check(ok, `Nhãn "${l.properties.text}" nằm ${l.properties.kind === 'country' ? 'trên lãnh thổ nước láng giềng' : 'trên biển'}`);
}

console.log('\nDung lượng:');
for (const f of fs.readdirSync(OUT).sort()) console.log(`  ${f.padEnd(22)} ${kb(path.join(OUT, f))}`);

if (failed) {
  console.error(`\n✗ ${failed} kiểm tra không đạt`);
  process.exit(1);
}
console.log('\n✓ Dữ liệu hợp lệ');
