# Biên tập địa điểm (`places.json`)

`content/places.json` là **nguồn dữ liệu địa điểm** của bản đồ. Sau khi sửa, chạy:

```bash
npm run places
```

Lệnh này kiểm tra dữ liệu, tự gán xã/phường theo tọa độ, rồi xuất `public/data/places.json`. Nếu có lỗi, lệnh dừng lại và báo rõ lỗi ở dòng nào.

## Các trường

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| `id` | ✓ | Mã duy nhất, chỉ gồm chữ thường không dấu, số và dấu gạch ngang, ví dụ `thanh-co-quang-tri`. Dùng trong liên kết và mã QR (`?place=<id>`), **không đổi sau khi đã in QR**. |
| `layer` | ✓ | Mã lớp, xem `src/config/layers.data.json` (ví dụ `dia-chi-do`, `danh-thang`, `ocop`). |
| `name` | ✓ | Tên tiếng Việt. |
| `nameEn` | | Tên tiếng Anh, hoặc `null`. |
| `coordinates` | ✓ | `[kinh độ, vĩ độ]`, ví dụ `[107.1895, 16.7539]`. Lưu ý: kinh độ đứng trước. |
| `summary` | ✓ | 1–2 câu nêu lý do nên đến. |
| `images` | | Danh sách ảnh, mỗi ảnh là `{ src, thumb, alt, credit, license, licenseUrl, sourceUrl }` (xem mục "Ảnh" bên dưới). |
| `links` | | `[{ "label": "...", "url": "https://..." }]`. |
| `months` | | Các tháng nổi bật (1–12), dùng cho lịch mùa vụ, lễ hội ở Phase 2. |
| `featured` | | `true` để hiện trong dải "Nổi bật". |
| `isSample` | ✓ | `true` = dữ liệu minh họa, thẻ sẽ gắn nhãn "Dữ liệu minh họa". Chỉ đặt `false` khi thông tin **đã được cơ quan có thẩm quyền xác minh**. |
| `mapZoom` | | Mức zoom khi mở địa điểm dạng vùng rộng (6–17), ví dụ vườn quốc gia là `9.5`. |
| `icon` | | Emoji riêng, thay icon mặc định của lớp. |
| `source` | | Nguồn gốc dữ liệu, ví dụ `{ "osm": "way/1189797496" }`. |
| `extra` | | Trường riêng theo trụ cột, ví dụ giờ mở cửa, số sao OCOP… (CLAUDE.md mục 7). |

**Không** nhập `wardCode` hay `wardName`: hai trường này được tính tự động.

## Dữ liệu mẫu hiện tại

96 địa điểm mẫu. Tên và tọa độ lấy từ OpenStreetMap (© OpenStreetMap contributors, ODbL), có biên tập lại tên cho đúng tiếng Việt; tên gốc trong OSM được giữ ở `source.osmName`. Mô tả do người biên tập viết, không có giá vé, giờ mở cửa hay số điện thoại. **Tất cả cần được xác minh trước khi coi là dữ liệu thật.**

Để tìm thêm gợi ý từ OSM: `npm run osm:pois` sẽ tải các điểm quan tâm vào `.cache/osm-pois.geojson`.

## Ảnh

Ảnh hiển thị trên thẻ địa điểm, trong carousel và danh sách. **Mỗi ảnh bắt buộc có tác giả (`credit`), giấy phép (`license`) và liên kết nguồn (`sourceUrl`)**; `npm run places` sẽ báo lỗi nếu thiếu, hoặc nếu file ảnh không tồn tại.

### Ảnh từ Wikimedia Commons (cách hiện tại)

1. Ghi tên file Commons vào `content/image-selection.json`, ví dụ `"thanh-co-quang-tri": "File:Thành cổ Quảng Trị 4.jpg"`.
2. Chạy `npm run images`: script lấy thông tin giấy phép mới nhất từ Commons (từ chối ảnh không có giấy phép tự do), tải ảnh, thu nhỏ vào `public/images/places/`, rồi ghi `images` vào `places.json`.
3. Chạy `npm run places`.
4. Mở `http://localhost:5173/tools/review-images.html` (khi chạy `npm run dev`) để duyệt nhanh cả bộ ảnh.

Muốn tìm ảnh ứng viên: `npm run images:find <id> <id> …` ghi kết quả vào `.cache/image-candidates.json` (tác giả, giấy phép, khoảng cách từ vị trí chụp tới địa điểm). **Luôn xem ảnh bằng mắt trước khi chọn**: tìm theo tên rất hay ra ảnh sai (ví dụ trùng tên với nơi khác).

### Ảnh tự chụp hoặc ảnh do cơ quan cung cấp

Chép ảnh (khổ ngang, rộng khoảng 960 px) vào `public/images/places/`, rồi khai báo trực tiếp trong `places.json`:

```json
"images": [{
  "src": "images/places/ten-dia-diem.jpg",
  "alt": "Mô tả ngắn nội dung ảnh",
  "credit": "Tên tác giả hoặc đơn vị",
  "license": "Được phép sử dụng",
  "licenseUrl": null,
  "sourceUrl": "https://… (trang nguồn, hoặc trang của đơn vị cung cấp)"
}]
```

Với ảnh của cơ quan, cần lưu lại văn bản hoặc email đồng ý cho sử dụng.
