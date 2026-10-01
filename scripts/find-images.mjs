// Tìm ảnh ỨNG VIÊN trên Wikimedia Commons cho các địa điểm, để người biên tập chọn.
// Nguồn: Wikidata (ảnh chính P18, nhóm ảnh Commons P373) + tìm theo tên trên Commons.
// Kết quả: .cache/image-candidates.json (không đưa thẳng lên web).
// Chạy: node scripts/find-images.mjs id1 id2 ...   (không truyền id = các điểm nổi bật)
import path from 'node:path';
import { CACHE, ROOT, readJson, writeJson, distanceKm } from './lib.mjs';

const UA = 'travel-map-image-finder/0.1 (personal demo project; Wikimedia API etiquette)';
const places = readJson(path.join(ROOT, 'content', 'places.json'));
const osm = new Map(readJson(path.join(CACHE, 'osm-pois.geojson')).features.map((f) => [f.properties.osmId, f.properties]));
const ids = process.argv.slice(2);
const targets = ids.length ? places.filter((p) => ids.includes(p.id)) : places.filter((p) => p.featured);

// Chỉ nhận giấy phép cho phép dùng lại kể cả thương mại.
const FREE = /^(cc0|public domain|pd|cc by(-sa)? \d(\.\d)?( [a-z]+)?|cc-by(-sa)?-\d(\.\d)?)/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Giãn cách request và tôn trọng Retry-After để không bị giới hạn (HTTP 429).
let last = 0;
const api = async (base, params) => {
  const url = `${base}?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`;
  for (let i = 0; i < 6; i++) {
    await sleep(Math.max(0, last + 800 - Date.now()));
    last = Date.now();
    let res;
    try {
      res = await fetch(url, { headers: { 'User-Agent': UA } });
    } catch {
      await sleep(3000 * (i + 1)); // lỗi mạng tạm thời: thử lại
      continue;
    }
    if (res.ok) return res.json();
    const wait = Number(res.headers.get('retry-after')) || 2;
    await sleep(wait * 1000 * (i + 1));
  }
  throw new Error(`API lỗi: ${url}`);
};
// Truy vấn chỉ định cho điểm mà tìm theo tên cho kết quả nhiễu: "Category:…" hoặc từ khóa tìm kiếm.
const QUERIES = {
  'hien-luong-ben-hai': ['Category:Hien Luong Bridge', 'Hien Luong bridge Ben Hai'],
  'nghia-trang-duong-9': ['Road 9 National Cemetery', 'Nghia trang Duong 9 Dong Ha'],
  'nha-tu-lao-bao': ['Lao Bao prison', 'Nhà đày Lao Bảo'],
  'san-bay-ta-con': ['Category:Khe Sanh Combat Base', 'Ta Con airfield Khe Sanh museum'],
  'cao-diem-rockpile': ['Rockpile Quang Tri', 'The Rockpile Vietnam'],
  'doc-mieu': ['Doc Mieu McNamara line', 'Con Thien Doc Mieu'],
  'di-tich-lang-vay': ['Lang Vei special forces camp', 'Lang Vei'],
  'hang-tam-co': ['Hang Tam Co', 'Eight ladies cave Phong Nha'],
  'mo-dai-tuong-vo-nguyen-giap': ['Vo Nguyen Giap tomb Vung Chua', 'Mộ Võ Nguyên Giáp'],
  'suoi-nuoc-mooc': ['Nuoc Mooc', 'Mooc spring Phong Nha'],
  'la-vang': ['La Vang basilica Quang Tri', 'Thánh địa La Vang'],
  'thanh-duong-tam-toa': ['Tam Toa church Dong Hoi', 'Nhà thờ Tam Tòa'],
  'dong-tien-son': ['Tien Son cave Phong Nha'],
  'hai-dang-con-co': ['Con Co island Quang Tri', 'Cồn Cỏ'],
  'gieng-co-gio-an': ['Gio An ancient wells', 'Giếng cổ Gio Linh'],
  'bao-tang-quang-tri': ['Khe Sanh museum', 'Khe Sanh Victory museum'],
};
// Mã Wikidata chỉ định khi tìm theo tên khớp nhầm (ví dụ trùng tên với nơi khác).
const WIKIDATA = {
  'thanh-duong-tam-toa': 'Q7680488',
  'la-vang': null,
  'dong-tien-son': null,
  'hai-dang-con-co': null,
  'gieng-co-gio-an': null,
  'bao-tang-quang-tri': null,
};

