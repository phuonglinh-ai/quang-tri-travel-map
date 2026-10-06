// Nội dung panel. Màn hình hiện tại được suy ra từ trạng thái, theo thứ tự ưu tiên:
//   thẻ địa điểm > kết quả tìm kiếm > danh sách (lớp / đã lưu / được chia sẻ) > xã/phường > trang chủ.
// Nút "Quay lại" gỡ lần lượt từng tầng, nên không cần ngăn xếp điều hướng riêng.
import { PROVINCE } from '../config/province';
import { GROUPS, LAYERS, LAYER_BY_ID, type LayerDef } from '../config/layers';
import { assetPath, matchScore, type IndexedPlace, type PlaceImage } from '../data/places';
import type { WardFeature } from '../map/map';
import type { Store } from '../state';
import { t } from '../i18n';
import { distanceKm, esc, fold } from '../lib/text';
import { feedbackUrl } from '../lib/feedback';
import { formatMonths, MONTHS } from '../lib/months';

export const BASE_LAYERS = [
  { label: 'Ranh giới xã/phường', ids: ['ward-line'] },
  { label: 'Tên xã/phường', ids: ['ward-label'] },
  { label: 'Đường chính', ids: ['road', 'road-casing'] },
  { label: 'Đường sắt', ids: ['rail'] },
  { label: 'Sông, hồ', ids: ['water-area', 'river', 'river-label'] },
];

type ListView = { kind: 'layer'; id: string } | { kind: 'saved' } | { kind: 'shared' };

export interface PanelActions {
  selectPlace(id: string | null): void;
  selectWard(code: string | null): void;
  recenter(): void;
  share(url: string, title: string): void;
  setBasemapVisible(ids: string[], visible: boolean): void;
  onSearchFocus(): void;
}

