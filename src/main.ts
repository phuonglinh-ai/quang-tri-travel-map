// Điểm vào ứng dụng: nối store ↔ bản đồ ↔ panel ↔ URL.
// Panel được dựng ngay khi có dữ liệu; bản đồ (nặng hơn) tải song song và nhận trạng thái khi sẵn sàng.
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import './style.css';
import { PROVINCE } from './config/province';
import { LAYERS } from './config/layers';
import { loadPlaces } from './data/places';
import { createMap, loadWards, setPlaces, type TravelMap, type WardFeature } from './map/map';
import { createStore, type AppState } from './state';
import { createPanel } from './ui/panel';
import { createSheet, isMobile } from './ui/sheet';
import { t } from './i18n';

document.title = `Khám phá ${PROVINCE.name} – Bản đồ tương tác`;

const panelEl = document.getElementById('panel')!;
const [places, wardsFc] = await Promise.all([loadPlaces(), loadWards()]);
const placeById = new Map(places.map((p) => [p.id, p]));
const wards = new Map(wardsFc.features.map((f) => [f.properties.code, f as WardFeature]));
const layersWithData = LAYERS.filter((l) => places.some((p) => p.layer === l.id)).map((l) => l.id);

// --- Trạng thái ban đầu từ URL (?place=, ?ward=, ?layers=, ?saved=) ----------------
const params = new URLSearchParams(location.search);
const layersParam = params.get('layers')?.split(',').filter((id) => layersWithData.includes(id));
const sharedParam = params.get('saved')?.split(',').filter((id) => placeById.has(id));
const store = createStore({
  activeLayers: new Set(layersParam?.length ? layersParam : layersWithData),
  selectedPlace: null,
  selectedWard: null,
  sharedList: sharedParam?.length ? sharedParam : null,
});

let tm: TravelMap | null = null;

function selectPlace(id: string | null) {
  if (id && !placeById.has(id)) id = null;
  // Địa điểm thuộc lớp đang tắt (ví dụ mở từ liên kết): bật lớp đó để ghim hiện trên bản đồ.
  if (id) {
    const layer = placeById.get(id)!.layer;
    if (!store.get().activeLayers.has(layer)) store.toggleLayer(layer, true);
  }
  // Đặt nấc panel trước khi camera di chuyển, để lề camera tính theo nấc mới.
  if (id && isMobile() && sheet.snap !== 'full') sheet.setSnap('half');
  store.set({ selectedPlace: id });
}

function selectWard(code: string | null) {
  if (code && !wards.has(code)) code = null;
  if (isMobile()) sheet.setSnap(code ? 'half' : 'peek');
  store.set({ selectedWard: code, selectedPlace: null });
}

async function share(url: string, title: string) {
  if (navigator.share && isMobile()) {
    try {
      await navigator.share({ url, title });
      return;
    } catch {
      /* người dùng hủy hoặc không hỗ trợ: sao chép liên kết */
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast(t.linkCopied);
  } catch {
    prompt(t.share, url);
  }
}

const panel = createPanel(panelEl, store, places, wards, {
  selectPlace,
  selectWard,
  recenter: () => (store.get().selectedWard ? tm?.showWard(store.get().selectedWard) : tm?.fitProvince()),
  share,
  setBasemapVisible: (ids, visible) => ids.forEach((id) => tm?.map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none')),
  onSearchFocus: () => isMobile() && sheet.setSnap('full'),
});
// Trên điện thoại, khi panel mở lên thì thu ghi nguồn về nút ⓘ ở góc bản đồ (vẫn bấm xem được),
// để không che phần bản đồ còn lại. Khi mới mở trang, ghi nguồn hiển thị đầy đủ.
const sheet = createSheet(panelEl, panelEl.querySelector('.panel-top')!, (snap) => {
  if (snap !== 'peek') document.querySelector('.maplibregl-ctrl-attrib.maplibregl-compact-show')?.classList.remove('maplibregl-compact-show');
});

// Lề camera: phần bản đồ bị panel che không tính là vùng nhìn thấy.
function mapPadding() {
  if (isMobile()) return { top: 56, left: 24, right: 24, bottom: sheet.coveredHeight() + 24 };
  const r = panelEl.getBoundingClientRect();
  return { top: 40, left: r.right + 32, right: 64, bottom: 56 };
}

// --- Store → URL, bản đồ -----------------------------------------------------------
function syncUrl() {
  const s = store.get();
  const url = new URL(location.href);
  const setParam = (k: string, v: string | null) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
  setParam('place', s.selectedPlace);
  setParam('ward', s.selectedPlace ? null : s.selectedWard);
  const all = s.activeLayers.size === layersWithData.length;
  setParam('layers', all ? null : [...s.activeLayers].join(','));
  setParam('saved', s.sharedList?.join(',') ?? null);
  // Giữ dấu phẩy nguyên dạng cho liên kết ngắn gọn (in mã QR, dán tin nhắn).
  history.replaceState(null, '', url.toString().replace(/%2C/g, ','));
}

const visiblePlaces = () => places.filter((p) => store.get().activeLayers.has(p.layer));

function applyToMap(s: AppState, changed: Set<keyof AppState>) {
  if (!tm) return;
  if (changed.has('activeLayers')) setPlaces(tm.map, visiblePlaces());
  if (changed.has('selectedWard')) tm.showWard(s.selectedWard, !s.selectedPlace);
  if (changed.has('selectedPlace')) {
    const p = s.selectedPlace ? placeById.get(s.selectedPlace) : null;
    tm.showPlace(p?.id ?? null, p?.coordinates, p?.mapZoom);
  }
}

store.subscribe((s, changed) => {
  applyToMap(s, changed);
  syncUrl();
});

// --- Mở theo liên kết sâu (mã QR tại điểm thật dùng ?place=<id>) ------------------------
const initialPlace = params.get('place');
const initialWard = params.get('ward');
if (initialPlace && placeById.has(initialPlace)) selectPlace(initialPlace);
else if (initialWard && wards.has(initialWard)) selectWard(initialWard);
else if (store.get().sharedList && isMobile()) sheet.setSnap('half');
syncUrl();

// --- Bàn phím: Esc = quay lại ------------------------------------------------------
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !(e.target as HTMLElement).closest('input')) panel.back();
});

function toast(msg: string) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = msg;
  document.body.append(el);
  setTimeout(() => el.remove(), 2200);
}

// --- Bản đồ ---------------------------------------------------------------------------
tm = await createMap(document.getElementById('map')!, {
  wards: wardsFc,
  padding: mapPadding,
  onWardClick: selectWard,
  onPlaceClick: selectPlace,
});
// Áp toàn bộ trạng thái hiện có (người dùng có thể đã thao tác trên panel khi bản đồ đang tải).
applyToMap(store.get(), new Set(['activeLayers', 'selectedWard', 'selectedPlace']));
