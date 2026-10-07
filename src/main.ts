// Điểm vào ứng dụng: nối store ↔ bản đồ ↔ panel ↔ URL.
// Panel được dựng ngay khi có dữ liệu; bản đồ (nặng hơn) tải song song và nhận trạng thái khi sẵn sàng.
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import './style.css';
import { provinceName } from './config/province';
import { LAYERS } from './config/layers';
import { loadPlaces } from './data/places';
import { loadRoutes } from './data/routes';
import { placeName } from './data/places';
import { THEME_BY_ID } from './config/routes';
import type { RouteView } from './map/route-layer';
import { createMap, loadWards, setPlaces, type TravelMap, type WardFeature } from './map/map';
import { createStore, initialLang, type AppState } from './state';
import { parseMonth } from './lib/months';
import { createPanel } from './ui/panel';
import { createSheet, isMobile } from './ui/sheet';
import { setLang, t } from './i18n';

const panelEl = document.getElementById('panel')!;
const [places, wardsFc, routes] = await Promise.all([loadPlaces(), loadWards(), loadRoutes()]);
const placeById = new Map(places.map((p) => [p.id, p]));
const routeById = new Map(routes.map((r) => [r.id, r]));
const wards = new Map(wardsFc.features.map((f) => [f.properties.code, f as WardFeature]));
const layersWithData = LAYERS.filter((l) => places.some((p) => p.layer === l.id)).map((l) => l.id);

// --- Trạng thái ban đầu từ URL (?place=, ?ward=, ?layers=, ?saved=, ?route=, ?month=, ?lang=) ---------
const params = new URLSearchParams(location.search);
const lang = initialLang(params.get('lang'));
setLang(lang); // đặt trước khi dựng panel để mọi chuỗi đầu tiên đã đúng ngôn ngữ
const layersParam = params.get('layers')?.split(',').filter((id) => layersWithData.includes(id));
const sharedParam = params.get('saved')?.split(',').filter((id) => placeById.has(id));
const store = createStore({
  lang,
  activeLayers: new Set(layersParam?.length ? layersParam : layersWithData),
  selectedPlace: null,
  selectedWard: null,
  route: routeById.has(params.get('route') ?? '') ? params.get('route') : null,
  month: parseMonth(params.get('month')),
  monthOnly: params.get('only') === '1',
  sharedList: sharedParam?.length ? sharedParam : null,
});

let tm: TravelMap | null = null;

/** Văn bản tĩnh của trang theo ngôn ngữ: thuộc tính lang, tiêu đề, mô tả, nhãn trợ năng. */
function applyDocumentLanguage() {
  document.documentElement.lang = store.get().lang;
  document.title = t.docTitle(provinceName());
  document.querySelector('meta[name="description"]')?.setAttribute('content', t.metaDescription);
  document.getElementById('map')?.setAttribute('aria-label', t.mapLabel);
  panelEl.setAttribute('aria-label', t.panelLabel);
}
// Phải đăng ký trước panel: panel dựng lại nội dung ngay khi ngôn ngữ đổi nên cần `t` đã chuyển.
store.subscribe((s, changed) => {
  if (!changed.has('lang')) return;
  setLang(s.lang);
  applyDocumentLanguage();
});
applyDocumentLanguage();

function selectPlace(id: string | null) {
  if (id && !placeById.has(id)) id = null;
  // Mở địa điểm không thuộc tuyến đang xem (ví dụ từ tìm kiếm): rời khỏi tuyến.
  const route = routeById.get(store.get().route ?? '');
  if (id && route && !route.stops.some((s) => s.place === id)) store.set({ route: null });
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
  store.set({ selectedWard: code, selectedPlace: null, route: null });
}

function selectRoute(id: string | null) {
  if (id && !routeById.has(id)) id = null;
  // Đặt nấc panel trước khi camera di chuyển, để lề camera tính theo nấc mới.
  if (id && isMobile() && sheet.snap === 'peek') sheet.setSnap('half');
  store.set({ route: id, selectedPlace: null, selectedWard: null });
}

/** Dữ liệu vẽ tuyến trên bản đồ (đường, ghim số theo thứ tự điểm dừng). */
function routeView(id: string, activeId: string | null): RouteView {
  const r = routeById.get(id)!;
  return {
    color: THEME_BY_ID.get(r.theme)!.color,
    line: r.line,
    stops: r.stops.map((s) => ({ id: s.place, name: placeName(placeById.get(s.place)!), coordinates: placeById.get(s.place)!.coordinates })),
    activeId,
  };
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

const panel = createPanel(panelEl, store, places, routes, wards, {
  selectPlace,
  selectRoute,
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
  setParam('lang', s.lang === 'en' ? 'en' : null);
  setParam('route', s.route);
  setParam('place', s.selectedPlace);
  setParam('ward', s.selectedPlace ? null : s.selectedWard);
  const all = s.activeLayers.size === layersWithData.length;
  setParam('layers', all ? null : [...s.activeLayers].join(','));
  setParam('month', s.month ? String(s.month) : null);
  setParam('only', s.month && s.monthOnly ? '1' : null);
  setParam('saved', s.sharedList?.join(',') ?? null);
  // Giữ dấu phẩy nguyên dạng cho liên kết ngắn gọn (in mã QR, dán tin nhắn).
  history.replaceState(null, '', url.toString().replace(/%2C/g, ','));
}

// Điểm đang mở luôn hiện, kể cả khi bị lọc theo mùa.
const visiblePlaces = () => {
  const s = store.get();
  // Khi xem tuyến, các điểm dừng được vẽ bằng ghim số riêng; ẩn các địa điểm khác cho bản đồ gọn.
  if (s.route) return [];
  const onlyMonth = s.month !== null && s.monthOnly;
  return places.filter((p) => s.activeLayers.has(p.layer) && (!onlyMonth || p.months.includes(s.month!) || p.id === s.selectedPlace));
};

function applyToMap(s: AppState, changed: Set<keyof AppState>) {
  if (!tm) return;
  const filterByMonth = s.month !== null && s.monthOnly;
  if (changed.has('lang')) tm.setLanguage(s.lang);
  if (changed.has('lang') || changed.has('route') || changed.has('activeLayers') || changed.has('month') || changed.has('monthOnly') || (filterByMonth && changed.has('selectedPlace'))) setPlaces(tm.map, visiblePlaces(), s.month);
  if (changed.has('route') || (changed.has('lang') && s.route)) {
    tm.showRoute(s.route ? routeView(s.route, s.selectedPlace) : null);
    if (changed.has('lang') && !changed.has('route')) {
      /* chỉ đổi tên trên ghim số: giữ nguyên khung nhìn */
    } else if (s.route && !s.selectedPlace) tm.fitRoute(routeById.get(s.route)!.bbox);
    else if (!s.route && !s.selectedPlace && !s.selectedWard) tm.fitProvince();
  } else if (changed.has('selectedPlace') && s.route) {
    tm.setRouteActive(s.selectedPlace);
    if (!s.selectedPlace) tm.fitRoute(routeById.get(s.route)!.bbox);
  }
  // Đang xem tuyến thì camera do tuyến điều khiển, không để bước "về toàn tỉnh" ghi đè.
  if (changed.has('selectedWard')) tm.showWard(s.selectedWard, !s.selectedPlace && !s.route);
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
if (store.get().route && isMobile()) sheet.setSnap('half');
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
applyToMap(store.get(), new Set<keyof AppState>(['activeLayers', 'selectedWard', 'selectedPlace', 'month', 'route', ...(lang === 'en' ? (['lang'] as const) : [])]));
