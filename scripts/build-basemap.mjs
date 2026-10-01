// Dựng lớp nền tự vẽ (không dùng raster tile):
//  - land.geojson:  đất liền NGOÀI các tỉnh Việt Nam đã có (chủ yếu là Lào), từ Natural Earth 1:10m.
//  - roads.geojson: đường chính + đường sắt trong tỉnh (OSM).
//  - water.geojson: sông (đường) và hồ/sông rộng (vùng) trong tỉnh (OSM).
// Chỉ lấy hình học và tên đường/sông/hồ từ OSM. KHÔNG lấy tên biển, đảo, quần đảo, quốc gia.
import fs from 'node:fs';
import path from 'node:path';
import { CACHE, OUT, province, readJson, writeJson, kb, mapshaper, viewBounds } from './lib.mjs';

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

writeJson(path.join(OUT, 'roads.geojson'), roads['roads.json']);
writeJson(path.join(OUT, 'water.geojson'), {
  type: 'FeatureCollection',
  features: [...lakes['lakes.json'].features, ...rivers['rivers.json'].features],
});

fs.writeFileSync(
  path.join(OUT, 'meta.json'),
  JSON.stringify({ osmTimestamp: fs.readFileSync(path.join(CACHE, 'osm-timestamp.txt'), 'utf8'), viewBounds: bounds }, null, 2),
);

for (const f of ['land', 'region-labels', 'roads', 'water']) {
  const p = path.join(OUT, `${f}.geojson`);
  console.log(`✓ ${f}.geojson  ${kb(p)}  (${readJson(p).features.length} đối tượng)`);
}
