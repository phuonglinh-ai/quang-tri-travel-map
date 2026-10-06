// Trạng thái ứng dụng, luồng một chiều: thao tác → store.set() → các thành phần đăng ký cập nhật.
import { PROVINCE } from './config/province';
import { readJson, writeJson } from './lib/storage';

export interface AppState {
  /** Lớp địa điểm đang bật. */
  activeLayers: Set<string>;
  selectedPlace: string | null;
  selectedWard: string | null;
  /** Tháng đang chọn trên lịch mùa vụ (1–12); null = không lọc theo mùa. */
  month: number | null;
  /** Khi có tháng: chỉ hiện trên bản đồ các điểm đang vào mùa (mặc định chỉ làm mờ điểm còn lại). */
  monthOnly: boolean;
  /** Địa điểm đã lưu trên thiết bị (localStorage). */
  saved: string[];
  /** Danh sách mở từ liên kết chia sẻ (?saved=), không ghi đè danh sách của người dùng. */
  sharedList: string[] | null;
}

type Key = keyof AppState;
type Listener = (state: AppState, changed: Set<Key>) => void;

const SAVED_KEY = `travel-map:${PROVINCE.code}:saved`;

export function createStore(initial: Omit<AppState, 'saved'>) {
  const loaded = readJson<unknown>(SAVED_KEY, []);
  const state: AppState = { ...initial, saved: Array.isArray(loaded) ? loaded.filter((x) => typeof x === 'string') : [] };
  const listeners: Listener[] = [];

  function set(patch: Partial<AppState>) {
    const changed = new Set<Key>();
    for (const [k, v] of Object.entries(patch) as [Key, never][]) {
      if (state[k] !== v) {
        (state[k] as unknown) = v;
        changed.add(k);
      }
    }
    if (changed.has('saved')) writeJson(SAVED_KEY, state.saved);
    if (changed.size) listeners.forEach((l) => l(state, changed));
  }

  return {
    get: () => state,
    set,
    subscribe(l: Listener) {
      listeners.push(l);
    },
    toggleSaved(id: string) {
      set({ saved: state.saved.includes(id) ? state.saved.filter((x) => x !== id) : [...state.saved, id] });
    },
    toggleLayer(id: string, on?: boolean) {
      const next = new Set(state.activeLayers);
      if (on ?? !next.has(id)) next.add(id);
      else next.delete(id);
      set({ activeLayers: next });
    },
  };
}

export type Store = ReturnType<typeof createStore>;
