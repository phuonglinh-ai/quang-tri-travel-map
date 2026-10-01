// localStorage có thể bị chặn (chế độ riêng tư, WebView, hết dung lượng): mọi thao tác bọc try/catch
// (CLAUDE.md quy tắc 7) và ứng dụng vẫn chạy bình thường khi không lưu được.
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
