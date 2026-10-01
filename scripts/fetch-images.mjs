// Tải ảnh đã chọn (content/image-selection.json: id địa điểm → "File:…" trên Wikimedia Commons)
// về content/images/<id>.jpg (ảnh gốc, tối đa 1600 px) và ghi thông tin ghi công vào content/places/<id>.json.
// Bản cho web (public/images/places/) do `npm run places` tạo.
// Thông tin giấy phép luôn lấy mới từ Commons; ảnh không có giấy phép tự do bị từ chối.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { CACHE, ROOT, readJson, readPlaces, writePlace, LICENSES, IMAGES_SRC_DIR, IMAGES_PUBLIC_PREFIX } from './lib.mjs';

const UA = 'travel-map-image-fetch/0.1 (personal demo project; Wikimedia API etiquette)';
const WIDTH = 1024;
const selection = readJson(path.join(ROOT, 'content', 'image-selection.json'));
const places = new Map(readPlaces().map((p) => [p.id, p.data]));
const licenseNames = new Set(LICENSES.map((l) => l.name));
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

fs.mkdirSync(IMAGES_SRC_DIR, { recursive: true });
const errors = [];
for (const [id, title] of Object.entries(selection)) {
  const place = places.get(id);
  if (!place) { errors.push(`${id}: không có content/places/${id}.json`); continue; }
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
  if (!licenseNames.has(license)) { errors.push(`${id}: giấy phép "${license}" chưa có trong LICENSES (scripts/lib.mjs), cần bổ sung`); continue; }
  const artist = cleanArtist(strip(m.Artist?.value)) || 'Không rõ tác giả';

  // Ảnh tải về giữ trong .cache/; content/images/ chứa bản đã xoay đúng chiều, nén lại.
  const raw = path.join(CACHE, 'images-orig', `.${id}.orig`);
  fs.mkdirSync(path.dirname(raw), { recursive: true });
  if (!fs.existsSync(raw)) {
    fs.writeFileSync(raw, await get(ii.thumburl, false));
    await sleep(800);
  }
  const file = path.join(IMAGES_SRC_DIR, `${id}.jpg`);
  await sharp(fs.readFileSync(raw)).rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true }).toFile(file);
  // Thay ảnh Commons cũ (nếu có), giữ nguyên ảnh tự chụp/cơ quan cung cấp và để chúng đứng trước.
  const own = (place.images ?? []).filter((i) => !i.sourceUrl?.startsWith('https://commons.wikimedia.org/'));
  place.images = [...own, {
    src: `${IMAGES_PUBLIC_PREFIX}${id}.jpg`,
    alt: own.length ? `${place.name} (ảnh Wikimedia Commons)` : place.name,
    credit: artist.length > 80 ? `${artist.slice(0, 77)}…` : artist,
    license,
    ...(m.LicenseUrl?.value ? { licenseUrl: m.LicenseUrl.value } : {}),
    sourceUrl: ii.descriptionurl,
  }];
  writePlace(id, place);
  console.log(`✓ ${id.padEnd(32)} ${license.padEnd(14)} ${artist.slice(0, 36).padEnd(36)} ${Math.round(fs.statSync(file).size / 1024)} KB`);
}

console.log('→ Chạy `npm run places` để tạo ảnh cho web và kiểm tra dữ liệu.');
if (errors.length) {
  errors.forEach((e) => console.error(`✗ ${e}`));
  process.exit(1);
}
