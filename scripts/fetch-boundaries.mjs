// Tải GeoJSON ranh giới hành chính (tỉnh + xã, và các tỉnh lân cận) bằng git sparse checkout.
// Nguồn: https://github.com/thanglequoc/vietnamese-provinces-database (MIT)
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { CACHE, VN_DATA, province, provinceDir, geojsonDir } from './lib.mjs';

const REPO = 'https://github.com/thanglequoc/vietnamese-provinces-database.git';
const git = (...args) => execFileSync('git', args, { cwd: VN_DATA, stdio: 'inherit' });

fs.mkdirSync(CACHE, { recursive: true });
if (!fs.existsSync(VN_DATA)) {
  execFileSync('git', ['clone', '--depth', '1', '--filter=blob:none', '--sparse', REPO, VN_DATA], { stdio: 'inherit' });
} else {
  git('pull', '--ff-only');
}

// Tỉnh chính: lấy cả thư mục wards/. Tỉnh lân cận: chỉ cần file cấp tỉnh.
const dirs = [provinceDir, ...province.neighbors];
git(
  'sparse-checkout', 'set', '--no-cone',
  `/json/geojson/${provinceDir}/`,
  ...province.neighbors.map((d) => `/json/geojson/${d}/${d}.geojson`),
);

for (const d of dirs) {
  if (!fs.existsSync(geojsonDir(d))) throw new Error(`Không tìm thấy thư mục ${d} trong repo`);
}
const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: VN_DATA }).toString().trim();
console.log(`✓ Ranh giới hành chính: ${dirs.join(', ')} (commit ${commit})`);
