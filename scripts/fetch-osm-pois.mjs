// Tải các điểm quan tâm (POI) từ OpenStreetMap trong bbox tỉnh, làm NGUỒN GỢI Ý cho dữ liệu mẫu.
// Không đưa thẳng lên web: scripts/suggest-places.mjs lọc, phân loại để người biên tập chọn vào
// content/places.json. Dữ liệu © OpenStreetMap contributors (ODbL).
import fs from 'node:fs';
import path from 'node:path';
import { CACHE, provinceDir, geojsonDir, readJson, writeJson, USER_AGENT } from './lib.mjs';

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
const [w, s, e, n] = readJson(path.join(geojsonDir(provinceDir), `${provinceDir}.geojson`)).features[0].bbox;
const bbox = [s, w, n, e].map((x) => x.toFixed(4)).join(',');

const FILTERS = [
  'nwr["tourism"~"^(attraction|museum|viewpoint|hotel|guest_house|hostel|motel|resort|camp_site|theme_park|zoo)$"]["name"]',
  'nwr["historic"]["name"]',
  'nwr["natural"~"^(beach|cave_entrance|peak|bay|cape|spring|waterfall)$"]["name"]',
  'nwr["waterway"="waterfall"]["name"]',
  'nwr["boundary"~"^(national_park|protected_area)$"]["name"]',
  'nwr["leisure"~"^(nature_reserve|park)$"]["name"]',
  'nwr["amenity"~"^(university|college|library|arts_centre|bus_station|ferry_terminal|marketplace|place_of_worship)$"]["name"]',
  'nwr["landuse"="cemetery"]["name"]',
  'nwr["amenity"="grave_yard"]["name"]',
  'nwr["aeroway"="aerodrome"]["name"]',
  'nwr["railway"~"^(station|halt)$"]["name"]',
  'nwr["barrier"="border_control"]["name"]',
  'nwr["craft"]["name"]',
];

const query = `[out:json][timeout:180][bbox:${bbox}];(${FILTERS.join(';')};);out center tags;`;

let json;
for (let attempt = 0; attempt < 3 && !json; attempt++) {
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(240_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      json = await res.json();
      break;
    } catch (err) {
      console.warn(`  ${new URL(url).host}: ${err.message}`);
    }
  }
  if (!json) await new Promise((r) => setTimeout(r, 15_000 * (attempt + 1)));
}
if (!json) throw new Error('Không tải được POI từ Overpass');

const features = json.elements
  .map((el) => {
    const lon = el.lon ?? el.center?.lon;
    const lat = el.lat ?? el.center?.lat;
    if (lon == null || lat == null) return null;
    return {
      type: 'Feature',
      id: `${el.type}/${el.id}`,
      properties: { osmId: `${el.type}/${el.id}`, ...el.tags },
      geometry: { type: 'Point', coordinates: [Math.round(lon * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6] },
    };
  })
  .filter(Boolean);

writeJson(path.join(CACHE, 'osm-pois.geojson'), { type: 'FeatureCollection', features });
fs.writeFileSync(path.join(CACHE, 'osm-pois-timestamp.txt'), json.osm3s?.timestamp_osm_base ?? '');
console.log(`✓ OSM POI: ${features.length} điểm (dữ liệu tới ${json.osm3s?.timestamp_osm_base})`);
