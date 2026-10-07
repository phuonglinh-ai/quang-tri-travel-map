// Kiểm tra content/places/*.json (mỗi địa điểm một file, tên file là id) và xuất public/data/places.json:
//  - đổi "latLng" (vĩ độ, kinh độ — kiểu Google Maps) thành coordinates [kinh độ, vĩ độ];
//  - gán wardCode/wardName bằng point-in-polygon (CLAUDE.md mục 7: không nhập tay);
//  - điểm nằm sát bờ biển/ranh giới ngoài polygon (sai số đơn giản hóa) được gán xã gần nhất, tối đa 1 km;
//  - tạo ảnh cho web từ content/images/ vào public/images/places/ (bản lớn + bản nhỏ);
//  - dừng với mã lỗi nếu dữ liệu sai quy tắc.
// Chạy trong `npm run build` (cả trên Vercel), nên mọi thay đổi từ Sveltia CMS đều được xử lý khi deploy.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import pointInPolygon from '@turf/boolean-point-in-polygon';
import { pointToPolygonDistance } from '@turf/point-to-polygon-distance';
import {
  ROOT, OUT, readJson, writeJson, kb, readPlaces, readFeatured, parseLatLng,
  LICENSES, IMAGES_SRC_DIR, IMAGES_PUBLIC_PREFIX,
} from './lib.mjs';

const MAX_OUTSIDE_KM = 1;
const IMG_OUT_DIR = path.join(ROOT, 'public', 'images', 'places');
const { layers } = readJson(path.join(ROOT, 'src', 'config', 'layers.data.json'));
const wards = readJson(path.join(OUT, 'wards.geojson')).features;
const layerIds = new Set(layers.map((l) => l.id));
const licenseByName = new Map(LICENSES.map((l) => [l.name, l]));
const featured = readFeatured();
const featuredRank = new Map(featured.map((id, i) => [id, i]));

const errors = [];
const warnings = [];
/** Ảnh cần tạo: tên gốc (không đuôi) → file nguồn. */
const imageJobs = new Map();

