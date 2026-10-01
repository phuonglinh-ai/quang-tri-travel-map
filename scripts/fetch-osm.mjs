// Tải đường chính, đường sắt, sông, hồ từ OpenStreetMap (Overpass API) trong bbox tỉnh.
// Dữ liệu © OpenStreetMap contributors (ODbL). Việc cắt theo ranh giới tỉnh làm ở build-basemap.mjs.
import fs from 'node:fs';
import path from 'node:path';
import osmtogeojson from 'osmtogeojson';
import { CACHE, provinceDir, geojsonDir, readJson, writeJson, kb, USER_AGENT } from './lib.mjs';

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const [w, s, e, n] = readJson(path.join(geojsonDir(provinceDir), `${provinceDir}.geojson`)).features[0].bbox;
const bbox = [s, w, n, e].map((x) => x.toFixed(4)).join(',');

// Chia nhỏ truy vấn để tránh quá tải máy chủ (HTTP 504).
const GROUPS = {
  roads: 'way["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"];',
  rail: 'way["railway"="rail"];',
  rivers: 'way["waterway"~"^(river|canal)$"];',
  water: 'way["natural"="water"]; relation["natural"="water"]; way["waterway"="riverbank"];',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function overpass(body) {
  const query = `[out:json][timeout:180][bbox:${bbox}];(${body});out body;>;out skel qt;`;
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ data: query }),
          signal: AbortSignal.timeout(240_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        console.warn(`  ${new URL(url).host}: ${err.message}`);
      }
    }
    await sleep(15_000 * (attempt + 1));
  }
  throw new Error('Không tải được dữ liệu từ Overpass');
}

const features = [];
let timestamp = '';
for (const [name, body] of Object.entries(GROUPS)) {
  console.log(`→ ${name}`);
  const osm = await overpass(body);
  timestamp = osm.osm3s?.timestamp_osm_base ?? timestamp;
  const fc = osmtogeojson(osm);
  for (const f of fc.features) f.properties = { ...f.properties, _group: name };
  features.push(...fc.features);
  console.log(`  ${fc.features.length} đối tượng`);
}

const out = path.join(CACHE, 'osm-raw.geojson');
writeJson(out, { type: 'FeatureCollection', features });
fs.writeFileSync(path.join(CACHE, 'osm-timestamp.txt'), timestamp);
console.log(`✓ OSM: ${features.length} đối tượng, ${kb(out)} (dữ liệu tới ${timestamp})`);
