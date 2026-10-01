// Tải lớp đất liền Natural Earth 1:10m (public domain) để tô phần đất ngoài tỉnh (các tỉnh lân cận, Lào)
// khác màu với biển. Chỉ lấy hình học, KHÔNG dùng tên hay ranh giới quốc gia từ nguồn này.
import fs from 'node:fs';
import path from 'node:path';
import { CACHE, kb, USER_AGENT } from './lib.mjs';

const URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson';
const out = path.join(CACHE, 'ne_10m_land.geojson');

if (fs.existsSync(out)) {
  console.log(`✓ Natural Earth land: đã có sẵn (${kb(out)})`);
} else {
  const res = await fetch(URL, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  console.log(`✓ Natural Earth land: ${kb(out)}`);
}
