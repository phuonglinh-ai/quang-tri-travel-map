// Dựng lớp nền tự vẽ (không dùng raster tile):
//  - land.geojson:  đất liền NGOÀI các tỉnh Việt Nam đã có (chủ yếu là Lào), từ Natural Earth 1:10m.
//  - roads.geojson: đường chính + đường sắt trong tỉnh (OSM), kèm tên đường đã làm sạch (`label`).
//  - road-shields.geojson: tuyến có số hiệu (CT, QL, HCM, ĐT) đã chuẩn hóa và nối liền, để đặt biển số.
//  - water.geojson: sông (đường) và hồ/sông rộng (vùng) trong tỉnh (OSM).
// Chỉ lấy hình học và tên đường/sông/hồ từ OSM. KHÔNG lấy tên biển, đảo, quần đảo, quốc gia.
import fs from 'node:fs';
import path from 'node:path';
import { CACHE, OUT, province, readJson, writeJson, kb, mapshaper, viewBounds, distanceKm } from './lib.mjs';
import { knownNationalRefs, shieldOf, roadLabel, mergeLines, linesOf, lineGeometry } from './road-labels.mjs';

const PRECISION = 0.00001;
const provinceFc = readJson(path.join(OUT, 'province.geojson'));
const neighborsFc = readJson(path.join(OUT, 'neighbors.geojson'));
const bounds = viewBounds();

// --- Đất liền ngoài tỉnh ---------------------------------------------------
// Xóa phần đã có polygon tỉnh (dùng chính hình học đã đơn giản hóa để hai lớp khớp mép, không hở),
// rồi bỏ các mảnh nhỏ: đó là sai lệch đường bờ biển giữa Natural Earth và dữ liệu chính thức,
// cùng các đảo không thuộc nguồn chính thức. Mảnh lớn còn lại là lãnh thổ Lào.
const vnFc = { type: 'FeatureCollection', features: [...provinceFc.features, ...neighborsFc.features] };
const land = await mapshaper(
  [
    '-i land.json name=land',
    `-clip bbox=${bounds.join(',')}`,
    '-erase vn.json',
    '-explode',
    '-filter "this.area > 500e6"',
    '-simplify interval=100',
    '-filter-fields',
    `-o format=geojson geojson-type=FeatureCollection precision=${PRECISION}`,
  ].join(' '),
  { 'land.json': fs.readFileSync(path.join(CACHE, 'ne_10m_land.geojson'), 'utf8'), 'vn.json': vnFc },
);
writeJson(path.join(OUT, 'land.geojson'), land['land.json']);

// --- Điểm đặt nhãn vùng lân cận ----------------------------------------------
// Tên tỉnh lấy từ dữ liệu chính thức, điểm đặt tính trên phần nằm trong khung nhìn.
// Tên nước láng giềng và tên biển do dự án tự đặt (cấu hình), không lấy từ OSM/Natural Earth;
// verify-data.mjs kiểm tra các điểm này nằm đúng trên đất Lào / trên biển.
const labelPts = await mapshaper(
  [
    '-i neighbors.json name=neighbors',
    `-clip bbox=${bounds.join(',')}`,
    '-points inner',
    '-o format=geojson geojson-type=FeatureCollection precision=0.0001',
  ].join(' '),
  { 'neighbors.json': neighborsFc },
);
const point = (kind, text, coordinates) => ({ type: 'Feature', properties: { kind, text }, geometry: { type: 'Point', coordinates } });
writeJson(path.join(OUT, 'region-labels.geojson'), {
  type: 'FeatureCollection',
  features: [
    ...labelPts['neighbors.json'].features.map((f) => point('province', f.properties.name, f.geometry.coordinates)),
    point('country', province.neighborCountryLabel.text, province.neighborCountryLabel.coordinates),
    point('sea', province.seaLabel.text, province.seaLabel.coordinates),
  ],
});

// --- OSM: đường, đường sắt, sông, hồ ---------------------------------------
const osm = readJson(path.join(CACHE, 'osm-raw.geojson'));
const ROAD_CLASSES = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary']);
const MIN_WATER_M2 = 100_000; // bỏ ao, hồ dưới 10 ha
const LINE_SIMPLIFY_M = 30;

const lines = [];
const waterAreas = [];
for (const f of osm.features) {
  const t = f.properties;
  const g = f.geometry;
  const isLine = g.type === 'LineString' || g.type === 'MultiLineString';
  const isArea = g.type === 'Polygon' || g.type === 'MultiPolygon';
  let props = null;
  if (isLine && ROAD_CLASSES.has(t.highway)) props = { kind: 'road', class: t.highway, ref: t.ref ?? null, name: t.name ?? null };
  else if (isLine && t.railway === 'rail') props = { kind: 'rail', class: 'rail', ref: null, name: null };
  else if (isLine && (t.waterway === 'river' || t.waterway === 'canal')) props = { kind: 'river', class: t.waterway, ref: null, name: t.name ?? null };
  else if (isArea && (t.natural === 'water' || t.waterway === 'riverbank')) {
    waterAreas.push({ type: 'Feature', properties: { kind: 'water', class: t.water ?? 'water', name: t.name ?? null }, geometry: g });
  }
  if (props) lines.push({ type: 'Feature', properties: props, geometry: g });
}