export function createPanel(root: HTMLElement, store: Store, places: IndexedPlace[], wards: Map<string, WardFeature>, actions: PanelActions) {
  const byId = new Map(places.map((p) => [p.id, p]));
  const counts = new Map<string, number>();
  const wardCounts = new Map<string, number>();
  for (const p of places) {
    counts.set(p.layer, (counts.get(p.layer) ?? 0) + 1);
    if (p.wardCode) wardCounts.set(p.wardCode, (wardCounts.get(p.wardCode) ?? 0) + 1);
  }

  const monthCounts = new Map<number, number>(MONTHS.map((m) => [m, places.filter((p) => p.months.includes(m)).length]));
  const withMonths = places.filter((p) => p.months.length).length;

  let query = '';
  let list: ListView | null = null;
  let layerFilter = '';
  const scrollMemory = new Map<string, number>();
  let currentKey = '';

  root.innerHTML = `
    <div class="panel-top">
      <div class="sheet-handle" role="button" aria-label="Kéo để mở rộng"></div>
      <header class="brand">
        ${LOGO_SVG}
        <div>
          <p class="brand-name">Khám phá ${esc(PROVINCE.name)}</p>
          <p class="brand-tag">${esc(t.appTagline)}</p>
        </div>
      </header>
      <div class="search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="search" type="search" autocomplete="off" enterkeyhint="search" placeholder="${esc(t.searchPlaceholder)}" aria-label="${esc(t.searchPlaceholder)}">
        <button class="search-clear" type="button" aria-label="${esc(t.searchClear)}" hidden>×</button>
      </div>
    </div>
    <div class="panel-body" id="panel-body"></div>
  `;
  const body = root.querySelector<HTMLElement>('#panel-body')!;
  const input = root.querySelector<HTMLInputElement>('#search')!;
  const clearBtn = root.querySelector<HTMLButtonElement>('.search-clear')!;

  input.addEventListener('input', () => {
    query = input.value;
    clearBtn.hidden = !query;
    if (store.get().selectedPlace) actions.selectPlace(null);
    else render();
  });
  input.addEventListener('focus', () => actions.onSearchFocus());
  clearBtn.addEventListener('click', () => {
    input.value = query = '';
    clearBtn.hidden = true;
    render();
    input.focus();
  });

  // --- Ủy quyền sự kiện cho toàn bộ nội dung ------------------------------------
  body.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!el) return;
    const { action, id } = el.dataset;
    const s = store.get();
    switch (action) {
      case 'place':
        actions.selectPlace(id!);
        break;
      case 'ward':
        query = input.value = '';
        clearBtn.hidden = true;
        actions.selectWard(id!);
        render();
        break;
      case 'open-layer':
        list = { kind: 'layer', id: id! };
        layerFilter = '';
        render();
        break;
      case 'open-saved':
        list = { kind: 'saved' };
        render();
        break;
      case 'back':
        back();
        break;
      case 'province':
        actions.selectWard(null);
        break;
      case 'recenter':
        actions.recenter();
        break;
      case 'month': {
        const m = id ? Number(id) : null;
        store.set({ month: m === s.month ? null : m });
        break;
      }
      case 'save':
        store.toggleSaved(id!);
        break;
      case 'share-place': {
        const p = byId.get(id!)!;
        actions.share(shareUrl({ place: p.id }), p.name);
        break;
      }
      case 'share-saved':
        actions.share(shareUrl({ saved: s.saved.join(',') }), `${t.saved} – ${PROVINCE.name}`);
        break;
      case 'clear-saved':
        if (confirm(t.savedClearConfirm)) store.set({ saved: [] });
        break;
      case 'adopt-shared':
        store.set({ saved: [...new Set([...s.saved, ...(s.sharedList ?? [])])], sharedList: null });
        list = { kind: 'saved' };
        render();
        break;
    }
  });
  body.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement;
    if (el.dataset.toggleLayer) store.toggleLayer(el.dataset.toggleLayer, el.checked);
    if (el.dataset.monthOnly !== undefined) store.set({ monthOnly: el.checked });
    if (el.dataset.basemap) actions.setBasemapVisible(BASE_LAYERS[Number(el.dataset.basemap)].ids, el.checked);
  });
  body.addEventListener('input', (e) => {
    const el = e.target as HTMLInputElement;
    if (el.id === 'layer-filter') {
      layerFilter = el.value;
      body.querySelector('#layer-list')!.innerHTML = layerListHtml((list as { id: string }).id);
    }
  });

  /** Quay lại một tầng. Trả về false nếu đã ở trang chủ. */
  function back(): boolean {
    const s = store.get();
    if (s.selectedPlace) actions.selectPlace(null);
    else if (query) {
      query = input.value = '';
      clearBtn.hidden = true;
      render();
    } else if (list) {
      if (list.kind === 'shared') store.set({ sharedList: null });
      list = null;
      render();
    } else if (s.selectedWard) actions.selectWard(null);
    else return false;
    return true;
  }

  // --- Các khối HTML -------------------------------------------------------------
  const iconOf = (p: IndexedPlace) => p.icon ?? LAYER_BY_ID.get(p.layer)!.icon;
  const wardFullName = (p: IndexedPlace) => (p.wardCode ? wards.get(p.wardCode)?.properties.fullName ?? p.wardName : null);
  const dot = (layer: LayerDef, icon = layer.icon) => `<span class="dot" style="--c:${layer.color}" aria-hidden="true">${icon}</span>`;
  const backBtn = (label = t.back) => `<button class="back" data-action="back">‹ ${esc(label)}</button>`;

  const placeItem = (p: IndexedPlace, meta?: string) => {
    const layer = LAYER_BY_ID.get(p.layer)!;
    const img = p.images[0];
    const month = store.get().month;
    const seasonal = month !== null && p.months.includes(month);
    return `<li><button class="place-item${seasonal ? ' is-season' : ''}" data-action="place" data-id="${p.id}">
      ${img ? `<img class="thumb" src="${assetPath(img.thumb ?? img.src)}" alt="" loading="lazy" width="40" height="40">` : dot(layer, iconOf(p))}
      <span class="pi-text"><strong>${esc(p.name)}</strong>${(meta = [seasonal ? `● ${t.inSeason}` : '', meta ?? [p.wardName, layer.label].filter(Boolean).join(' · ')].filter(Boolean).join(' · ')) ? `<small>${esc(meta)}</small>` : ''}</span>
    </button></li>`;
  };

  function homeHtml() {
    const s = store.get();
    const featured = places.filter((p) => p.featured);
    return `
      <section>
        <h2 class="section-title">${t.featured}</h2>
        <div class="carousel" role="list">
          ${featured
            .map((p) => {
              const layer = LAYER_BY_ID.get(p.layer)!;
              const img = p.images[0];
              return `<button class="feat-card${img ? ' has-photo' : ''}" role="listitem" data-action="place" data-id="${p.id}" style="--c:${layer.color}">
                ${img ? `<img class="feat-img" src="${assetPath(img.thumb ?? img.src)}" alt="" loading="lazy" title="Ảnh: ${esc(img.credit)} · ${esc(img.license)}">` : ''}
                <span class="feat-icon" aria-hidden="true">${iconOf(p)}</span>
                <span class="feat-text"><strong>${esc(p.name)}</strong><small>${esc(p.wardName ?? '')}</small></span>
                ${p.isSample ? `<span class="badge-sample">${t.sample}</span>` : ''}
              </button>`;
            })
            .join('')}
        </div>
      </section>
      ${seasonHtml()}
      <section>
        <h2 class="section-title">${t.layers}</h2>
        ${GROUPS.map(
          (g) => `
          <h3 class="group-title">${esc(g.label)}</h3>
          <ul class="layer-list">
            ${LAYERS.filter((l) => l.group === g.id)
              .map((l) => {
                const n = counts.get(l.id) ?? 0;
                const on = s.activeLayers.has(l.id);
                return `<li class="layer-row${n ? '' : ' is-empty'}">
                  <label class="switch" title="${n ? 'Bật/tắt lớp' : t.noData}">
                    <input type="checkbox" data-toggle-layer="${l.id}" ${on ? 'checked' : ''} ${n ? '' : 'disabled'} aria-label="${esc(l.label)}">
                    <span></span>
                  </label>
                  ${
                    n
                      ? `<button class="layer-open" data-action="open-layer" data-id="${l.id}">${dot(l)}<span class="layer-label">${esc(l.label)}</span><span class="count">${n}</span><span class="chev" aria-hidden="true">›</span></button>`
                      : `<div class="layer-open">${dot(l)}<span class="layer-label">${esc(l.label)}<small>${esc(l.pendingNote ?? t.noData)}</small></span></div>`
                  }
                </li>`;
              })
              .join('')}
          </ul>`,
        ).join('')}
      </section>
      <section>
        <h2 class="section-title">${t.fastTravel}</h2>
        <div class="chips">
          <button class="chip" data-action="province">${esc(PROVINCE.name)} (toàn tỉnh)</button>
          ${PROVINCE.fastTravel.map((f) => `<button class="chip" data-action="ward" data-id="${f.wardCode}">${esc(f.label)}</button>`).join('')}
        </div>
      </section>
      <section>
        <button class="row-link" data-action="open-saved">
          <span class="dot" style="--c:var(--accent)" aria-hidden="true">♥</span>
          <span class="layer-label">${t.saved}</span><span class="count">${s.saved.length}</span><span class="chev" aria-hidden="true">›</span>
        </button>
      </section>
      <details class="basemap">
        <summary>${t.basemap}</summary>
        ${BASE_LAYERS.map((l, i) => `<label class="toggle"><input type="checkbox" data-basemap="${i}" checked> ${esc(l.label)}</label>`).join('')}
      </details>
      ${aboutHtml()}
    `;
  }

  function seasonHtml() {
    const s = store.get();
    const inSeason = s.month ? places.filter((p) => p.months.includes(s.month!)) : [];
    return `<section class="season">
      <h2 class="section-title">${t.season}</h2>
      <div class="months" role="group" aria-label="${esc(t.season)}">
        ${MONTHS.map((m) => {
          const n = monthCounts.get(m) ?? 0;
          return `<button class="month-chip${s.month === m ? ' is-on' : ''}${n ? '' : ' is-empty'}" data-action="month" data-id="${m}" aria-pressed="${s.month === m}" aria-label="${esc(t.seasonMonthLabel(m, n))}">${m}${n ? `<small>${n}</small>` : ''}</button>`;
        }).join('')}
      </div>
      ${
        s.month
          ? `<p class="season-sum">${t.seasonSummary(s.month, inSeason.length)}</p>
             ${inSeason.length ? `<label class="toggle"><input type="checkbox" data-month-only ${s.monthOnly ? 'checked' : ''}> ${t.seasonOnly}</label><ul class="items">${inSeason.map((p) => placeItem(p)).join('')}</ul>` : ''}
             <button class="btn btn-quiet" data-action="month" data-id="">${t.seasonClear}</button>`
          : `<p class="small muted">${t.seasonHint}</p>`
      }
      <p class="small muted">${t.seasonCoverage(withMonths, places.length)}</p>
    </section>`;
  }

  const joinVi = (items: readonly string[]) =>
    items.length > 1 ? `${items.slice(0, -1).join(', ')} và ${items[items.length - 1]}` : items[0] ?? '';

  const aboutHtml = () => `
    <section class="about">
      <h2 class="section-title">${t.about}</h2>
      <p>${esc(PROVINCE.fullName)}${PROVINCE.mergedFrom.length > 1 ? ` được hình thành từ việc hợp nhất ${esc(joinVi(PROVINCE.mergedFrom))},` : ''} gồm ${wards.size} xã, phường, đặc khu. Bản đồ giới thiệu các điểm đến du lịch, sản phẩm và vùng nông sản đặc trưng, địa chỉ giáo dục truyền thống và cơ sở giáo dục trên địa bàn tỉnh.</p>
      <p class="sample-note">⚠ ${t.sampleNote}</p>
      <p class="small muted">${t.dataSources}: ranh giới hành chính của NXB Tài nguyên, Môi trường và Bản đồ Việt Nam (qua vietnamese-provinces-database, MIT); đường, sông, hồ và vị trí địa điểm mẫu © OpenStreetMap contributors (ODbL); đất liền ngoài lãnh thổ: Natural Earth.</p>
      ${imageCreditsHtml()}
      <p class="small"><a href="${esc(feedbackUrl())}" target="_blank" rel="noopener">⚑ ${t.feedback} ↗</a></p>
      <p class="small muted">${t.feedbackNote}</p>
      <p class="small muted">${t.footerProject}</p>
    </section>`;

  function imageCreditsHtml() {
    const withImg = places.filter((p) => p.images.length);
    if (!withImg.length) return '';
    return `<details class="credits"><summary>${t.imageCredits} (${withImg.length})</summary><ul>${withImg
      .map((p) => {
        const i = p.images[0];
        return `<li>${esc(p.name)}: ${creditLink(i)}, ${licenseLink(i)}</li>`;
      })
      .join('')}</ul><p class="small muted">${t.imageCreditsNote}</p></details>`;
  }

  function layerListHtml(layerId: string) {
    const q = fold(layerFilter);
    const items = places.filter((p) => p.layer === layerId && (!q || matchScore(p, q) >= 0));
    if (!items.length) return `<p class="muted">${t.noResults}</p>`;
    // Nhóm theo xã/phường, xếp theo tên xã.
    const groups = new Map<string, IndexedPlace[]>();
    for (const p of items) {
      const k = p.wardName ?? '—';
      groups.set(k, [...(groups.get(k) ?? []), p]);
    }
    return [...groups]
      .sort(([a], [b]) => a.localeCompare(b, 'vi'))
      .map(([ward, ps]) => `<h3 class="group-title">${esc(ward)}</h3><ul class="items">${ps.map((p) => placeItem(p, p.nameEn ?? '')).join('')}</ul>`)
      .join('');
  }

  function layerHtml(id: string) {
    const l = LAYER_BY_ID.get(id)!;
    return `${backBtn()}
      <header class="view-head">${dot(l)}<div><h2>${esc(l.label)}</h2><p class="muted">${t.places(counts.get(id) ?? 0)} · <span class="badge-sample">${t.sample}</span></p></div></header>
      <input id="layer-filter" class="filter" type="search" placeholder="${esc(t.filterInLayer)}" value="${esc(layerFilter)}" aria-label="${esc(t.filterInLayer)}">
      <div id="layer-list">${layerListHtml(id)}</div>`;
  }

  function searchHtml() {
    const q = fold(query);
    const wardHits = [...wards.values()]
      .filter((w) => fold(w.properties.fullName).includes(q))
      .slice(0, 6);
    const hits = places
      .map((p) => ({ p, s: matchScore(p, q) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s || a.p.name.localeCompare(b.p.name, 'vi'))
      .slice(0, 40);
    if (!wardHits.length && !hits.length) return `<p class="muted">${t.noResults}</p>`;
    return `
      ${wardHits.length ? `<h3 class="group-title">${t.wardsResult}</h3><ul class="items">${wardHits
        .map((w) => `<li><button class="place-item" data-action="ward" data-id="${w.properties.code}"><span class="dot" style="--c:var(--brand)" aria-hidden="true">📍</span><span class="pi-text"><strong>${esc(w.properties.fullName)}</strong><small>${t.places(wardCounts.get(w.properties.code) ?? 0)}</small></span></button></li>`)
        .join('')}</ul>` : ''}
      ${hits.length ? `<h3 class="group-title">${t.results}</h3><ul class="items">${hits.map(({ p }) => placeItem(p)).join('')}</ul>` : ''}`;
  }

  function placeHtml(p: IndexedPlace) {
    const s = store.get();
    const layer = LAYER_BY_ID.get(p.layer)!;
    const group = GROUPS.find((g) => g.id === layer.group)!;
    const saved = s.saved.includes(p.id);
    const [lon, lat] = p.coordinates;
    const near = places
      .filter((x) => x.id !== p.id && s.activeLayers.has(x.layer))
      .map((x) => ({ x, d: distanceKm(p.coordinates, x.coordinates) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 5);
    const osmUrl = p.source?.osm ? `https://www.openstreetmap.org/${p.source.osm}` : null;
    return `${backBtn()}
      <article class="place">
        ${
          p.images[0]
            ? photoHero(p.images[0], p.isSample)
            : `<div class="place-hero" style="--c:${layer.color}">
                <span class="hero-icon" aria-hidden="true">${iconOf(p)}</span>
                ${p.isSample ? `<span class="badge-sample">${t.sample}</span>` : ''}
              </div>`
        }
        <p class="kicker">${esc(group.label)} · ${esc(layer.label)}</p>
        <h2 class="place-name">${esc(p.name)}</h2>
        ${p.nameEn ? `<p class="name-en" lang="en">${esc(p.nameEn)}</p>` : ''}
        ${wardFullName(p) ? `<p class="loc"><button class="link" data-action="ward" data-id="${p.wardCode}">📍 ${esc(wardFullName(p)!)}</button></p>` : ''}
        <p class="summary">${esc(p.summary)}</p>
        ${p.months.length ? `<p class="season-line">📅 ${t.seasonOfPlace}: <strong>${formatMonths(p.months)}</strong>${s.month !== null && p.months.includes(s.month) ? ` <span class="in-season">● ${t.inSeason}</span>` : ''}</p>` : ''}
        <div class="actions">
          <button class="btn ${saved ? 'is-on' : ''}" data-action="save" data-id="${p.id}" aria-pressed="${saved}">${saved ? '♥ ' + t.unsave : '♡ ' + t.save}</button>
          <button class="btn" data-action="share-place" data-id="${p.id}">↗ ${t.share}</button>
          <a class="btn" href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}" target="_blank" rel="noopener">➤ ${t.directions}</a>
        </div>
        ${p.links.length ? `<ul class="links">${p.links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a></li>`).join('')}</ul>` : ''}
        ${p.isSample ? `<p class="sample-note">⚠ ${t.sampleNote}${osmUrl ? ` <a href="${osmUrl}" target="_blank" rel="noopener">${t.viewOnOsm} ↗</a>` : ''}</p>` : ''}
        <p class="small muted"><a href="${esc(feedbackUrl(p))}" target="_blank" rel="noopener">⚑ ${t.feedbackPlace} ↗</a></p>
        ${near.length ? `<h3 class="group-title">${t.nearby}</h3><ul class="items">${near.map(({ x, d }) => placeItem(x, `${t.km(d)} · ${LAYER_BY_ID.get(x.layer)!.label}`)).join('')}</ul>` : ''}
      </article>`;
  }

  function wardHtml(code: string) {
    const w = wards.get(code)!;
    const s = store.get();
    const inWard = places.filter((p) => p.wardCode === code && s.activeLayers.has(p.layer));
    return `${backBtn(t.backToProvince)}
      <header class="view-head"><span class="dot" style="--c:var(--brand)" aria-hidden="true">📍</span><div>
        <h2>${esc(w.properties.fullName)}</h2>
        <p class="muted">${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(w.properties.areaKm2)} km² · ${t.places(inWard.length)}</p>
      </div></header>
      <button class="btn" data-action="recenter">⌖ ${t.recenter}</button>
      <h3 class="group-title">${t.inWard}</h3>
      ${inWard.length ? `<ul class="items">${inWard.map((p) => placeItem(p, LAYER_BY_ID.get(p.layer)!.label)).join('')}</ul>` : `<p class="muted">${t.wardNoPlaces}</p>`}`;
  }

  function savedHtml(shared: boolean) {
    const s = store.get();
    const ids = shared ? s.sharedList ?? [] : s.saved;
    const items = ids.map((id) => byId.get(id)).filter((p): p is IndexedPlace => !!p);
    return `${backBtn()}
      <header class="view-head"><span class="dot" style="--c:var(--accent)" aria-hidden="true">♥</span><div>
        <h2>${shared ? t.sharedList(items.length) : t.saved}</h2>
      </div></header>
      ${items.length ? `<ul class="items">${items.map((p) => placeItem(p)).join('')}</ul>` : `<p class="muted">${t.savedEmpty}</p>`}
      <div class="actions">
        ${shared ? `<button class="btn" data-action="adopt-shared">♥ ${t.sharedListSave}</button>` : items.length ? `<button class="btn" data-action="share-saved">↗ ${t.savedShare}</button><button class="btn btn-quiet" data-action="clear-saved">${t.savedClear}</button>` : ''}
      </div>`;
  }

  // --- Hiển thị -----------------------------------------------------------------
  function render() {
    const s = store.get();
    if (s.sharedList && !list) list = { kind: 'shared' };
    const place = s.selectedPlace ? byId.get(s.selectedPlace) : undefined;
    let key: string;
    let html: string;
    if (place) [key, html] = [`place:${place.id}`, placeHtml(place)];
    else if (query.trim()) [key, html] = ['search', searchHtml()];
    else if (list?.kind === 'layer') [key, html] = [`layer:${list.id}`, layerHtml(list.id)];
    else if (list) [key, html] = [list.kind, savedHtml(list.kind === 'shared')];
    else if (s.selectedWard) [key, html] = [`ward:${s.selectedWard}`, wardHtml(s.selectedWard)];
    else [key, html] = ['home', homeHtml()];

    if (currentKey) scrollMemory.set(currentKey, body.scrollTop);
    body.innerHTML = html;
    body.scrollTop = key.startsWith('place:') ? 0 : scrollMemory.get(key) ?? 0;
    currentKey = key;
    // Giữ trạng thái bật/tắt lớp nền khi vẽ lại trang chủ.
    body.querySelectorAll<HTMLInputElement>('[data-basemap]').forEach((cb) => (cb.checked = basemapState[Number(cb.dataset.basemap)]));
  }

  const basemapState = BASE_LAYERS.map(() => true);
  body.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement;
    if (el.dataset.basemap) basemapState[Number(el.dataset.basemap)] = el.checked;
  });

  store.subscribe((_, changed) => {
    if (changed.has('selectedPlace') || changed.has('selectedWard') || changed.has('saved') || changed.has('activeLayers') || changed.has('sharedList') || changed.has('month') || changed.has('monthOnly')) {
      if (changed.has('selectedWard') && store.get().selectedWard) list = null;
      render();
    }
  });

  render();
  return { back, render, isHome: () => currentKey === 'home' };
}

const creditLink = (i: PlaceImage) =>
  i.sourceUrl ? `<a href="${esc(i.sourceUrl)}" target="_blank" rel="noopener">${esc(i.credit)}</a>` : esc(i.credit);

const licenseLink = (i: PlaceImage) =>
  i.licenseUrl ? `<a href="${esc(i.licenseUrl)}" target="_blank" rel="noopener license">${esc(i.license)}</a>` : esc(i.license);

// Ảnh đầu thẻ, kèm ghi công tác giả + giấy phép ngay trên ảnh (yêu cầu của CC BY / CC BY-SA).
function photoHero(i: PlaceImage, isSample: boolean) {
  return `<figure class="place-hero has-photo">
    <img src="${assetPath(i.src)}" alt="${esc(i.alt)}" loading="lazy">
    ${isSample ? `<span class="badge-sample">${t.sample}</span>` : ''}
    <figcaption>${t.photo}: ${creditLink(i)} · ${licenseLink(i)}</figcaption>
  </figure>`;
}

function shareUrl(params: Record<string, string>) {
  const url = new URL(import.meta.env.BASE_URL, location.origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.toString().replace(/%2C/g, ',');
}

const LOGO_SVG = `<svg class="logo" viewBox="0 0 40 40" aria-hidden="true">
  <rect width="40" height="40" rx="10" fill="var(--brand)"/>
  <path d="M20 8c-5 0-9 3.9-9 8.8 0 6.3 9 14.7 9 14.7s9-8.4 9-14.7C29 11.9 25 8 20 8Z" fill="#fff"/>
  <circle cx="20" cy="17" r="3.4" fill="var(--accent)"/>
  <path d="M6 33c3-1.6 5.5-1.6 8.5 0s5.5 1.6 8.5 0 5.5-1.6 8.5 0 3 1.6 3 1.6" stroke="#9fd3e6" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>`;
