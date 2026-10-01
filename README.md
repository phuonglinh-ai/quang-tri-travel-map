# Bản đồ tương tác tỉnh Quảng Trị (bản demo)

Bản đồ tương tác quảng bá **du lịch, nông sản, giáo dục** của tỉnh Quảng Trị. Đây là dự án cá nhân làm bản demo để giới thiệu cho tỉnh, không phải trang thông tin chính thức.

- Bản đồ nền **tự vẽ hoàn toàn** từ GeoJSON bằng [MapLibre GL JS](https://maplibre.org/), không dùng raster tile của bên thứ ba.
- Ranh giới hành chính theo dữ liệu chính thức sau sáp nhập (chính quyền 2 cấp, từ 01/07/2025).
- Toàn bộ thông tin riêng của tỉnh nằm trong `src/config/`, nên đổi sang tỉnh khác không phải sửa component.

Yêu cầu và quy tắc chi tiết: xem [CLAUDE.md](CLAUDE.md).

## Chạy thử

Cần Node.js 20 trở lên.

```bash
npm install
npm run dev        # http://localhost:5173
```

Dữ liệu đã build sẵn trong `public/data/`, nên không cần chạy lại pipeline dữ liệu để xem demo.

## Lệnh

| Lệnh | Việc làm |
|---|---|
| `npm run dev` | Chạy server phát triển |
| `npm run build` | Kiểm tra kiểu (TypeScript) và build site tĩnh vào `dist/` |
| `npm run preview` | Xem thử bản build |
| `npm run data` | Tải lại toàn bộ dữ liệu nguồn rồi build lại `public/data/` |
| `npm run data:fetch` | Chỉ tải dữ liệu nguồn vào `.cache/` (git sparse checkout, Overpass API, Natural Earth, glyph font) |
| `npm run data:build` | Xử lý `.cache/` thành `public/data/`, sau đó chạy kiểm tra |
| `npm run places` | Sinh cấu hình CMS, kiểm tra `content/places/*.json`, tạo ảnh cho web và xuất `public/data/places.json` (xem [content/README.md](content/README.md)) |
| `npm run images` | Tải ảnh đã chọn từ Wikimedia Commons (`content/image-selection.json`) kèm thông tin ghi công |
| `npm run images:find` | Tìm ảnh ứng viên trên Commons cho các địa điểm |
| `npm run osm:pois` | Tải gợi ý địa điểm từ OpenStreetMap vào `.cache/` để biên tập |
| `npm run data:verify` | Kiểm tra dữ liệu: đủ 78 xã, không mất đảo (Cồn Cỏ, Hoàng Sa…), nhãn đặt đúng chỗ |

## Cấu trúc

```
scripts/          Pipeline dữ liệu (Node.js + mapshaper)
  fetch-*.mjs     Tải dữ liệu nguồn vào .cache/
  build-*.mjs     Xử lý thành public/data/
  verify-data.mjs Kiểm tra tự động; thoát với mã lỗi nếu vi phạm
content/          Nguồn nội dung để biên tập (sửa qua CMS): places/<id>.json, images/, featured.json
public/admin/     Trang quản trị Sveltia CMS (/admin/); config.json sinh tự động, không sửa tay
public/data/      GeoJSON đã xử lý (xem SOURCES.md); places.json sinh tự động, không lưu trong git
public/fonts/     Glyph Noto Sans tự lưu trữ cho nhãn bản đồ
src/config/       Cấu hình tỉnh, lớp địa điểm, bảng màu
src/map/          MapLibre: style nền, lớp địa điểm (gom cụm), icon ghim
src/ui/           Panel (các màn hình), bottom sheet trên điện thoại
src/state.ts      Trạng thái ứng dụng (luồng một chiều)
src/i18n.ts       Chuỗi giao diện (chuẩn bị cho song ngữ)
src/main.ts       Nối store ↔ bản đồ ↔ panel ↔ URL
```

## Đồng bộ giữa máy, GitHub và CMS

### Nguyên tắc

- **Bản gốc là nhánh `main` trên GitHub.** Máy tính chỉ là một bản sao.
- **CMS trên web** (`/admin/`) lưu thẳng lên `main`: mỗi lần bấm **Save** là một commit (tên tác giả là chủ token, ví dụ "Phương Linh AI"). Vercel tự deploy sau mỗi commit.
- **CMS chỉ ghi vào thư mục `content/`.** Sửa code thì ghi vào `src/`, `scripts/`, `public/`… Vì hai bên sửa các file khác nhau, git ghép được cả hai mà không mất phần nào, **miễn là luôn kéo về trước khi đẩy lên**.
- `public/data/places.json` (dữ liệu địa điểm cho bản đồ) là **file sinh ra** từ `content/` và **không lưu trong git** (đã khai báo trong `.gitignore`). File được tạo lại tự động khi chạy `npm run dev`, `npm run build` (kể cả trên Vercel) hoặc `npm run places`, nên không bao giờ phải commit hay đồng bộ file này.
- **Không bao giờ dùng `git push --force`.** Lệnh này ghi đè GitHub bằng bản trên máy và **xóa mất các nội dung đã lưu từ CMS** mà máy chưa kéo về.

**Thiết lập một lần (khuyên dùng):** để `git pull` luôn đặt commit trên máy lên sau commit mới từ CMS (không tạo commit "Merge…"), và tự cất tạm thay đổi chưa commit:

```bash
git config pull.rebase true
```

```bash
git config rebase.autoStash true
```

Các lệnh bên dưới vẫn ghi đầy đủ tùy chọn, nên làm hay không bước này đều dùng được.

### A. Sau khi sửa trên CMS (web): kéo về máy

Làm mỗi khi đã sửa nội dung trên `/admin/`, và **luôn làm trước khi bắt đầu sửa code**:

```bash
git pull --rebase --autostash
```

- Lệnh này tải các commit của CMS về. Nếu trên máy đang có thay đổi chưa commit, git tự cất tạm rồi trả lại sau khi kéo.
- Bản đồ trên máy tự cập nhật theo nội dung mới: `npm run dev` sinh lại dữ liệu địa điểm và ảnh khi khởi động, và cả khi `content/` thay đổi lúc đang chạy.
- Kiểm tra: `git log --oneline -5` phải thấy các commit "Cập nhật địa điểm …" mới nhất, và `git status` báo `Your branch is up to date with 'origin/main'`.

### B. Sửa code rồi commit và đẩy lên toàn bộ

1. **Kéo về trước khi sửa** (như mục A):
   ```bash
   git pull --rebase --autostash
   ```
2. Sửa code, chạy `npm run dev` để xem thử.
3. **Kiểm tra trước khi commit:** lệnh dưới đây kiểm tra kiểu TypeScript, kiểm tra dữ liệu địa điểm và build thử. Có lỗi thì sửa xong mới đi tiếp.
   ```bash
   npm run build
   ```
4. **Xem lại danh sách file thay đổi.** Chỉ nên có các file anh/chị đã sửa. Nếu thấy file lạ (đặc biệt file chứa token, mật khẩu, `.env`) thì **không** commit file đó.
   ```bash
   git status
   ```
5. **Commit toàn bộ:**
   ```bash
   git add -A
   ```
   ```bash
   git commit -m "Mô tả ngắn việc đã làm"
   ```
6. **Kéo về lần nữa ngay trước khi đẩy lên**, vì trong lúc sửa code có thể đã có người lưu trên CMS. Git sẽ đặt commit của anh/chị lên sau các commit của CMS, nên nội dung trên CMS được giữ nguyên:
   ```bash
   git pull --rebase --autostash
   ```
7. **Đẩy lên** (Vercel tự deploy sau khoảng 1–2 phút):
   ```bash
   git push
   ```
8. Nếu đang mở trang `/admin/` trong trình duyệt, **tải lại trang (F5)** trước khi sửa tiếp, để CMS đọc phiên bản mới nhất.

Nếu `git push` báo `rejected … (fetch first)` hoặc `non-fast-forward`, nghĩa là GitHub có commit mới mà máy chưa có: làm lại bước 6 rồi `git push`. **Không** thêm `--force`.

### C. Sửa nội dung bằng CMS chế độ cục bộ (trên máy)

Dùng khi muốn sửa nhiều địa điểm rồi mới đẩy lên một lần (xem [content/README.md](content/README.md)):

1. `git pull --rebase --autostash`, rồi `npm run dev`.
2. Mở `http://localhost:5173/admin/index.html`, sửa và **Save**: CMS ghi thẳng vào `content/` trên máy, chưa lên GitHub.
3. Commit và đẩy lên như bước 4–7 của mục B.

Trong thời gian sửa cục bộ, **không sửa cùng địa điểm đó trên CMS web**, để tránh xung đột.

### Khi gặp xung đột (conflict)

Xung đột chỉ xảy ra khi máy và CMS cùng sửa một file. `git pull` sẽ dừng lại và `git status` liệt kê file bị xung đột.

- **File trong `content/`** (cùng một địa điểm bị sửa ở cả hai nơi): mở file, tìm đoạn giữa `<<<<<<<` và `>>>>>>>`, giữ lại nội dung đúng, xóa các dòng đánh dấu, rồi chạy `git add <file>` và `git rebase --continue`.
- **Muốn hủy và quay về trạng thái trước khi kéo:**
  ```bash
  git rebase --abort
  ```

### Tóm tắt

| Tình huống | Lệnh |
|---|---|
| Vừa sửa trên CMS web, cần cập nhật máy | `git pull --rebase --autostash` (rồi `npm run dev` nếu muốn xem) |
| Bắt đầu sửa code | `git pull --rebase --autostash` |
| Sửa code xong | `npm run build` → `git status` → `git add -A` → `git commit -m "…"` → `git pull --rebase --autostash` → `git push` |
| `git push` bị từ chối | `git pull --rebase --autostash` → `git push` (không dùng `--force`) |

## Triển khai

Site tĩnh, triển khai được lên mọi hosting tĩnh.

- **Vercel:** build command `npm run build`, output `dist`.
- **GitHub Pages:** vì site nằm dưới `/<tên-repo>/`, cần build với biến `BASE_PATH`:

```bash
BASE_PATH=/travel-map/ npm run build
```

## Nguồn dữ liệu và giấy phép

- Ranh giới hành chính: NXB Tài nguyên, Môi trường và Bản đồ Việt Nam (sapnhap.bando.com.vn), qua [vietnamese-provinces-database](https://github.com/thanglequoc/vietnamese-provinces-database) (MIT).
- Đường, sông, hồ: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL).
- Đất liền ngoài lãnh thổ: [Natural Earth](https://www.naturalearthdata.com/) (public domain), chỉ dùng hình học.
- Vị trí địa điểm mẫu: © OpenStreetMap contributors (ODbL).
- Ảnh địa điểm: Wikimedia Commons hoặc do cơ quan cung cấp (có văn bản đồng ý), theo giấy phép của từng ảnh (ghi trên thẻ địa điểm và trong mục "Nguồn ảnh").
- Font: Noto Sans (nhãn bản đồ), Be Vietnam Pro (giao diện), đều theo SIL OFL 1.1.

## Liên kết sâu

| Tham số | Ví dụ | Tác dụng |
|---|---|---|
| `place` | `?place=thanh-co-quang-tri` | Mở thẳng thẻ địa điểm (dùng cho mã QR tại điểm thật) |
| `ward` | `?ward=18880` | Mở xã/phường theo mã |
| `layers` | `?layers=dia-chi-do,di-tich` | Chỉ bật các lớp này |
| `saved` | `?saved=a,b,c` | Mở danh sách địa điểm được chia sẻ |