const clip = (layer) => [
  `-i ${layer}.json name=${layer}`,
  '-clip province.json',
];
const roads = await mapshaper(
  [
    ...clip('roads'),
    // Gộp các đoạn cùng loại, cùng số hiệu, cùng tên thành một đối tượng để giảm dung lượng.
    '-dissolve kind,class,ref,name',
    `-simplify interval=${LINE_SIMPLIFY_M}`,
    `-o format=geojson precision=${PRECISION}`,
  ].join(' '),
  { 'roads.json': { type: 'FeatureCollection', features: lines.filter((f) => f.properties.kind !== 'river') }, 'province.json': provinceFc },
);
const rivers = await mapshaper(
  [
    ...clip('rivers'),
    '-dissolve kind,class,name',
    `-simplify interval=${LINE_SIMPLIFY_M}`,
    `-o format=geojson precision=${PRECISION}`,
  ].join(' '),
  { 'rivers.json': { type: 'FeatureCollection', features: lines.filter((f) => f.properties.kind === 'river') }, 'province.json': provinceFc },
);
const lakes = await mapshaper(
  [
    ...clip('lakes'),
    '-explode',
    `-filter "this.area > ${MIN_WATER_M2}"`,
    `-simplify interval=${LINE_SIMPLIFY_M} keep-shapes`,
    `-o format=geojson precision=${PRECISION}`,
  ].join(' '),
  { 'lakes.json': { type: 'FeatureCollection', features: waterAreas }, 'province.json': provinceFc },
);

// --- Biển số và tên đường ----------------------------------------------------
// Biển số: gom các đoạn cùng số hiệu (bỏ qua tên: mỗi cây cầu, mỗi phố trên quốc lộ là một tên riêng) rồi nối liền,
// để MapLibre đặt biển số đều theo khoảng cách trên cả tuyến thay vì một biển trên mỗi đoạn ngắn.
// Chuỗi quá ngắn (mảnh cắt ở ranh giới tỉnh, nhánh nút giao) bị bỏ: chỉ làm biển số mọc dày ở một chỗ.
const MIN_SHIELD_CHAIN_KM = 0.5;
const lengthKm = (l) => l.slice(1).reduce((a, p, i) => a + distanceKm(l[i], p), 0);
const knownQL = knownNationalRefs(osm.features.map((f) => f.properties.ref));
const shieldGroups = new Map();
for (const f of roads['roads.json'].features) {
  const p = f.properties;
  if (p.kind !== 'road') continue;
  const s = shieldOf({ ref: p.ref, name: p.name, cls: p.class }, knownQL);
  // Tên đường ghi dọc theo nét đường (thuộc tính `label` của roads.geojson); nối các mảnh của cùng
  // một đối tượng để tên có đủ chiều dài hiển thị.
  const label = roadLabel(p.name, !!s);
  if (label) p.label = label;
  f.geometry = lineGeometry(mergeLines(linesOf(f.geometry)));
  if (!s) continue;
  if (!shieldGroups.has(s.shield)) shieldGroups.set(s.shield, { props: s, lines: [] });
  shieldGroups.get(s.shield).lines.push(...linesOf(f.geometry));
}
writeJson(path.join(OUT, 'roads.geojson'), roads['roads.json']);
const shieldFc = {
  type: 'FeatureCollection',
  features: [...shieldGroups.values()]
    .map(({ props, lines }) => ({ props, chains: mergeLines(lines).filter((l) => lengthKm(l) >= MIN_SHIELD_CHAIN_KM) }))
    .filter(({ chains }) => chains.length)
    .sort((a, b) => a.props.shield.localeCompare(b.props.shield, 'vi', { numeric: true }))
    .map(({ props, chains }) => ({ type: 'Feature', properties: props, geometry: lineGeometry(chains) })),
};
// Đường dẫn của biển số chỉ dùng để đặt vị trí (không vẽ nét), nên đơn giản hóa mạnh hơn nét đường
// để giảm dung lượng (lệch tối đa vài pixel ở zoom 14).
const SHIELD_SIMPLIFY_M = 50;
const shieldsOut = await mapshaper(
  `-i shields.json -simplify interval=${SHIELD_SIMPLIFY_M} -o format=geojson precision=${PRECISION}`,
  { 'shields.json': shieldFc },
);
writeJson(path.join(OUT, 'road-shields.geojson'), shieldsOut['shields.json']);
writeJson(path.join(OUT, 'water.geojson'), {
  type: 'FeatureCollection',
  features: [...lakes['lakes.json'].features, ...rivers['rivers.json'].features],
});

fs.writeFileSync(
  path.join(OUT, 'meta.json'),
  JSON.stringify({ osmTimestamp: fs.readFileSync(path.join(CACHE, 'osm-timestamp.txt'), 'utf8'), viewBounds: bounds }, null, 2),
);

for (const f of ['land', 'region-labels', 'roads', 'road-shields', 'water']) {
  const p = path.join(OUT, `${f}.geojson`);
  console.log(`✓ ${f}.geojson  ${kb(p)}  (${readJson(p).features.length} đối tượng)`);
}
