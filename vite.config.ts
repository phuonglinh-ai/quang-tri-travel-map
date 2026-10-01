import { spawn } from 'node:child_process';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

// Khi chạy `npm run dev`: sửa content/ (bằng Sveltia CMS chế độ cục bộ hoặc sửa tay) thì tự chạy
// scripts/build-places.mjs và tải lại trang, không cần gõ `npm run places`.
function rebuildPlacesOnContentChange(): Plugin {
  return {
    name: 'rebuild-places',
    apply: 'serve',
    configureServer(server) {
      const contentDir = path.resolve('content');
      server.watcher.add(contentDir);
      let timer: ReturnType<typeof setTimeout> | undefined;
      let running = false;
      let again = false;
      const run = () => {
        if (running) { again = true; return; }
        running = true;
        const child = spawn(process.execPath, ['scripts/build-places.mjs'], { stdio: 'inherit' });
        child.on('exit', (code) => {
          running = false;
          if (code === 0) server.ws.send({ type: 'full-reload' });
          else server.config.logger.error('[places] Dữ liệu địa điểm có lỗi, xem thông báo ở trên.');
          if (again) { again = false; run(); }
        });
      };
      server.watcher.on('all', (_event, file) => {
        if (!file.startsWith(contentDir + path.sep)) return;
        clearTimeout(timer);
        timer = setTimeout(run, 400); // CMS ghi nhiều file liên tiếp (ảnh + JSON): gộp lại một lần
      });
    },
  };
}

// GitHub Pages phục vụ site dưới /<tên-repo>/, còn Vercel phục vụ ở gốc: đặt BASE_PATH khi build.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  worker: { format: 'es' },
  plugins: [rebuildPlacesOnContentChange()],
});
