# Biên tập địa điểm và ảnh

Mỗi địa điểm là một file `content/places/<id>.json`. **Tên file chính là id** của địa điểm, dùng trong liên kết và mã QR (`?place=<id>`), nên **không đổi tên file sau khi đã in QR**.

Ảnh gốc nằm ở `content/images/`. Ảnh cho web (bản lớn và bản nhỏ trong `public/images/places/`) được tạo tự động, không commit.

## Cách 1: Sveltia CMS (khuyên dùng)

Trang quản trị cho phép thêm, sửa địa điểm và tải ảnh lên qua giao diện, không cần sửa JSON.

### Trên web (lưu thẳng lên GitHub, Vercel tự deploy sau khoảng 1–2 phút)

1. Mở `https://dulichquangtri.vercel.app/admin/`.
2. Bấm **Sign In Using Access Token** và dán token GitHub (cách tạo token: xem bên dưới). Token được lưu trong trình duyệt, không gửi đi đâu khác ngoài GitHub.
3. Sửa nội dung rồi bấm **Save**. Mỗi lần lưu là một commit lên nhánh `main`.

**Tạo token (làm một lần):** GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token:
- *Repository access*: **Only select repositories** → chọn `quang-tri-travel-map`.
- *Permissions → Repository permissions → Contents*: **Read and write**.
- Đặt thời hạn (ví dụ 90 ngày). Hết hạn thì tạo token mới.

Không chia sẻ token cho người khác, không dán vào chat hay file trong repo.

### Trên máy (chế độ cục bộ, dùng khi muốn sửa nhiều rồi mới đẩy lên)

1. `npm run dev`, mở `http://localhost:5173/admin/index.html` bằng **Chrome hoặc Edge**.
2. Bấm **Work with Local Repository**, chọn thư mục dự án `travel-map`.
3. Khi bấm **Save**, CMS ghi thẳng vào file trên máy; dev server tự kiểm tra dữ liệu, tạo ảnh và tải lại bản đồ (xem lỗi, nếu có, ở terminal chạy `npm run dev`).
4. Kiểm tra xong thì commit và push để deploy.

**Lưu ý:** sau khi sửa trên web, chạy `git pull` trên máy trước khi sửa cục bộ, để tránh xung đột.

### Thêm ảnh

Trong địa điểm → mục **Ảnh** → **Add ảnh** → chọn file. Điền đủ:
- **Mô tả nội dung ảnh**, **Tác giả**, **Giấy phép** (bắt buộc).
- **Liên kết nguồn**: bắt buộc với ảnh lấy từ Internet. Với ảnh tự chụp hoặc do cơ quan cung cấp có thể để trống, nhưng **phải lưu lại văn bản hoặc email đồng ý** ở ngoài hệ thống.

Ảnh đầu tiên trong danh sách là ảnh đại diện (thẻ địa điểm, carousel, ghim). Ảnh được thu nhỏ (tối đa 1600 px) và chuyển sang WebP ngay khi tải lên, nên có thể chọn thẳng ảnh chụp từ điện thoại, kể cả HEIC. Nên dùng ảnh **khổ ngang**.

Giấy phép chưa có trong danh sách: thêm vào `LICENSES` trong `scripts/lib.mjs`, rồi chạy `npm run places` để cập nhật CMS.

## Cách 2: sửa file trực tiếp

Sửa file trong `content/places/`, rồi chạy:

```bash
npm run places
```

Lệnh này sinh lại cấu hình CMS, kiểm tra dữ liệu, tự gán xã/phường theo tọa độ, tạo ảnh cho web, rồi xuất `public/data/places.json`. Nếu có lỗi, lệnh dừng lại và báo rõ file nào sai. `npm run build` (cả trên Vercel) cũng chạy lệnh này, nên dữ liệu sai sẽ làm deploy thất bại thay vì đưa lỗi lên web.

