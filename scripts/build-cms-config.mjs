// Sinh cấu hình Sveltia CMS (public/admin/config.json) từ các nguồn cấu hình dùng chung:
// danh sách lớp (src/config/layers.data.json), giấy phép ảnh (LICENSES trong lib.mjs),
// repo và địa chỉ site (mục "cms" trong src/config/province.data.json).
// Không sửa tay config.json: sửa script này rồi chạy `npm run places`.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, province, readJson, LICENSES, IMAGES_PUBLIC_PREFIX } from './lib.mjs';

const { cms } = province;
const { groups, layers } = readJson(path.join(ROOT, 'src', 'config', 'layers.data.json'));
const groupLabel = new Map(groups.map((g) => [g.id, g.label]));

const LATLNG = '^\\s*-?\\d+(\\.\\d+)?\\s*,\\s*-?\\d+(\\.\\d+)?\\s*$';
const HTTPS = '^https://\\S+$';
const optional = { required: false };

const placeFields = [
  {
    name: 'layer', label: 'Lớp', widget: 'select',
    options: layers.map((l) => ({ label: `${l.icon} ${groupLabel.get(l.group)} – ${l.label}`, value: l.id })),
  },
  { name: 'name', label: 'Tên', widget: 'string' },
  { name: 'nameEn', label: 'Tên tiếng Anh', widget: 'string', ...optional },
  {
    name: 'latLng', label: 'Tọa độ (vĩ độ, kinh độ)', widget: 'string',
    hint: 'Cách lấy: trên Google Maps, nhấp chuột phải vào địa điểm, bấm vào dòng số đầu tiên để sao chép, rồi dán vào đây. Ví dụ: `16.75393, 107.189536`. Xã/phường được tự tính theo tọa độ.',
    pattern: [LATLNG, 'Cần dạng "vĩ độ, kinh độ", ví dụ 16.75393, 107.189536'],
  },
  { name: 'summary', label: 'Mô tả ngắn', widget: 'text', hint: '1–2 câu: vì sao nên đến. Không ghi giá vé, giờ mở cửa, số điện thoại khi chưa được xác minh.' },
  {
    name: 'images', label: 'Ảnh', label_singular: 'ảnh', widget: 'list', ...optional,
    collapsed: 'auto', summary: '{{fields.credit}} · {{fields.license}}', thumbnail: 'src',
    hint: 'Ảnh đầu tiên được dùng làm ảnh đại diện. Nên dùng ảnh ngang. Ảnh được tự thu nhỏ khi tải lên.',
    fields: [
      { name: 'src', label: 'File ảnh', widget: 'image', choose_url: false },
      { name: 'alt', label: 'Mô tả nội dung ảnh', widget: 'string', hint: 'Cho người dùng trình đọc màn hình, ví dụ "Cổng chính Thành cổ Quảng Trị".' },
      { name: 'credit', label: 'Tác giả', widget: 'string', hint: 'Tên người chụp hoặc đơn vị cung cấp. Bắt buộc ghi theo giấy phép.' },
      { name: 'license', label: 'Giấy phép', widget: 'select', options: LICENSES.map((l) => l.name), default: LICENSES.find((l) => l.ownSource).name },
      {
        name: 'sourceUrl', label: 'Liên kết nguồn', widget: 'string', type: 'url', ...optional,
        hint: 'Trang gốc của ảnh (bắt buộc với ảnh lấy từ Internet). Ảnh tự chụp hoặc do cơ quan cung cấp có thể để trống, nhưng cần lưu lại văn bản/email đồng ý ngoài hệ thống.',
        pattern: [HTTPS, 'Liên kết phải bắt đầu bằng https://'],
      },
      { name: 'licenseUrl', label: 'Liên kết giấy phép', widget: 'string', type: 'url', ...optional, hint: 'Để trống: tự điền theo giấy phép đã chọn.' },
    ],
  },
  {
    name: 'links', label: 'Liên kết', label_singular: 'liên kết', widget: 'list', ...optional,
    collapsed: 'auto', summary: '{{fields.label}}',
    fields: [
      { name: 'label', label: 'Tên hiển thị', widget: 'string' },
      { name: 'url', label: 'Địa chỉ', widget: 'string', type: 'url', pattern: [HTTPS, 'Liên kết phải bắt đầu bằng https://'] },
    ],
  },
  {
    name: 'months', label: 'Tháng nổi bật', widget: 'select', multiple: true, ...optional,
    options: Array.from({ length: 12 }, (_, i) => ({ label: `Tháng ${i + 1}`, value: i + 1 })),
    hint: 'Mùa vụ, lễ hội. Dùng cho lịch mùa vụ (Phase 2).',
  },
  {
    name: 'isSample', label: 'Dữ liệu minh họa', widget: 'boolean', default: true,
    hint: 'Chỉ tắt khi thông tin **đã được cơ quan có thẩm quyền xác minh**. Khi bật, thẻ địa điểm có nhãn "Dữ liệu minh họa".',
  },
  { name: 'mapZoom', label: 'Mức zoom khi mở', widget: 'number', value_type: 'float', min: 6, max: 17, step: 0.5, ...optional, hint: 'Cho địa điểm dạng vùng rộng, ví dụ vườn quốc gia 9.5. Để trống: 13.' },
  { name: 'icon', label: 'Icon riêng', widget: 'string', ...optional, hint: 'Một emoji thay icon mặc định của lớp, ví dụ ✈️.' },
  {
    name: 'source', label: 'Nguồn dữ liệu OpenStreetMap', widget: 'object', ...optional, collapsed: true,
    fields: [
      { name: 'osm', label: 'Mã đối tượng OSM', widget: 'string', ...optional, hint: 'Ví dụ way/1189797496' },
      { name: 'osmName', label: 'Tên trong OSM', widget: 'string', ...optional },
    ],
  },
];