const out = readPlaces().map(({ id, data: p }) => {
  const at = `content/places/${id}.json`;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) errors.push(`${at}: tên file (id) chỉ gồm a-z, 0-9 và dấu gạch ngang`);
  if (!layerIds.has(p.layer)) errors.push(`${at}: lớp "${p.layer}" không có trong layers.data.json`);
  if (!p.name?.trim()) errors.push(`${at}: thiếu tên`);
  if (!p.summary?.trim()) errors.push(`${at}: thiếu mô tả`);
  // Quy tắc 4: dữ liệu mẫu phải được đánh dấu rõ.
  if (typeof p.isSample !== 'boolean') errors.push(`${at}: thiếu isSample (true/false)`);

  // Ảnh phải có file gốc và đủ thông tin ghi công (giấy phép CC BY/BY-SA bắt buộc ghi tác giả).
  const images = (p.images ?? []).map((img, k) => {
    const where = `${at}: ảnh ${k + 1}`;
    const name = img.src?.startsWith(IMAGES_PUBLIC_PREFIX) ? img.src.slice(IMAGES_PUBLIC_PREFIX.length) : null;
    const srcFile = name && path.join(IMAGES_SRC_DIR, name);
    if (!srcFile || !fs.existsSync(srcFile)) errors.push(`${where}: không có file content/images/${name ?? img.src}`);
    const base = name?.replace(/\.[^.]+$/, '');
    if (base && imageJobs.has(base) && imageJobs.get(base) !== srcFile) errors.push(`${where}: trùng tên ảnh "${base}" với ảnh khác`);
    if (base) imageJobs.set(base, srcFile);

    const license = licenseByName.get(img.license);
    if (!img.alt?.trim()) errors.push(`${where}: thiếu mô tả ảnh (alt)`);
    if (!img.credit?.trim()) errors.push(`${where}: thiếu tác giả`);
    if (!license) errors.push(`${where}: giấy phép "${img.license}" không có trong danh sách LICENSES (scripts/lib.mjs)`);
    const sourceUrl = img.sourceUrl?.trim() || null;
    if (sourceUrl ? !/^https:\/\//.test(sourceUrl) : !license?.ownSource) errors.push(`${where}: thiếu liên kết nguồn https (sourceUrl)`);
    return {
      src: `images/places/${base}.jpg`,
      thumb: `images/places/${base}-sm.jpg`,
      alt: img.alt,
      ...(img.altEn?.trim() && { altEn: img.altEn.trim() }),
      credit: img.credit,
      license: img.license,
      ...(license?.nameEn && { licenseEn: license.nameEn }),
      licenseUrl: img.licenseUrl || license?.url || null,
      sourceUrl,
    };
  });

  for (const l of p.links ?? []) if (!/^https:\/\//.test(l.url)) errors.push(`${at}: liên kết phải là https`);
  if ('featured' in p || 'featuredOrder' in p) warnings.push(`${at}: bỏ qua featured/featuredOrder, dải Nổi bật nay nằm ở content/featured.json`);
  if (p.mapZoom != null && !(p.mapZoom >= 6 && p.mapZoom <= 17)) errors.push(`${at}: mapZoom phải trong khoảng 6–17`);
  for (const m of p.months ?? []) if (!(m >= 1 && m <= 12)) errors.push(`${at}: tháng không hợp lệ ${m}`);

  const coordinates = parseLatLng(p.latLng);
  const [lon, lat] = coordinates ?? [];
  let ward;
  if (!(lon >= 102 && lon <= 110 && lat >= 8 && lat <= 24)) {
    errors.push(`${at}: tọa độ "${p.latLng ?? ''}" không hợp lệ, cần dạng "vĩ độ, kinh độ", ví dụ "16.75393, 107.189536"`);
  } else {
    ward = wards.find((w) => pointInPolygon(coordinates, w));
    if (!ward) {
      const nearest = wards
        .map((w) => ({ w, d: pointToPolygonDistance(coordinates, w, { units: 'kilometers' }) }))
        .sort((a, b) => a.d - b.d)[0];
      if (nearest.d <= MAX_OUTSIDE_KM) {
        ward = nearest.w;
        warnings.push(`${at}: nằm ngoài ranh giới ${Math.round(nearest.d * 1000)} m, gán vào xã gần nhất ${ward.properties.name}`);
      } else {
        errors.push(`${at}: nằm ngoài tỉnh (cách xã gần nhất ${nearest.d.toFixed(1)} km)`);
      }
    }
  }

  const { latLng, featured: _f, featuredOrder: _o, ...rest } = p;
  return {
    id,
    ...rest,
    nameEn: p.nameEn?.trim() || null,
    summaryEn: p.summaryEn?.trim() || undefined,
    coordinates,
    wardCode: ward?.properties.code ?? null,
    wardName: ward?.properties.name ?? null,
    images,
    links: (p.links ?? []).map((l) => ({ label: l.label, ...(l.labelEn?.trim() && { labelEn: l.labelEn.trim() }), url: l.url })),
    months: p.months ?? [],
    featured: featuredRank.has(id),
    extra: p.extra ?? {},
  };
});

const placeIds = new Set(out.map((p) => p.id));
featured.forEach((id, i) => {
  if (!placeIds.has(id)) errors.push(`content/featured.json: vị trí ${i + 1} trỏ tới địa điểm "${id}" không còn tồn tại (đã xóa hoặc đổi tên?)`);
  if (featured.indexOf(id) !== i) errors.push(`content/featured.json: "${id}" xuất hiện nhiều lần`);
});

for (const w of warnings) console.warn(`! ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  process.exit(1);
}

// Ảnh cho web: bản lớn (thẻ địa điểm) và bản nhỏ (carousel, danh sách, ghim), JPEG progressive cho điện thoại.
// Chỉ tạo lại khi ảnh gốc mới hơn; xóa ảnh không còn dùng (thư mục này không commit).
fs.mkdirSync(IMG_OUT_DIR, { recursive: true });
const keep = new Set();
let made = 0;
for (const [base, srcFile] of imageJobs) {
  const big = path.join(IMG_OUT_DIR, `${base}.jpg`);
  const small = path.join(IMG_OUT_DIR, `${base}-sm.jpg`);
  keep.add(path.basename(big)).add(path.basename(small));
  const srcTime = fs.statSync(srcFile).mtimeMs;
  if ([big, small].every((f) => fs.existsSync(f) && fs.statSync(f).mtimeMs >= srcTime)) continue;
  const img = sharp(fs.readFileSync(srcFile)).rotate();
  await img.clone().resize({ width: 960, withoutEnlargement: true }).jpeg({ quality: 76, progressive: true, mozjpeg: true }).toFile(big);
  await img.clone().resize({ width: 480, height: 320, fit: 'cover' }).jpeg({ quality: 72, progressive: true, mozjpeg: true }).toFile(small);
  made++;
}
for (const f of fs.readdirSync(IMG_OUT_DIR)) if (!keep.has(f)) fs.rmSync(path.join(IMG_OUT_DIR, f));

// Thứ tự: điểm nổi bật theo content/featured.json (thứ tự trong carousel), sau đó theo tên.
const rank = (p) => featuredRank.get(p.id) ?? Infinity;
out.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'vi'));
const file = path.join(OUT, 'places.json');
writeJson(file, out);
const counts = {};
for (const p of out) counts[p.layer] = (counts[p.layer] ?? 0) + 1;
const byLayer = Object.entries(counts).map(([k, n]) => `${k} ${n}`);
console.log(`✓ places.json  ${kb(file)}  ${out.length} địa điểm (${out.filter((p) => p.isSample).length} mẫu): ${byLayer.join(', ')}`);
console.log(`✓ ảnh  ${imageJobs.size} ảnh (tạo mới ${made})`);
console.log(`✓ tiếng Anh  tên ${out.filter((p) => p.nameEn).length}/${out.length}, mô tả ${out.filter((p) => p.summaryEn).length}/${out.length} (chưa nhập thì hiển thị tiếng Việt)`);
