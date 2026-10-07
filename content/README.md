# Biên tập địa điểm, tuyến, ảnh và bản dịch

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

### Dải "Nổi bật" (carousel)

Sửa ở mục **Dải Nổi bật** (biểu tượng ngôi sao, phần *Files*), không sửa trong từng địa điểm. Danh sách hiển thị đúng thứ tự trên carousel:
- **Thêm:** bấm *Add địa điểm* ở cuối danh sách, gõ tìm tên địa điểm.
- **Đổi thứ tự:** kéo nút ═ ở đầu mỗi mục, hoặc bấm nút ═ rồi dùng phím mũi tên lên/xuống.
- **Bỏ khỏi dải:** bấm ✕ của mục đó (địa điểm vẫn còn trên bản đồ).

Dữ liệu lưu ở `content/featured.json`. Nếu xóa một địa điểm đang nằm trong dải, lần build sau sẽ báo lỗi: cần bỏ địa điểm đó khỏi dải.

**Lưu ý:** id địa điểm (tên file) được dùng trong dải Nổi bật, liên kết chia sẻ và mã QR. Muốn đổi tên hiển thị thì sửa trường **Tên**, đừng tạo địa điểm mới rồi xóa địa điểm cũ.

### Tuyến trải nghiệm

Mục **Tuyến trải nghiệm** trong CMS (file `content/routes/<id>.json`, tên file là id, dùng trong liên kết `?route=<id>`):

1. Bấm **Tuyến mới**, nhập tên, chọn chủ đề, viết mô tả ngắn.
2. Ở **Điểm dừng**, thêm từng địa điểm theo đúng thứ tự tham quan (2–11 điểm, kéo nút ═ để đổi thứ tự). Mỗi điểm có thể kèm một ghi chú ngắn, chỉ ghi thông tin đã xác minh.
3. Lưu. Khi đăng tải, hệ thống **tự vẽ đường đi bám theo đường bộ** giữa các điểm (dùng dữ liệu đường OpenStreetMap của dự án), tính quãng đường từng chặng và cả tuyến; không cần nhập tay.

Lưu ý: địa điểm đã nằm trong tuyến thì không nên xóa hay đổi tên file (id); nếu xóa, lần build sau sẽ báo lỗi chỉ rõ tuyến và vị trí điểm dừng cần sửa. Quãng đường chỉ là ước tính để tham khảo; thời lượng chỉ hiển thị khi người biên tập nhập. Chủ đề (icon, màu) khai báo trong `src/config/routes.data.json`.

### Bản tiếng Anh

Trang có nút **VI | EN** ở đầu panel. Khung giao diện (nút, nhãn, tên lớp, chủ đề) đã dịch sẵn; **nội dung do bạn nhập** có thêm các trường tiếng Anh riêng, đều tùy chọn:

- Địa điểm: `nameEn`, `summaryEn`; ảnh: `altEn`; liên kết: `labelEn`.
- Tuyến: `nameEn`, `summaryEn`, `durationEn`, `audienceEn`; điểm dừng: `noteEn`.

Từng trường được xử lý riêng: trường tiếng Anh nào chưa nhập thì **tự hiển thị bản tiếng Việt thay thế** (riêng mô tả có dòng ghi chú nhỏ), nhập xong thì lần deploy sau hiển thị tiếng Anh. Mỗi lần chạy `npm run places` in ra độ phủ bản tiếng Anh (ví dụ "tên 18/102, mô tả 0/102") để theo dõi tiến độ. Tên xã/phường tiếng Anh lấy từ dữ liệu ranh giới chính thức, không cần nhập.

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
| `nameEn` | | Tên tiếng Anh, hiển thị khi người dùng chọn tiếng Anh (để trống thì hiển thị tên tiếng Việt). |
| `latLng` | ✓ | **"vĩ độ, kinh độ"** như Google Maps, ví dụ `"16.75393, 107.189536"`. Cách lấy: nhấp chuột phải vào địa điểm trên Google Maps, bấm dòng số đầu tiên để sao chép. |
| `summary` | ✓ | 1–2 câu nêu lý do nên đến. |
| `summaryEn` | | Bản tiếng Anh của `summary`. Để trống thì thẻ địa điểm hiển thị mô tả tiếng Việt kèm dòng "Description available in Vietnamese only". |
| `images` | | Danh sách ảnh `{ src, alt, altEn, credit, license, sourceUrl, licenseUrl }` (`altEn`: mô tả ảnh tiếng Anh, tùy chọn). `src` có dạng `/images/places/<tên file>` (file thật nằm ở `content/images/<tên file>`). `licenseUrl` để trống thì tự điền theo giấy phép. |
| `links` | | `[{ "label": "...", "labelEn": "...", "url": "https://..." }]` (`labelEn` tùy chọn). |
| `months` | | Các tháng đang vào mùa hoặc có lễ hội (1–12). Dùng cho "Lịch mùa vụ, lễ hội" ở trang chủ: chọn tháng thì các địa điểm có tháng đó được làm nổi bật trên bản đồ. Chỉ nhập khi biết chắc thời điểm. |
| `isSample` | ✓ | `true` = dữ liệu minh họa, thẻ sẽ gắn nhãn "Dữ liệu minh họa". Chỉ đặt `false` khi thông tin **đã được cơ quan có thẩm quyền xác minh**. |
| `mapZoom` | | Mức zoom khi mở địa điểm dạng vùng rộng (6–17), ví dụ vườn quốc gia là `9.5`. |
| `icon` | | Emoji riêng, thay icon mặc định của lớp. |
| `source` | | Nguồn gốc dữ liệu, ví dụ `{ "osm": "way/1189797496", "osmName": "..." }`. |
| `extra` | | Trường riêng theo trụ cột, ví dụ giờ mở cửa, số sao OCOP… (CLAUDE.md mục 7). Chưa có trong CMS. |