const config = {
  backend: {
    name: 'github',
    repo: cms.repo,
    branch: cms.branch,
    // Chỉ có chủ dự án sửa: đăng nhập bằng fine-grained token, không cần dựng máy chủ OAuth.
    auth_methods: ['token'],
    commit_messages: {
      create: 'Thêm địa điểm {{slug}}',
      update: 'Cập nhật địa điểm {{slug}}',
      delete: 'Xóa địa điểm {{slug}}',
      uploadMedia: 'Tải ảnh {{path}}',
      deleteMedia: 'Xóa ảnh {{path}}',
    },
  },
  app_title: cms.title,
  site_url: cms.siteUrl,
  logo: { src: '/favicon.svg' },
  // Ảnh gốc lưu ở content/images/; `npm run places` (chạy trong build) tạo bản cho web ở public/images/places/.
  media_folder: 'content/images',
  public_folder: IMAGES_PUBLIC_PREFIX.replace(/\/$/, ''),
  media_libraries: {
    default: {
      config: {
        max_file_size: 30 * 1024 * 1024,
        filename_template: '{{slug}}-{{uuid_short}}',
        // Ảnh chụp điện thoại (kể cả HEIC) được thu nhỏ và nén ngay trong trình duyệt trước khi lưu vào repo.
        transformations: { raster_image: { format: 'webp', quality: 82, width: 1600, height: 1600 } },
      },
    },
  },
  slug: { encoding: 'ascii', clean_accents: true },
  output: { omit_empty_optional_fields: true, json: { indent_style: 'space', indent_size: 2 } },
  editor: { preview: false },
  // Dải "Nổi bật" sửa ở một chỗ: thấy cả danh sách, kéo thả để đổi thứ tự (không đánh số ở từng địa điểm).
  singletons: [
    {
      name: 'featured',
      label: 'Dải Nổi bật',
      icon: 'star',
      file: 'content/featured.json',
      format: 'json',
      fields: [
        {
          name: 'places', label: 'Địa điểm nổi bật', label_singular: 'địa điểm', widget: 'list',
          hint: 'Thứ tự trong danh sách là thứ tự trên carousel. Đổi thứ tự: kéo nút ═ ở đầu mỗi mục, hoặc bấm vào nút ═ rồi dùng phím mũi tên lên/xuống. Nên chọn địa điểm đã có ảnh.',
          field: {
            name: 'place', label: 'Địa điểm', widget: 'relation',
            collection: 'places', value_field: '{{slug}}', search_fields: ['name'], display_fields: ['name'],
          },
        },
      ],
    },
  ],
  collections: [
    {
      name: 'places',
      label: 'Địa điểm',
      label_singular: 'địa điểm',
      folder: 'content/places',
      format: 'json',
      extension: 'json',
      create: true,
      delete: true,
      identifier_field: 'name',
      // Tên file = id địa điểm, dùng trong liên kết và mã QR (?place=<id>): chỉ đặt khi tạo mới, không đổi sau đó.
      slug: { template: '{{name}}', editable: ['create'] },
      summary: '{{name}}',
      sortable_fields: ['name', 'layer'],
      view_groups: [{ label: 'Lớp', field: 'layer' }],
      thumbnail: 'images.*.src',
      preview_path: '/?place={{slug}}',
      fields: placeFields,
    },
  ],
};

const file = path.join(ROOT, 'public', 'admin', 'config.json');
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
console.log('✓ public/admin/config.json');
