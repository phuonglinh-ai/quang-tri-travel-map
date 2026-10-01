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
| `npm run places` | Kiểm tra `content/places.json` và xuất `public/data/places.json` (xem [content/README.md](content/README.md)) |
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
content/          Nguồn dữ liệu địa điểm để biên tập (places.json)
public/data/      GeoJSON và places.json đã xử lý (xem SOURCES.md)
public/fonts/     Glyph Noto Sans tự lưu trữ cho nhãn bản đồ
src/config/       Cấu hình tỉnh, lớp địa điểm, bảng màu
src/map/          MapLibre: style nền, lớp địa điểm (gom cụm), icon ghim
src/ui/           Panel (các màn hình), bottom sheet trên điện thoại
src/state.ts      Trạng thái ứng dụng (luồng một chiều)
src/i18n.ts       Chuỗi giao diện (chuẩn bị cho song ngữ)
src/main.ts       Nối store ↔ bản đồ ↔ panel ↔ URL
```

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
- Ảnh địa điểm: Wikimedia Commons, theo giấy phép của từng ảnh (ghi trên thẻ địa điểm và trong mục "Nguồn ảnh").
- Font: Noto Sans (nhãn bản đồ), Be Vietnam Pro (giao diện), đều theo SIL OFL 1.1.

## Liên kết sâu

| Tham số | Ví dụ | Tác dụng |
|---|---|---|
| `place` | `?place=thanh-co-quang-tri` | Mở thẳng thẻ địa điểm (dùng cho mã QR tại điểm thật) |
| `ward` | `?ward=18880` | Mở xã/phường theo mã |
| `layers` | `?layers=dia-chi-do,di-tich` | Chỉ bật các lớp này |
| `saved` | `?saved=a,b,c` | Mở danh sách địa điểm được chia sẻ |