**Không** nhập `id`, `coordinates`, `wardCode` hay `wardName`: các trường này được tính tự động khi build.

## Dữ liệu mẫu hiện tại

102 địa điểm mẫu (cập nhật 07/10/2026; một phần do người biên tập nhập qua CMS). Tên và tọa độ lấy từ OpenStreetMap (© OpenStreetMap contributors, ODbL), có biên tập lại tên cho đúng tiếng Việt; tên gốc trong OSM được giữ ở `source.osmName`. Mô tả do người biên tập viết, không có giá vé, giờ mở cửa hay số điện thoại. **Tất cả cần được xác minh trước khi coi là dữ liệu thật.**

Để tìm thêm gợi ý từ OSM: `npm run osm:pois` sẽ tải các điểm quan tâm vào `.cache/osm-pois.geojson`.

## Theo dõi tiến độ nhập liệu

Mỗi lần chạy `npm run places` (hoặc `npm run build`, `npm run dev`), lệnh in ra các số liệu để biết còn thiếu gì:

| Dòng in ra | Ý nghĩa |
|---|---|
| `places.json … 102 địa điểm (102 mẫu): …` | Tổng số địa điểm, số còn là dữ liệu mẫu, số địa điểm theo từng lớp (lớp chưa có điểm nào không có trong danh sách) |
| `ảnh  58 ảnh` | Số ảnh đang dùng |
| `tiếng Anh  tên 18/102, mô tả 0/102` | Độ phủ bản dịch của địa điểm; địa điểm chưa dịch hiển thị tiếng Việt |
| `tiếng Anh  tên tuyến 0/2, mô tả 0/2` | Độ phủ bản dịch của tuyến |
| `routes.json … N tuyến` | Số tuyến và quãng đường |
| Dòng bắt đầu bằng `!` | Cảnh báo (không dừng build), ví dụ điểm nằm sát ranh giới, chặng tuyến dài bất thường hoặc không nối được vào đường |
| Dòng bắt đầu bằng `✗` | Lỗi: build dừng và nói rõ file nào, trường nào sai |

Việc nên làm dần: nhập `months` (mùa vụ, lễ hội), `summaryEn` và `nameEn`, thêm ảnh cho các điểm chưa có, thêm điểm nông sản và điểm STEM rồi tạo tuyến mới, và chỉ đặt `isSample: false` khi thông tin đã được xác minh.

## Ảnh từ Wikimedia Commons (bằng script)

1. Ghi tên file Commons vào `content/image-selection.json`, ví dụ `"thanh-co-quang-tri": "File:Thành cổ Quảng Trị 4.jpg"`.
2. Chạy `npm run images`: script lấy thông tin giấy phép mới nhất từ Commons (từ chối ảnh không có giấy phép tự do), tải ảnh vào `content/images/<id>.jpg` và ghi thông tin ghi công vào file địa điểm. Ảnh tự chụp đã có của địa điểm đó được giữ nguyên và đứng trước ảnh Commons.
3. Chạy `npm run places`.
4. Mở `http://localhost:5173/tools/review-images.html` (khi chạy `npm run dev`) để duyệt nhanh cả bộ ảnh.

Muốn tìm ảnh ứng viên: `npm run images:find <id> <id> …` ghi kết quả vào `.cache/image-candidates.json` (tác giả, giấy phép, khoảng cách từ vị trí chụp tới địa điểm). **Luôn xem ảnh bằng mắt trước khi chọn**: tìm theo tên rất hay ra ảnh sai (ví dụ trùng tên với nơi khác).