## Các trường

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| `layer` | ✓ | Mã lớp, xem `src/config/layers.data.json` (ví dụ `dia-chi-do`, `danh-thang`, `ocop`). |
| `name` | ✓ | Tên tiếng Việt. |
| `nameEn` | | Tên tiếng Anh. |
| `latLng` | ✓ | **"vĩ độ, kinh độ"** như Google Maps, ví dụ `"16.75393, 107.189536"`. Cách lấy: nhấp chuột phải vào địa điểm trên Google Maps, bấm dòng số đầu tiên để sao chép. |
| `summary` | ✓ | 1–2 câu nêu lý do nên đến. |
| `images` | | Danh sách ảnh `{ src, alt, credit, license, sourceUrl, licenseUrl }`. `src` có dạng `/images/places/<tên file>` (file thật nằm ở `content/images/<tên file>`). `licenseUrl` để trống thì tự điền theo giấy phép. |
| `links` | | `[{ "label": "...", "url": "https://..." }]`. |
| `months` | | Các tháng nổi bật (1–12), dùng cho lịch mùa vụ, lễ hội ở Phase 2. |
| `featured` | | `true` để hiện trong dải "Nổi bật". |
| `featuredOrder` | | Thứ tự trong dải "Nổi bật", số nhỏ đứng trước. |
| `isSample` | ✓ | `true` = dữ liệu minh họa, thẻ sẽ gắn nhãn "Dữ liệu minh họa". Chỉ đặt `false` khi thông tin **đã được cơ quan có thẩm quyền xác minh**. |
| `mapZoom` | | Mức zoom khi mở địa điểm dạng vùng rộng (6–17), ví dụ vườn quốc gia là `9.5`. |
| `icon` | | Emoji riêng, thay icon mặc định của lớp. |
| `source` | | Nguồn gốc dữ liệu, ví dụ `{ "osm": "way/1189797496", "osmName": "..." }`. |
| `extra` | | Trường riêng theo trụ cột, ví dụ giờ mở cửa, số sao OCOP… (CLAUDE.md mục 7). Chưa có trong CMS. |

**Không** nhập `id`, `coordinates`, `wardCode` hay `wardName`: các trường này được tính tự động khi build.

## Dữ liệu mẫu hiện tại

96 địa điểm mẫu. Tên và tọa độ lấy từ OpenStreetMap (© OpenStreetMap contributors, ODbL), có biên tập lại tên cho đúng tiếng Việt; tên gốc trong OSM được giữ ở `source.osmName`. Mô tả do người biên tập viết, không có giá vé, giờ mở cửa hay số điện thoại. **Tất cả cần được xác minh trước khi coi là dữ liệu thật.**

Để tìm thêm gợi ý từ OSM: `npm run osm:pois` sẽ tải các điểm quan tâm vào `.cache/osm-pois.geojson`.

## Ảnh từ Wikimedia Commons (bằng script)

1. Ghi tên file Commons vào `content/image-selection.json`, ví dụ `"thanh-co-quang-tri": "File:Thành cổ Quảng Trị 4.jpg"`.
2. Chạy `npm run images`: script lấy thông tin giấy phép mới nhất từ Commons (từ chối ảnh không có giấy phép tự do), tải ảnh vào `content/images/<id>.jpg` và ghi thông tin ghi công vào file địa điểm. Ảnh tự chụp đã có của địa điểm đó được giữ nguyên và đứng trước ảnh Commons.
3. Chạy `npm run places`.
4. Mở `http://localhost:5173/tools/review-images.html` (khi chạy `npm run dev`) để duyệt nhanh cả bộ ảnh.

Muốn tìm ảnh ứng viên: `npm run images:find <id> <id> …` ghi kết quả vào `.cache/image-candidates.json` (tác giả, giấy phép, khoảng cách từ vị trí chụp tới địa điểm). **Luôn xem ảnh bằng mắt trước khi chọn**: tìm theo tên rất hay ra ảnh sai (ví dụ trùng tên với nơi khác).