const WD = 'https://www.wikidata.org/w/api.php';
const CM = 'https://commons.wikimedia.org/w/api.php';
const strip = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function wikidataFor(p) {
  if (p.id in WIKIDATA) return WIKIDATA[p.id];
  const tag = osm.get(p.source?.osm)?.wikidata;
  if (tag) return tag;
  const r = await api(WD, { action: 'wbsearchentities', search: p.name, language: 'vi', uselang: 'vi', limit: '5' });
  return r.search?.[0]?.id ?? null;
}

async function candidates(p) {
  const titles = new Set();
  const qid = await wikidataFor(p);
  let wdLabel = null;
  if (qid) {
    const e = (await api(WD, { action: 'wbgetentities', ids: qid, props: 'claims|labels', languages: 'vi|en' })).entities[qid];
    wdLabel = e?.labels?.vi?.value ?? e?.labels?.en?.value ?? null;
    for (const c of e?.claims?.P18 ?? []) titles.add(`File:${c.mainsnak.datavalue.value}`);
    const cat = e?.claims?.P373?.[0]?.mainsnak?.datavalue?.value;
    if (cat) {
      const r = await api(CM, { action: 'query', list: 'categorymembers', cmtitle: `Category:${cat}`, cmtype: 'file', cmlimit: '20' });
      for (const m of r.query?.categorymembers ?? []) titles.add(m.title);
    }
  }
  const queries = QUERIES[p.id] ?? [p.name, p.nameEn].filter(Boolean);
  for (const q of queries) {
    if (q.startsWith('Category:')) {
      const r = await api(CM, { action: 'query', list: 'categorymembers', cmtitle: q, cmtype: 'file', cmlimit: '30' });
      for (const m of r.query?.categorymembers ?? []) titles.add(m.title);
      continue;
    }
    const r = await api(CM, { action: 'query', list: 'search', srsearch: `${q} filetype:bitmap`, srnamespace: '6', srlimit: '12' });
    for (const m of r.query?.search ?? []) titles.add(m.title);
  }
  const list = [...titles].slice(0, 40);
  const out = [];
  for (let i = 0; i < list.length; i += 20) {
    const r = await api(CM, {
      action: 'query', titles: list.slice(i, i + 20).join('|'), prop: 'imageinfo',
      iiprop: 'url|extmetadata|size|mime', iiurlwidth: '480',
    });
    for (const pg of Object.values(r.query?.pages ?? {})) {
      const ii = pg.imageinfo?.[0];
      if (!ii || !/jpeg|png|webp/.test(ii.mime)) continue;
      const m = ii.extmetadata ?? {};
      const license = m.LicenseShortName?.value ?? '';
      const lat = parseFloat(m.GPSLatitude?.value);
      const lon = parseFloat(m.GPSLongitude?.value);
      out.push({
        title: pg.title,
        thumb: ii.thumburl,
        page: ii.descriptionurl,
        width: ii.width,
        height: ii.height,
        license,
        licenseUrl: m.LicenseUrl?.value ?? null,
        free: FREE.test(license) && !/nc|nd/i.test(license),
        artist: strip(m.Artist?.value),
        description: strip(m.ImageDescription?.value).slice(0, 200),
        distKm: Number.isFinite(lat) && Number.isFinite(lon) ? Math.round(distanceKm(p.coordinates, [lon, lat]) * 10) / 10 : null,
        fromWikidata: pg.title === list[0] && qid != null,
      });
    }
  }
  return { id: p.id, name: p.name, qid, wdLabel, candidates: out };
}

// Lưu dần sau mỗi địa điểm; chạy lại thì bỏ qua các điểm đã có.
const outFile = path.join(CACHE, 'image-candidates.json');
let results = [];
try { results = readJson(outFile); } catch { /* chưa có */ }
for (const p of targets) {
  if (results.some((r) => r.id === p.id)) continue;
  const r = await candidates(p);
  results.push(r);
  writeJson(outFile, results);
  const ok = r.candidates.filter((c) => c.free && c.width >= 800);
  console.log(`${p.id.padEnd(32)} ${String(r.qid ?? '-').padEnd(11)} ${ok.length}/${r.candidates.length} ảnh dùng được`);
}
