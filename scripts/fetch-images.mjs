// Tải ảnh đã chọn (content/image-selection.json: id địa điểm → "File:…" trên Wikimedia Commons)
// về public/images/places/<id>.jpg và ghi thông tin ghi công vào content/places.json.
// Thông tin giấy phép luôn lấy mới từ Commons; ảnh không có giấy phép tự do bị từ chối.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { CACHE, ROOT, readJson } from './lib.mjs';

const UA = 'travel-map-image-fetch/0.1 (personal demo project; Wikimedia API etiquette)';
const WIDTH = 1024;
const OUT_DIR = path.join(ROOT, 'public', 'images', 'places');
const selection = readJson(path.join(ROOT, 'content', 'image-selection.json'));
const placesFile = path.join(ROOT, 'content', 'places.json');
const places = readJson(placesFile);
const FREE = /^(cc0|public domain|pd|cc by(-sa)? \d(\.\d)?( [a-z]+)?|cc-by(-sa)?-\d(\.\d)?)/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, asJson = true) {
  for (let i = 0; i < 6; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.ok) return asJson ? res.json() : Buffer.from(await res.arrayBuffer());
      await sleep((Number(res.headers.get('retry-after')) || 2) * 1000 * (i + 1));
    } catch {
      await sleep(3000 * (i + 1));
    }
  }
  throw new Error(`Không tải được: ${url}`);
}
const strip = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
// Làm gọn tên tác giả lấy từ Commons: bỏ liên kết "thảo luận/talk", tiền tố "vi:User:".
const cleanArtist = (a) =>
  a
    .replace(/\s*\((thảo luận|talk|discussion)\)/gi, '')
    .replace(/^[a-z]{2}:User:/i, '')
    .replace(/^The original uploader was (.*?)\.?$/i, '$1')
    .trim();

fs.mkdirSync(OUT_DIR, { recursive: true });
const errors = [];
for (const [id, title] of Object.entries(selection)) {
  const place = places.find((p) => p.id === id);
  if (!place) { errors.push(`${id}: không có trong places.json`); continue; }
  const q = new URLSearchParams({
    action: 'query', format: 'json', titles: title, prop: 'imageinfo',
    iiprop: 'url|extmetadata|mime', iiurlwidth: String(WIDTH),
  });
  const page = Object.values((await get(`https://commons.wikimedia.org/w/api.php?${q}`)).query.pages)[0];
  const ii = page.imageinfo?.[0];
  if (!ii) { errors.push(`${id}: không tìm thấy ${title}`); continue; }
  const m = ii.extmetadata ?? {};
  const license = m.LicenseShortName?.value ?? '';
  if (!FREE.test(license) || /nc|nd/i.test(license)) { errors.push(`${id}: giấy phép không phù hợp "${license}"`); continue; }
  const artist = cleanArtist(strip(m.Artist?.value)) || 'Không rõ tác giả';

  // Ảnh lớn (thẻ địa điểm) và ảnh nhỏ (carousel), nén JPEG progressive cho điện thoại.
  const file = path.join(OUT_DIR, `${id}.jpg`);
  const small = path.join(OUT_DIR, `${id}-sm.jpg`);
  // Ảnh gốc giữ trong .cache/ (không nằm trong public/, để không bị đưa lên web).
  const raw = path.join(CACHE, 'images-orig', `.${id}.orig`);
  fs.mkdirSync(path.dirname(raw), { recursive: true });
  if (!fs.existsSync(raw)) {
    fs.writeFileSync(raw, await get(ii.thumburl, false));
    await sleep(800);
  }
  const img = sharp(fs.readFileSync(raw)).rotate();
  await img.clone().resize({ width: 960, withoutEnlargement: true }).jpeg({ quality: 76, progressive: true, mozjpeg: true }).toFile(file);
  await img.clone().resize({ width: 480, height: 320, fit: 'cover' }).jpeg({ quality: 72, progressive: true, mozjpeg: true }).toFile(small);
  place.images = [{
    src: `images/places/${id}.jpg`,
    thumb: `images/places/${id}-sm.jpg`,
    alt: place.name,
    credit: artist.length > 80 ? `${artist.slice(0, 77)}…` : artist,
    license,
    licenseUrl: m.LicenseUrl?.value ?? null,
    sourceUrl: ii.descriptionurl,
  }];
  const kb = (f) => Math.round(fs.statSync(f).size / 1024);
  console.log(`✓ ${id.padEnd(32)} ${license.padEnd(14)} ${artist.slice(0, 36).padEnd(36)} ${kb(file)} KB / ${kb(small)} KB`);
}

fs.writeFileSync(placesFile, `${JSON.stringify(places, null, 2)}\n`);
if (errors.length) {
  errors.forEach((e) => console.error(`✗ ${e}`));
  process.exit(1);
}
