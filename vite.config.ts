import { defineConfig } from 'vite';

// GitHub Pages phục vụ site dưới /<tên-repo>/, còn Vercel phục vụ ở gốc: đặt BASE_PATH khi build.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  worker: { format: 'es' },
});
