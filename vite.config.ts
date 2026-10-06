import { spawn } from 'node:child_process';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

// Khi chạy `npm run dev`: sửa content/ (bằng Sveltia CMS chế độ cục bộ hoặc sửa tay) thì tự chạy
// scripts/build-places.mjs và scripts/build-routes.mjs rồi tải lại trang, không cần gõ `npm run places`.
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
      // Tuyến phụ thuộc places.json nên phải chạy sau địa điểm.
      const runScripts = (scripts: string[], done: (code: number | null) => void) => {
        const [first, ...rest] = scripts;
        const child = spawn(process.execPath, [first], { stdio: 'inherit' });
        child.on('exit', (code) => (code === 0 && rest.length ? runScripts(rest, done) : done(code)));
      };
      const run = () => {
        if (running) { again = true; return; }
        running = true;
        runScripts(['scripts/build-places.mjs', 'scripts/build-routes.mjs'], (code) => {
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

// Dev server không tự trả public/admin/index.html cho /admin hay /admin/ (mà trả trang bản đồ):
// chuyển hướng để địa chỉ trang quản trị giống trên Vercel.
function adminIndexInDev(): Plugin {
  return {
    name: 'admin-index',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const [pathname, query] = (req.url ?? '').split('?');
        if (pathname !== '/admin' && pathname !== '/admin/') return next();
        res.statusCode = 302;
        res.setHeader('Location', `/admin/index.html${query ? `?${query}` : ''}`);
        res.end();
      });
    },
  };
}

// GitHub Pages phục vụ site dưới /<tên-repo>/, còn Vercel phục vụ ở gốc: đặt BASE_PATH khi build.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  worker: { format: 'es' },
  plugins: [rebuildPlacesOnContentChange(), adminIndexInDev()],
});
