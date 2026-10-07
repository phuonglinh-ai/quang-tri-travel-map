// Chuỗi giao diện song ngữ Việt – Anh. `vi` là bản gốc; `en` phải có cùng khóa (kiểu `Strings` bắt buộc).
// Mọi chỗ trong ứng dụng đọc chuỗi qua `t`, luôn trả về bản của ngôn ngữ đang chọn (setLang đổi ngôn ngữ).
// Nội dung do người biên tập nhập (tên, mô tả, ghi chú…) có thêm trường tiếng Anh riêng; trường nào chưa
// nhập thì dùng bản tiếng Việt thay thế qua `localized()`.

export type Lang = 'vi' | 'en';
export const LANGS: Lang[] = ['vi', 'en'];

const MONTH_SHORT_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const groupLabel = (groups: [number, number][], fmt: (m: number) => string) =>
  groups.map(([a, b]) => (a === b ? fmt(a) : `${fmt(a)}–${fmt(b)}`)).join(', ');

export const vi = {
  appTagline: 'Bản đồ du lịch · nông sản · giáo dục',
  brandName: (name: string) => `Khám phá ${name}`,
  docTitle: (name: string) => `Khám phá ${name} – Bản đồ tương tác`,
  metaDescription: 'Bản đồ tương tác giới thiệu điểm đến du lịch, địa chỉ giáo dục truyền thống và cơ sở giáo dục (bản demo).',
  mapLabel: 'Bản đồ',
  panelLabel: 'Bảng điều khiển',
  language: 'Ngôn ngữ',
  sheetHandle: 'Kéo để mở rộng',
  searchPlaceholder: 'Tìm địa điểm, xã, phường…',
  searchClear: 'Xóa tìm kiếm',
  featured: 'Nổi bật',
  layers: 'Lớp bản đồ',
  layerToggle: 'Bật/tắt lớp',
  places: (n: number) => `${n} địa điểm`,
  noData: 'Chưa có dữ liệu',
  fastTravel: 'Đi nhanh tới',
  wholeProvince: (name: string) => `${name} (toàn tỉnh)`,
  saved: 'Đã lưu',
  savedEmpty: 'Chưa lưu địa điểm nào. Bấm “Lưu” trên thẻ địa điểm để thêm vào danh sách.',
  savedShare: 'Chia sẻ danh sách',
  savedClear: 'Xóa danh sách',
  savedClearConfirm: 'Xóa toàn bộ địa điểm đã lưu trên thiết bị này?',
  sharedList: (n: number) => `Danh sách được chia sẻ · ${n} địa điểm`,
  sharedListSave: 'Thêm vào danh sách của tôi',
  basemap: 'Lớp nền',
  baseLayerLabels: ['Ranh giới xã/phường', 'Tên xã/phường', 'Đường chính', 'Đường sắt', 'Sông, hồ'],
  about: 'Giới thiệu',
  aboutIntro: (fullName: string, mergedFrom: readonly string[], wards: number) =>
    `${fullName}${mergedFrom.length > 1 ? ` được hình thành từ việc hợp nhất ${vi.joinList(mergedFrom)},` : ''} gồm ${wards} xã, phường, đặc khu. Bản đồ giới thiệu các điểm đến du lịch, sản phẩm và vùng nông sản đặc trưng, địa chỉ giáo dục truyền thống và cơ sở giáo dục trên địa bàn tỉnh.`,
  aboutSources: 'ranh giới hành chính của NXB Tài nguyên, Môi trường và Bản đồ Việt Nam (qua vietnamese-provinces-database, MIT); đường, sông, hồ và vị trí địa điểm mẫu © OpenStreetMap contributors (ODbL); đất liền ngoài lãnh thổ: Natural Earth.',
  attributionHtml:
    'Ranh giới hành chính: NXB Tài nguyên, Môi trường và Bản đồ Việt Nam (sapnhap.bando.com.vn), qua <a href="https://github.com/thanglequoc/vietnamese-provinces-database" target="_blank" rel="noopener">vietnamese-provinces-database</a> (MIT) · Đường, sông, hồ, vị trí địa điểm mẫu: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors (ODbL)',
  joinList: (items: readonly string[]) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} và ${items[items.length - 1]}` : items[0] ?? ''),
  back: 'Quay lại',
  backToProvince: 'Về toàn tỉnh',
  recenter: 'Về góc nhìn ban đầu',
  sample: 'Dữ liệu minh họa',
  sampleNote: 'Thông tin mang tính minh họa cho bản demo, chưa được cơ quan chức năng xác minh.',
  viOnly: '',
  save: 'Lưu',
  unsave: 'Đã lưu',
  share: 'Chia sẻ',
  directions: 'Chỉ đường',
  viewOnOsm: 'Nguồn OpenStreetMap',
  linkCopied: 'Đã sao chép liên kết',
  nearby: 'Gần đây',
  inWard: 'Địa điểm trong xã/phường',
  wardNoPlaces: 'Chưa có địa điểm nào trong lớp đang bật.',
  results: 'Kết quả',
  noResults: 'Không tìm thấy kết quả phù hợp.',
  wardsResult: 'Xã, phường, đặc khu',
  filterInLayer: 'Lọc trong lớp này…',
  footerProject: 'Dự án cá nhân – bản demo, không phải trang thông tin chính thức.',
  routes: 'Tuyến trải nghiệm',
  routeStops: (n: number) => `${n} điểm dừng`,
  routeKm: (km: number) => `khoảng ${km.toFixed(0)} km`,
  routeByRoad: (km: number) => `khoảng ${km.toFixed(0)} km đường bộ`,
  legByRoad: (km: string, approx: boolean) => (approx ? `≈ ${km} · đường chim bay` : `${km} đường bộ`),
  routeStart: 'Bắt đầu từ điểm 1',
  routeShare: 'Chia sẻ tuyến',
  routeOpenMaps: 'Mở trong Google Maps',
  routeStepOf: (i: number, n: number) => `Điểm ${i}/${n}`,
  routePrev: 'Điểm trước',
  routeNext: 'Điểm sau',
  routeNote: 'Đường đi vẽ theo dữ liệu đường OpenStreetMap, quãng đường chỉ là ước tính để tham khảo; nét đứt là đoạn rẽ vào điểm dừng. Thời gian di chuyển phụ thuộc phương tiện và thực tế đường đi.',
  season: 'Lịch mùa vụ, lễ hội',
  seasonHint: 'Chọn một tháng để làm nổi bật trên bản đồ các địa điểm đang vào mùa, đang có lễ hội.',
  seasonCoverage: (n: number, total: number) => `Mới có ${n}/${total} địa điểm được cập nhật thời điểm nổi bật.`,
  seasonSummary: (m: number, n: number) => (n ? `Tháng ${m}: ${n} địa điểm đang vào mùa.` : `Tháng ${m}: chưa có địa điểm nào được ghi nhận.`),
  seasonOnly: 'Chỉ hiện các địa điểm này trên bản đồ',
  seasonClear: 'Bỏ chọn tháng',
  seasonMonthLabel: (m: number, n: number) => `Tháng ${m}, ${n} địa điểm`,
  monthShort: (m: number) => String(m),
  monthsLabel: (groups: [number, number][]) => `Tháng ${groupLabel(groups, String)}`,
  inSeason: 'Đang vào mùa',
  seasonOfPlace: 'Thời điểm nổi bật',
  feedback: 'Góp ý, báo lỗi',
  feedbackPlace: 'Báo lỗi hoặc góp ý về địa điểm này',
  feedbackNote: 'Góp ý được gửi qua GitHub Issues: cần có tài khoản GitHub và nội dung sẽ hiển thị công khai. Vui lòng không nêu thông tin cá nhân.',
  feedbackTitle: '[Góp ý]',
  feedbackBodyGeneral: '**Nội dung góp ý:**\n\n',
  feedbackBodyPlace: (name: string, id: string, link: string) =>
    `**Địa điểm:** ${name} (\`${id}\`)\n**Liên kết:** ${link}\n\n**Nội dung góp ý** (sai thông tin, thiếu ảnh, đề xuất bổ sung…):\n\n`,
  dataSources: 'Nguồn dữ liệu',
  photo: 'Ảnh',
  imageCredits: 'Nguồn ảnh',
  imageCreditsNote: 'Ảnh từ Wikimedia Commons, dùng theo giấy phép ghi bên cạnh; đã thu nhỏ kích thước. Nhấn vào tên tác giả để xem ảnh gốc.',
  km: (d: number) => (d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1).replace('.', ',')} km`),
};

export type Strings = typeof vi;

export const en: Strings = {
  appTagline: 'Tourism · agriculture · education map',
  brandName: (name) => `Explore ${name}`,
  docTitle: (name) => `Explore ${name} – Interactive map`,
  metaDescription: 'Interactive map of tourist destinations, revolutionary heritage sites and educational facilities (demo version).',
  mapLabel: 'Map',
  panelLabel: 'Control panel',
  language: 'Language',
  sheetHandle: 'Drag to expand',
  searchPlaceholder: 'Search places, communes, wards…',
  searchClear: 'Clear search',
  featured: 'Featured',
  layers: 'Map layers',
  layerToggle: 'Toggle layer',
  places: (n) => plural(n, 'place', 'places'),
  noData: 'No data yet',
  fastTravel: 'Quick travel',
  wholeProvince: (name) => `${name} (whole province)`,
  saved: 'Saved',
  savedEmpty: 'No saved places yet. Tap “Save” on a place card to add it to this list.',
  savedShare: 'Share list',
  savedClear: 'Clear list',
  savedClearConfirm: 'Remove all saved places on this device?',
  sharedList: (n) => `Shared list · ${plural(n, 'place', 'places')}`,
  sharedListSave: 'Add to my list',
  basemap: 'Base layers',
  baseLayerLabels: ['Commune/ward boundaries', 'Commune/ward names', 'Main roads', 'Railway', 'Rivers & lakes'],
  about: 'About',
  aboutIntro: (fullName, mergedFrom, wards) =>
    `${fullName}${mergedFrom.length > 1 ? ` was formed by merging ${en.joinList(mergedFrom)}, and` : ''} comprises ${wards} communes, wards and special zones. This map presents tourist destinations, typical agricultural products and growing areas, revolutionary heritage sites and educational facilities across the province.`,
  aboutSources: 'administrative boundaries from the Vietnam Natural Resources, Environment and Cartography Publishing House (via vietnamese-provinces-database, MIT); roads, rivers, lakes and sample place locations © OpenStreetMap contributors (ODbL); land outside the province: Natural Earth.',
  attributionHtml:
    'Administrative boundaries: Vietnam Natural Resources, Environment and Cartography Publishing House (sapnhap.bando.com.vn), via <a href="https://github.com/thanglequoc/vietnamese-provinces-database" target="_blank" rel="noopener">vietnamese-provinces-database</a> (MIT) · Roads, rivers, lakes, sample place locations: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors (ODbL)',
  joinList: (items) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0] ?? ''),
  back: 'Back',
  backToProvince: 'Whole province',
  recenter: 'Reset view',
  sample: 'Sample data',
  sampleNote: 'Illustrative information for this demo, not yet verified by the competent authorities.',
  viOnly: 'Description available in Vietnamese only.',
  save: 'Save',
  unsave: 'Saved',
  share: 'Share',
  directions: 'Directions',
  viewOnOsm: 'OpenStreetMap source',
  linkCopied: 'Link copied',
  nearby: 'Nearby',
  inWard: 'Places in this commune/ward',
  wardNoPlaces: 'No places in the layers currently shown.',
  results: 'Results',
  noResults: 'No matching results.',
  wardsResult: 'Communes, wards, special zones',
  filterInLayer: 'Filter this layer…',
  footerProject: 'Personal project – demo version, not an official information site.',
  routes: 'Experience routes',
  routeStops: (n) => plural(n, 'stop', 'stops'),
  routeKm: (km) => `about ${km.toFixed(0)} km`,
  routeByRoad: (km) => `about ${km.toFixed(0)} km by road`,
  legByRoad: (km, approx) => (approx ? `≈ ${km} as the crow flies` : `${km} by road`),
  routeStart: 'Start at stop 1',
  routeShare: 'Share route',
  routeOpenMaps: 'Open in Google Maps',
  routeStepOf: (i, n) => `Stop ${i}/${n}`,
  routePrev: 'Previous stop',
  routeNext: 'Next stop',
  routeNote: 'Routes are drawn from OpenStreetMap road data and distances are estimates for reference only; dashed lines are short connectors to each stop. Travel time depends on your vehicle and the actual road conditions.',
  season: 'Seasons & festivals',
  seasonHint: 'Pick a month to highlight on the map the places that are in season or hosting festivals.',
  seasonCoverage: (n, total) => `Only ${n} of ${total} places have seasonal information so far.`,
  seasonSummary: (m, n) => (n ? `${MONTH_LONG_EN[m - 1]}: ${plural(n, 'place', 'places')} in season.` : `${MONTH_LONG_EN[m - 1]}: no places recorded yet.`),
  seasonOnly: 'Show only these places on the map',
  seasonClear: 'Clear month',
  seasonMonthLabel: (m, n) => `${MONTH_LONG_EN[m - 1]}, ${plural(n, 'place', 'places')}`,
  monthShort: (m) => MONTH_SHORT_EN[m - 1],
  monthsLabel: (groups) => groupLabel(groups, (m) => MONTH_SHORT_EN[m - 1]),
  inSeason: 'In season',
  seasonOfPlace: 'Season & festival months',
  feedback: 'Feedback, report an error',
  feedbackPlace: 'Report an error or give feedback on this place',
  feedbackNote: 'Feedback is submitted through GitHub Issues: a GitHub account is required and your message will be public. Please do not include personal information.',
  feedbackTitle: '[Feedback]',
  feedbackBodyGeneral: '**Your feedback:**\n\n',
  feedbackBodyPlace: (name, id, link) =>
    `**Place:** ${name} (\`${id}\`)\n**Link:** ${link}\n\n**Your feedback** (incorrect information, missing photo, suggested addition…):\n\n`,
  dataSources: 'Data sources',
  photo: 'Photo',
  imageCredits: 'Photo credits',
  imageCreditsNote: 'Photos from Wikimedia Commons are used under the licence shown beside each one and have been resized. Click an author name to see the original.',
  km: (d) => (d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`),
};

const dicts: Record<Lang, Strings> = { vi, en };
let lang: Lang = 'vi';

export const getLang = () => lang;
export function setLang(next: Lang) {
  lang = next;
}

/** Chuỗi giao diện của ngôn ngữ đang chọn. */
export const t: Strings = new Proxy({} as Strings, {
  get: (_target, key) => (dicts[lang] as unknown as Record<string | symbol, unknown>)[key],
});

export function parseLang(v: string | null | undefined): Lang | null {
  return v === 'vi' || v === 'en' ? v : null;
}

/** Nội dung biên tập: bản tiếng Anh nếu đang ở tiếng Anh và đã nhập, ngược lại dùng bản tiếng Việt. */
export function localized(viText: string, enText?: string | null): string {
  return lang === 'en' && enText?.trim() ? enText : viText;
}

/** true nếu đang ở tiếng Anh nhưng trường tiếng Anh chưa được nhập (phải dùng tiếng Việt thay thế). */
export const isUntranslated = (enText?: string | null) => lang === 'en' && !enText?.trim();

export const numberLocale = () => (lang === 'en' ? 'en-US' : 'vi-VN');
