# CLAUDE.md — Dự án "Travel Map": Bản đồ tương tác quảng bá một tỉnh/vùng của Việt Nam

> File này tổng hợp phần phân tích đã làm trong khung chat claude.ai (30/09/2026).
> Hãy đọc hết file trước khi viết code. Mục "Việc chưa quyết định" phải được hỏi lại người dùng, không được tự đoán.

---

## 1. Mục tiêu

Xây dựng một website **bản đồ tương tác** cho **một tỉnh** (có thể mở rộng lên cấp vùng) của Việt Nam. Website quảng bá ba trụ cột:

1. **Du lịch**: di tích, danh thắng, làng nghề, lễ hội, lưu trú, ẩm thực.
2. **Nông sản**: sản phẩm OCOP, vùng trồng có chỉ dẫn địa lý, hợp tác xã, trang trại trải nghiệm.
3. **Giáo dục**: trường học, thư viện, bảo tàng, địa chỉ đỏ, điểm trải nghiệm cho học sinh.

Mô hình tham chiếu: https://japantripplanners.com/interactive-map (xem mục 3).

Ngôn ngữ giao diện: **tiếng Việt là chính**, có chuẩn bị sẵn cấu trúc để thêm tiếng Anh.
Người dùng (chủ dự án) làm trong lĩnh vực giáo dục và chính sách. Nội dung phải dùng tiếng Việt chuẩn mực và trang trọng.

---

## 2. Trạng thái hiện tại

- **Đã xong Phase 0, Phase 1 (MVP) và phần ảnh địa điểm** (30/09–01/10/2026). Chi tiết ở mục 11.
- **Git:** repo đã `git init` (nhánh `master`) nhưng **chưa có commit nào**. Người dùng yêu cầu chưa commit; chỉ commit khi được yêu cầu.
- **Tỉnh đã chọn: Quảng Trị** — tỉnh mới, sáp nhập từ Quảng Bình cũ và Quảng Trị cũ (xem hồ sơ tỉnh ở mục 5.4).
- Toàn bộ code vẫn phải tham số hóa theo tỉnh thông qua một file cấu hình (`src/config/province.ts`). **Không** hard-code tên tỉnh trong component, để sau này có thể mở rộng sang tỉnh khác hoặc cấp vùng.

```
PROVINCE_CODE      = "44"
PROVINCE_CODE_NAME = "quang_tri"
DATA_PATH          = json/geojson/44_quang_tri/
```

---

## 3. Phân tích website tham chiếu (bản miễn phí, bỏ qua tính năng Premium)

| Chức năng gốc | Mô tả | Áp dụng cho dự án |
|---|---|---|
| **Travel Deeper** (điều hướng nhiều cấp) | Toàn quốc → bản đồ 47 tỉnh → bản đồ riêng từng tỉnh. Có nút "Back" và nút đưa về góc nhìn ban đầu (recenter). | **Tỉnh → xã/phường** (chính quyền 2 cấp từ 01/07/2025, không còn cấp huyện). Có nút quay lại và nút recenter. Phiên bản vùng sau này: Vùng → Tỉnh → Xã. |
| **Map layers** | Khoảng 15 lớp bật/tắt ở thanh bên trái. Mỗi lớp có icon emoji và **số lượng địa điểm** (ví dụ "Parks – 480 locations"). | Giữ nguyên cách làm: toggle, icon, bộ đếm. Danh sách lớp xem mục 6. |
| **Location browser + search** | Bấm vào tên lớp để mở danh sách địa điểm, nhóm theo tỉnh, có ô tìm kiếm. Chọn một kết quả thì bản đồ bay tới ghim đó. | Danh sách nhóm theo **xã/phường**. Tìm kiếm **không phân biệt dấu** (bỏ dấu tiếng Việt khi so khớp). |
| **Fast Travel** | Phím tắt tới các khu vực trọng điểm. | Phím tắt tới trung tâm tỉnh và các cụm du lịch chính (cấu hình trong file tỉnh). |
| **Location card** | Tên, loại, thành phố/tỉnh, mô tả ngắn về lý do nên đến, các liên kết (đặt chỗ, bài hướng dẫn, video). | Thẻ có trường riêng theo từng trụ cột (xem mục 7). |
| **Save Place** | Lưu địa điểm vào tài khoản, đồng bộ giữa các thiết bị, dùng được trong Itinerary Builder. | MVP: lưu bằng `localStorage` (try/catch), **không cần tài khoản**. Có nút chia sẻ danh sách bằng link. |
| **Featured carousel** | Dải ảnh lớn các điểm tiêu biểu, vuốt ngang, bấm để mở trên bản đồ. | Giữ nguyên. |
| **Nội dung SEO + ghi nguồn + form góp ý** | Đoạn giới thiệu, thẻ dẫn sang bài hướng dẫn, ghi nguồn dữ liệu bản đồ, link báo lỗi, đăng ký bản tin. | Giữ phần ghi nguồn và link góp ý. Bỏ phần bản tin ở MVP. |
| Mô hình kinh doanh (affiliate, AdSense, Premium) | — | **Không áp dụng.** Thay bằng link sang sàn thương mại điện tử nông sản, link đặt phòng, trang của Sở/ngành. |

**Tính năng mới đề xuất** (không có trong bản gốc):

- **Lịch mùa vụ và lễ hội**: thanh trượt theo tháng, bản đồ làm nổi bật các điểm đang vào mùa. Đây là điểm khác biệt chính của dự án (thuộc Phase 2).
- **Tuyến trải nghiệm theo chủ đề**: ví dụ "Một ngày tham quan nông nghiệp", "Tuyến học tập ngoại khóa", "Hành trình về nguồn". Dùng thay cho Itinerary Builder (Phase 2).
- **Mã QR tại điểm thật**: URL sâu dạng `?place=<id>` mở thẳng thẻ địa điểm (làm ngay ở MVP, vì chỉ cần hỗ trợ query string).
- **Tìm theo tên đơn vị cũ, trước sáp nhập** (Phase 3, cần dữ liệu bổ sung, xem mục 5.3).

---

## 4. Quy tắc bắt buộc

1. **Chủ quyền biển đảo.** Mọi bản đồ hiển thị vùng biển phải thể hiện đúng **Hoàng Sa** (thuộc TP. Đà Nẵng) và **Trường Sa** (thuộc tỉnh Khánh Hòa). Dữ liệu ranh giới ở mục 5.1 đã chứa hai quần đảo này. Không được cắt bỏ các polygon đảo khi đơn giản hóa hình học.
2. **Không dùng lớp nền dạng ảnh (raster tile) của bên thứ ba** như Google, OSM standard tiles hay Mapbox, vì không kiểm soát được cách ghi tên. Bản đồ nền phải **tự vẽ** từ GeoJSON/vector (xem mục 5.2).
3. **Ghi nguồn dữ liệu** ở góc bản đồ:
   - Ranh giới hành chính: NXB Tài nguyên, Môi trường và Bản đồ Việt Nam (sapnhap.bando.com.vn), qua bộ dữ liệu vietnamese-provinces-database (MIT).
   - Đường, sông, hồ: © OpenStreetMap contributors (ODbL).
4. **Không bịa dữ liệu thật.** Mọi địa điểm mẫu phải có `"isSample": true` và hiển thị nhãn "Dữ liệu minh họa" trên thẻ. Không tự viết ra giá vé, giờ mở cửa hay số điện thoại mà trông như thật.
5. Tên đơn vị hành chính lấy theo dữ liệu chính thức, **không tự sửa chính tả**. Lưu ý: dữ liệu viết "Khánh Hoà" (dấu đặt kiểu cũ), vẫn giữ nguyên.
6. Web phải responsive, dùng tốt trên điện thoại (phần lớn người dùng mở bằng điện thoại, nhất là khi quét QR).
7. Mọi thao tác với `localStorage` phải bọc trong try/catch.

---

## 5. Dữ liệu bản đồ

### 5.1 Ranh giới hành chính — NGUỒN CHÍNH (đã kiểm chứng)

- Repo: https://github.com/thanglequoc/vietnamese-provinces-database (giấy phép **MIT**, được dùng cho mục đích thương mại)
- Phạm vi: 34 tỉnh/thành và 3.321 xã/phường/đặc khu, mã đơn vị hành chính chính thức.
- Phiên bản đã kiểm tra: **v5.1.0**, cập nhật đến Nghị quyết 36/2026/QH16 (hiệu lực 01/09/2026). Nghị quyết 39/2026/QH16 về Bắc Ninh (hiệu lực 20/09/2026) đang "Work in Progress". **Nếu chọn Bắc Ninh, phải kiểm tra lại bản mới nhất.**
- Hệ tọa độ: **WGS 84 (EPSG:4326)**, thứ tự [kinh độ, vĩ độ]. Dùng trực tiếp được cho MapLibre/Leaflet.
- Cấu trúc thư mục GeoJSON:
  ```
  json/geojson/{province_code}_{province_code_name}/{province_code}_{province_code_name}.geojson
  json/geojson/{province_code}_{province_code_name}/wards/{ward_code}_{ward_code_name}.geojson
  ```
  Ví dụ: `json/geojson/01_ha_noi/01_ha_noi.geojson`
- Mỗi file là một `FeatureCollection` chứa **1 Feature** kiểu `MultiPolygon`, có `bbox`, và `id` bằng mã đơn vị.
- Các trường `properties` của file tỉnh (đã kiểm tra thực tế):
  `code, name, nameEn, fullName, fullNameEn, codeName, postalCode, postalCodePrefix, gisServerId, areaKm2`
  File xã/phường có **cùng bộ trường** (đã kiểm tra với file `18880_dong_hoi.geojson`). Ở cấp xã, `postalCode` có giá trị (ví dụ `47122`), còn `postalCodePrefix` để trống.
- Kích thước đã đo: Hà Nội khoảng 100 KB (1 polygon, khoảng 1.150 điểm); Đà Nẵng khoảng 384 KB (53 polygon); Khánh Hòa khoảng 773 KB (164 polygon, vì có nhiều đảo).
- Bbox đã xác nhận có quần đảo: Đà Nẵng tới 112,74°E (Hoàng Sa); Khánh Hòa tới 117,83°E và 7,18°N (Trường Sa).
- **Cách tải dữ liệu:** không clone toàn bộ repo vì rất nặng (riêng GeoJSON khoảng 94 MB trở lên, lần clone đầy đủ trước đó bị quá thời gian). Chỉ lấy thư mục của tỉnh đã chọn, dùng sparse checkout:
  ```bash
  git clone --depth 1 --filter=blob:none --sparse https://github.com/thanglequoc/vietnamese-provinces-database.git vn-data
  cd vn-data && git sparse-checkout set json/geojson/44_quang_tri
  ```
  Hoặc tải file lẻ qua `https://raw.githubusercontent.com/thanglequoc/vietnamese-provinces-database/master/json/geojson/...`
- **Lưu ý tên file:** tên file xã có thể chứa ký tự Unicode như `đ`, cần xử lý đúng khi đọc file.
- Script build nên **gộp tất cả file xã của tỉnh thành một FeatureCollection** (`wards.geojson`), có thể đơn giản hóa thêm bằng `mapshaper` (giữ đảo nhỏ, dùng tùy chọn `keep-shapes`). Kết quả đặt tại `public/data/`.

### 5.2 Bản đồ nền (đường, sông, hồ, bờ biển)

- Trích dữ liệu OpenStreetMap **chỉ trong phạm vi tỉnh**, dùng polygon tỉnh ở mục 5.1 để cắt. Hai cách:
  - Geofabrik `vietnam-latest.osm.pbf` → `osmium extract -p province.geojson` → lọc bằng `osmium tags-filter` (highway chính, waterway, natural=water) → xuất GeoJSON bằng `ogr2ogr` hoặc `osmium export`.
  - Hoặc dùng Overpass API với bbox tỉnh (chỉ hợp với tỉnh nhỏ).
- Chỉ giữ các loại đường chính (motorway, trunk, primary, secondary; có thể thêm tertiary). Làm giảm độ chi tiết để file nhẹ.
- **Không** dùng các nhãn tên quần đảo, tên biển từ OSM. Nếu cần ghi nhãn thì tự đặt: "Quần đảo Hoàng Sa", "Quần đảo Trường Sa", "Biển Đông".

### 5.3 Nguồn phụ (chưa dùng ở MVP)

- https://sapnhap.bando.com.vn và https://vnsdi.mae.gov.vn/bandohanhchinh/: công cụ tra cứu chính thống, dùng để **đối chiếu** ranh giới. Không phải nguồn để tải dữ liệu.
- https://gis.vn/don-vi-hanh-chinh-viet-nam (cần tài khoản, **người dùng có thể đăng ký nếu cần**). Có GeoJSON/Shapefile/KML cho 34 tỉnh và cấp xã, kèm các thuộc tính bổ sung: trụ sở, dân số, diện tích, **"Trước sáp nhập"**; ngoài ra có DEM 30m. **Chưa rõ giấy phép**, phải hỏi điều kiện sử dụng trước khi đưa lên website công khai. Dữ liệu này hữu ích cho: (a) tìm kiếm theo tên cũ, (b) đổ bóng địa hình cho tỉnh miền núi.

### 5.4 Hồ sơ tỉnh Quảng Trị (dữ liệu đã kiểm tra trong repo, 30/09/2026)

**Thông số chung**

- File tỉnh: `json/geojson/44_quang_tri/44_quang_tri.geojson`, khoảng 316 KB, `MultiPolygon` gồm **2 polygon**:
  - Đất liền: khoảng 3.589 điểm tọa độ.
  - **Đặc khu Cồn Cỏ**: đảo nhỏ, chỉ khoảng 39 điểm, nằm quanh tọa độ 107,33–107,35°E, 17,15–17,17°N. **Tuyệt đối không để mất polygon này khi đơn giản hóa** (mapshaper phải dùng `keep-shapes`). Cần kiểm tra lại bằng mắt sau khi build.
- Thuộc tính tỉnh: `code "44"`, `fullName "Tỉnh Quảng Trị"`, `areaKm2 12700`, `postalCodePrefix "47, 48"`.
- Bbox: `[105.606055, 16.300464, 107.385952, 18.090919]`. Khi khởi tạo bản đồ, dùng `fitBounds` với bbox này, có padding.
- Thư mục `wards/` có **78 file** xã/phường/đặc khu. Tên file theo mẫu `{ward_code}_{code_name}.geojson`.
- Tỉnh có hình dáng dài và hẹp theo hướng Bắc–Nam, phía tây giáp Lào, phía đông giáp biển. Trên mobile, cần tính trước bố cục để panel không che mất phần lớn bản đồ.

**Mã xã/phường đã xác nhận** (dùng làm Fast Travel; mở rộng dần danh sách này khi cần):

| Mã | Tên | Ghi chú |
|---|---|---|
| 18880 | Phường Đồng Hới | Khu vực Quảng Bình cũ |
| 19138 | Phong Nha | Cửa ngõ Vườn quốc gia Phong Nha – Kẻ Bàng |
| 19333 | Đông Hà | Khu vực Quảng Trị cũ |
| 19351 | Nam Đông Hà | |
| 19429 | Khe Sanh | |
| 19432 | Lao Bảo | Khu vực cửa khẩu |
| 19742 | Cồn Cỏ | Đặc khu đảo |

→ Không tự khẳng định đâu là trụ sở hành chính tỉnh. Nếu cần hiển thị thông tin này, phải hỏi hoặc xác minh với người dùng.

**Gợi ý nội dung để làm dữ liệu mẫu** (tất cả đặt `isSample: true`; tọa độ và thông tin chi tiết phải được người dùng xác minh trước khi coi là dữ liệu thật):

- *Du lịch – thiên nhiên:* Vườn quốc gia Phong Nha – Kẻ Bàng (Di sản thiên nhiên thế giới), các bãi biển (Nhật Lệ, Cửa Tùng…), đảo Cồn Cỏ.
- *Du lịch – di tích / Giáo dục – địa chỉ đỏ:* Thành cổ Quảng Trị, Địa đạo Vịnh Mốc, Di tích Hiền Lương – Bến Hải, Nghĩa trang Liệt sĩ Quốc gia Trường Sơn, Nghĩa trang Liệt sĩ Quốc gia Đường 9, Khe Sanh.
  → Đây là **thế mạnh đặc thù của tỉnh**. Nên thiết kế lớp "Địa chỉ đỏ" và tuyến trải nghiệm "Hành trình về nguồn" thật chỉn chu, vì phù hợp với giáo dục truyền thống và du lịch ký ức chiến tranh.
- *Nông sản:* để trống, chờ người dùng cung cấp danh mục sản phẩm OCOP và chỉ dẫn địa lý chính thức. Không tự liệt kê.
- *Hạ tầng:* sân bay Đồng Hới, ga Đồng Hới, ga Đông Hà, cửa khẩu Lao Bảo.

**Lưu ý hiển thị:** Nên làm mờ nhẹ phần lãnh thổ bên ngoài tỉnh (các tỉnh lân cận và Lào) để bản đồ không bị "lơ lửng" giữa khoảng trống. Có thể lấy polygon các tỉnh lân cận từ cùng repo: `42_ha_tinh`, `46_hue`. (Thực tế đang dùng 7 tỉnh lân cận, xem `neighbors` trong `src/config/province.data.json` và mục 11.) Nhãn nước láng giềng ghi là "Lào", tự đặt, không lấy từ OSM.

---

## 6. Các lớp dữ liệu (layers)

| Nhóm | Lớp | Icon gợi ý |
|---|---|---|
| Du lịch | Di tích lịch sử – văn hóa | 🏛️ |
| Du lịch | Danh lam thắng cảnh / thiên nhiên | 🏞️ |
| Du lịch | Làng nghề | 🧺 |
| Du lịch | Lễ hội | 🎎 |
| Du lịch | Lưu trú (homestay, khách sạn) | 🏨 |
| Du lịch | Ẩm thực đặc sản | 🍜 |
| Nông sản | Sản phẩm OCOP | ⭐ |
| Nông sản | Vùng trồng / chỉ dẫn địa lý | 🌾 |
| Nông sản | HTX, trang trại trải nghiệm | 🚜 |
| Giáo dục | Trường ĐH/CĐ/nghề | 🎓 |
| Giáo dục | Thư viện, bảo tàng | 📚 |
| Giáo dục | Địa chỉ đỏ, điểm giáo dục truyền thống | 🚩 |
| Giáo dục | Điểm trải nghiệm STEM/nông nghiệp cho học sinh | 🔬 |
| Hạ tầng | Sân bay, ga, bến xe, bến tàu/phà | ✈️ 🚉 🚌 ⛴️ |
| Nền | Ranh giới xã/phường, đường chính, sông hồ | — |

Danh sách lớp phải khai báo trong file cấu hình (`src/config/layers.ts`), không viết cứng trong UI.

---

## 7. Mô hình dữ liệu địa điểm (POI)

**Thực tế đã triển khai:** nguồn biên tập là `content/places.json`; `npm run places` kiểm tra rồi xuất `public/data/places.json` (thêm `wardCode`, `wardName`). Hướng dẫn biên tập: `content/README.md`.

Lưu dạng JSON tại `public/data/places.json`. Giai đoạn sau có thể chuyển sang Google Sheets hoặc CMS (Directus, Strapi, Supabase) để cán bộ các Sở tự cập nhật.

```jsonc
{
  "id": "string (slug, duy nhất)",
  "layer": "string (khóa lớp ở mục 6)",
  "name": "string",
  "nameEn": "string | null",
  "coordinates": [106.0, 21.0],          // [kinh độ, vĩ độ]
  "wardCode": "string",                   // tính tự động bằng point-in-polygon khi build
  "summary": "string (1–2 câu: vì sao nên đến)",
  "images": [{ "src": "images/places/<id>.jpg", "thumb": "images/places/<id>-sm.jpg", "alt": "…",
               "credit": "tác giả", "license": "CC BY-SA 4.0", "licenseUrl": "…", "sourceUrl": "…" }],
                                          // đã đổi từ ["string"]: bắt buộc ghi công theo giấy phép
  "links": [{ "label": "string", "url": "string" }],
  "months": [1, 2, 3],                    // các tháng nổi bật (mùa vụ, lễ hội); dùng cho lịch mùa vụ
  "featured": false,
  "isSample": true,
  "mapZoom": 9.5,                         // tùy chọn: zoom khi mở địa điểm dạng vùng rộng
  "icon": "✈️",                           // tùy chọn: emoji riêng thay icon của lớp
  "source": { "osm": "way/123", "osmName": "tên gốc trong OSM" },
  "extra": {
    // Du lịch:  openingHours, ticketInfo, heritageRank (quốc gia / quốc gia đặc biệt / cấp tỉnh)
    // Nông sản: ocopStars, producer, harvestSeason, traceabilityUrl, shopUrl
    // Giáo dục: audience, programs, contact
  }
}
```

`wardCode` được **tính khi build** bằng point-in-polygon (ví dụ dùng `@turf/boolean-point-in-polygon`), không nhập tay.

---

## 8. Kiến trúc kỹ thuật đề xuất

- **Vite + TypeScript + MapLibre GL JS**, xuất ra site tĩnh, triển khai được lên bất kỳ hosting tĩnh nào.
  - MapLibre vẫn chạy khi **không có tile nền**: style chỉ cần một lớp `background` (màu biển) cộng các nguồn GeoJSON.
  - Nếu người dùng muốn giống kiến trúc của trang gốc (Next.js) thì hỏi lại. Mặc định chọn Vite vì đơn giản.
- UI: dùng một thư viện nhẹ (Preact/React, hoặc vanilla TS). Tránh dùng framework UI nặng.
- Luồng điều hướng:
  1. **Màn Tỉnh**: polygon tỉnh, các xã tô màu nhạt, ghim POI được gom cụm (cluster) ở mức zoom thấp.
  2. **Bấm vào xã** → zoom tới bbox của xã, làm nổi bật ranh giới xã, lọc danh sách theo xã. Có nút "← Về toàn tỉnh" và nút recenter.
- Thanh bên (panel trượt từ dưới lên trên mobile): toggle các lớp kèm bộ đếm → bấm tên lớp để mở danh sách → ô tìm kiếm không dấu → bay tới ghim.
- Hỗ trợ URL sâu: `?place=<id>`, `?ward=<code>`, `?layers=a,b`.
- Cấu trúc thư mục dự kiến:
  ```
  /scripts        # tải và xử lý dữ liệu (lấy GeoJSON, gộp xã, trích OSM, gán wardCode)
  /public/data    # province.geojson, wards.geojson, roads.geojson, water.geojson, places.json
  /src/config     # province.ts, layers.ts
  /src/map        # khởi tạo MapLibre, style, các lớp
  /src/ui         # sidebar, card, carousel, search
  ```

---

## 9. Lộ trình

**Phase 0 — Chuẩn bị dữ liệu**
Tải GeoJSON tỉnh `44_quang_tri` và 78 xã (kèm `42_ha_tinh`, `46_hue` làm nền lân cận) → gộp và đơn giản hóa → trích OSM → kiểm tra bằng geojson.io hoặc bằng trang test.

**Phase 1 — MVP**
- Bản đồ tỉnh có ranh giới xã.
- 5–6 lớp, khoảng 100 POI **mẫu** (`isSample: true`).
- Toggle và bộ đếm, danh sách và tìm kiếm không dấu, thẻ địa điểm.
- Lưu địa điểm bằng `localStorage`, URL sâu, carousel nổi bật, ghi nguồn.

**Phase 2**
Lịch mùa vụ/lễ hội (bộ lọc theo `months`), tuyến trải nghiệm theo chủ đề, song ngữ Việt–Anh.

**Phase 3**
- Quản trị nội dung: Google Sheets → build, hoặc dùng CMS.
- Tìm theo tên cũ trước sáp nhập (cần dữ liệu gis.vn).
- Đổ bóng địa hình bằng DEM.
- Mở rộng lên cấp vùng.

---

## 10. Các quyết định (người dùng trả lời ngày 30/09/2026)

1. **Tỉnh:** Quảng Trị (mã 44).
2. **Bộ nhận diện:** chưa có, Claude tự đề xuất. **Đã áp dụng ở Phase 1** (người dùng chưa phản đối, có thể đổi): màu chủ đạo xanh Trường Sơn `#1f5c4a`, màu nhấn đỏ di tích `#b3261e`, nền cát biển, biển `#cfe3ea` (`src/config/theme.ts` và biến CSS trong `src/style.css`); font giao diện Be Vietnam Pro (tự lưu trữ qua `@fontsource`), font nhãn bản đồ Noto Sans; logo là hình ghim bản đồ kèm dải sóng (SVG trong `src/ui/panel.ts`, `public/favicon.svg`); tên hiển thị "Khám phá {tên tỉnh}".
3. **Danh nghĩa:** dự án **cá nhân**, làm bản demo để giới thiệu cho tỉnh; sau này tỉnh sẽ tự duy trì. Chân trang ghi rõ "Dự án cá nhân – bản demo", **không** dùng danh nghĩa, logo hay quốc huy của cơ quan nhà nước. Code và dữ liệu phải dễ bàn giao (tài liệu rõ, cấu hình tập trung).
4. **Nông sản:** tạm thời để trống, chờ danh mục OCOP và chỉ dẫn địa lý chính thức.
5. **Carousel nổi bật:** dùng địa điểm mẫu bất kỳ (`isSample: true`).
6. **Dữ liệu POI thật:** chưa có nguồn, phụ thuộc vào việc phân công quản trị sau này. **Việc cần làm sau:** xác định đơn vị/cán bộ phụ trách từng trụ cột (Du lịch, Nông sản, Giáo dục) và quy trình cập nhật (xem Phase 3).
7. **Hosting và tên miền:** chưa có. Demo triển khai trên GitHub Pages hoặc Vercel, nên cấu hình `base` của Vite phải chỉnh được qua biến môi trường.

---

## 11. Lệnh và quy ước

**Trạng thái:** Phase 0 và Phase 1 (MVP) đã xong (30/09/2026); bổ sung ảnh thật cho 22 địa điểm và ghim ảnh trên bản đồ (01/10/2026). Bước tiếp theo: Phase 2. Stack: Vite 8, TypeScript, MapLibre GL JS 6, UI vanilla TS.

| Lệnh | Việc làm |
|---|---|
| `npm run dev` / `build` / `preview` | Phát triển, build (có `tsc --noEmit`), xem thử bản build |
| `npm run data` | = `data:fetch` + `data:build` |
| `npm run data:fetch` | Tải nguồn vào `.cache/` (gitignore): sparse checkout repo ranh giới, Overpass, Natural Earth, glyph font |
| `npm run data:build` | Xử lý thành `public/data/` rồi tự chạy `data:verify` |
| `npm run data:verify` | Kiểm tra: đủ 78 xã, không mất polygon > 1.000 m², Cồn Cỏ, Hoàng Sa, nhãn "Lào"/"Biển Đông" đặt đúng chỗ |
| `npm run places` | Kiểm tra `content/places.json` → `public/data/places.json` (tự gán `wardCode`, dừng nếu sai quy tắc) |
| `npm run osm:pois` | Tải gợi ý POI từ OSM vào `.cache/osm-pois.geojson` (chỉ để biên tập, không đưa thẳng lên web) |
| `npm run images:find <id>…` | Tìm ảnh ứng viên trên Wikimedia Commons → `.cache/image-candidates.json` (có truy vấn/mã Wikidata chỉ định cho từng điểm trong script) |
| `npm run images` | Tải ảnh theo `content/image-selection.json`, nén bằng `sharp` vào `public/images/places/` (ảnh gốc giữ ở `.cache/images-orig/`), ghi `images` vào `content/places.json`. Chạy `npm run places` sau đó |

**Cấu trúc thư mục thực tế:**

```
content/            places.json (nguồn biên tập), image-selection.json, README.md (hướng dẫn biên tập)
scripts/            fetch-*.mjs (tải nguồn), build-*.mjs (xử lý), verify-data.mjs, find-images.mjs, lib.mjs
public/data/        GeoJSON + places.json đã xử lý, SOURCES.md (nguồn & giấy phép)
public/fonts/       glyph Noto Sans (+ OFL.txt)
public/images/places/  ảnh địa điểm (<id>.jpg 960px, <id>-sm.jpg 480x320)
src/config/         province.data.json + province.ts, layers.data.json + layers.ts, theme.ts
src/data/places.ts  kiểu dữ liệu, tải, chấm điểm tìm kiếm
src/map/            map.ts (khởi tạo, sự kiện), style.ts (nền), places-layer.ts (ghim, cụm), icons.ts (vẽ ghim)
src/ui/             panel.ts (các màn hình), sheet.ts (bottom sheet)
src/state.ts, src/i18n.ts, src/lib/ (text, storage), src/main.ts
tools/review-images.html   trang duyệt ảnh, chỉ dùng khi dev (không vào bản build)
.claude/launch.json        cấu hình server dev (5173) và preview (4173) cho khung trình duyệt
```

**Số liệu hiện tại:** 78 xã/phường/đặc khu; 96 địa điểm mẫu (Địa chỉ đỏ 23, Danh thắng 19, Lưu trú 12, Làng nghề 11, Di tích 9, Giao thông 9, Bảo tàng/thư viện 7, Trường học 6), 11 điểm nổi bật, 22 điểm có ảnh. Các lớp Lễ hội, Ẩm thực, Nông sản (3 lớp), Trải nghiệm STEM hiện trong giao diện nhưng làm mờ với ghi chú "Chờ dữ liệu chính thức". Đã bỏ điểm trùng "Đài tưởng niệm trận Thành cổ" (cách Thành cổ 3 m).

**Quy ước và bài học kỹ thuật:**

- `src/config/province.data.json` là nguồn cấu hình dùng chung cho **cả script Node lẫn app**. `province.ts` bổ sung phần chỉ app dùng (Fast Travel, bbox). Bảng màu nằm ở `src/config/theme.ts`.
- `public/data/`, `public/fonts/` và `public/images/` **sẽ được commit** để deploy không cần chạy pipeline dữ liệu. `.cache/`, `dist/`, `node_modules/` không commit (đã có trong `.gitignore`).
- **Viền tỉnh được dựng bằng dissolve các xã**, không dùng file tỉnh chính thức. File tỉnh chính thức đã lược bỏ các đảo ven bờ (4 đảo ở Phú Trạch, 1 đảo ở Mỹ Thuỷ), và độ chi tiết của nó thấp hơn nhiều so với file xã (3.600 điểm so với 175.000 điểm).
- **`keep-shapes` của mapshaper KHÔNG bảo vệ từng phần của MultiPolygon.** Đảo nhỏ nằm chung feature với đất liền vẫn có thể bị xóa (đã xảy ra với Thanh Hóa). Luôn đơn giản hóa qua `simplifyKeepingIslands()` trong `scripts/lib.mjs` (explode → simplify → dissolve theo mã).
- Vùng ngữ cảnh / `maxBounds` = bbox tỉnh ± `viewPaddingDeg` (2°). Nếu vùng này quá hẹp, MapLibre buộc phải phóng to trên màn hình dọc và làm cắt mất tỉnh. Mọi tỉnh Việt Nam giao với vùng này phải có trong `neighbors`; phần đất còn lại lấy từ Natural Earth, chỉ hình học. Vùng hiện tại kết thúc ở 109,4°E, chưa chạm Hoàng Sa. Nếu mở rộng vùng về phía đông thì Đà Nẵng (đã gồm Hoàng Sa) đã có sẵn, nhưng phải thêm Khánh Hòa nếu vùng chạm tới Trường Sa.
- MapLibre 6: không có default export (`import * as maplibregl`). Worker phải nạp qua `?worker&url` + `setWorkerUrl` (xem `src/map/map.ts`). Nguồn GeoJSON cần URL tuyệt đối (`assetUrl()`).
- Nhãn chữ trên bản đồ dùng glyph Noto Sans tự lưu trữ (dải Unicode tiếng Việt: 0-255, 256-511, 768-1023, 7680-7935, 8192-8447).
- Overpass API yêu cầu header `User-Agent`, và hay trả lỗi 504. Script đã chia nhỏ truy vấn và có cơ chế thử lại.
- Trên mobile, thanh ghi nguồn phải nằm **trên** tấm panel (`--sheet-h` trong `style.css`). Không để panel che ghi nguồn.
- Khi test trong khung trình duyệt của Claude Code: nếu khung đang ẩn, `requestAnimationFrame` bị tạm dừng, nên bản đồ không tải hoặc không chạy xong hiệu ứng bay. Chụp màn hình nhiều lần để ép vẽ khung hình. Đây không phải lỗi của code.
- Deploy: Vercel (`dist`) hoặc GitHub Pages với `BASE_PATH=/<repo>/ npm run build`.

**Phase 1 — kiến trúc giao diện:**

- `src/state.ts`: store với luồng một chiều. Mọi thao tác gọi `store.set()`; bản đồ (`applyToMap` trong `main.ts`), panel và URL chỉ phản ứng theo store. Bản đồ chỉ nhận lệnh (`showWard`, `showPlace`) và phát sự kiện.
- Panel (`src/ui/panel.ts`) không có ngăn xếp điều hướng riêng. Màn hình được suy ra theo thứ tự ưu tiên: thẻ địa điểm > kết quả tìm kiếm > danh sách (lớp/đã lưu/được chia sẻ) > xã > trang chủ. Nút "Quay lại" gỡ lần lượt từng tầng.
- Panel được dựng **trước** bản đồ, để người dùng xem được danh sách khi bản đồ còn đang tải. Khi sẵn sàng, bản đồ nhận toàn bộ trạng thái qua `applyToMap`.
- Bottom sheet (`src/ui/sheet.ts`) có 3 nấc (peek 132 px / 50% / toàn màn hình). Luôn **đặt nấc trước khi di chuyển camera**, vì lề camera (`mapPadding`) tính theo nấc hiện tại. Khi panel mở ≥ nửa màn hình, ghi nguồn thu về nút ⓘ.
- Ghim địa điểm vẽ bằng canvas (`src/map/icons.ts`), vì glyph PBF không có emoji. Gom cụm tới zoom 10.
- **Ghim ảnh:** địa điểm có `images[0]` hiển thị ghim ảnh tròn (46 px, viền trắng, vòng ngoài theo màu lớp); chưa có ảnh thì dùng ghim icon. Ảnh tải nền sau khi bản đồ hiện: lúc đầu hiện ghim icon, ảnh tải xong thì `places-layer.ts` vẽ lại nguồn dữ liệu (gộp các lần cập nhật). Ảnh lỗi thì giữ icon. Thuộc tính `photo` của feature điều khiển cỡ vòng chọn, khoảng cách nhãn và thứ tự vẽ (ghim ảnh nằm trên).
- Tìm kiếm không dấu dùng `fold()` trong `src/lib/text.ts` (NFD + bỏ dấu + đ→d).
- Chuỗi giao diện nằm trong `src/i18n.ts`, chuẩn bị cho song ngữ (Phase 2).
- Liên kết chia sẻ giữ dấu phẩy nguyên dạng (không mã hóa thành `%2C`) để URL ngắn khi in mã QR.
- **Dữ liệu địa điểm mẫu:** tên và tọa độ lấy từ OSM theo mã đối tượng (`source.osm`), mô tả do dự án viết thận trọng (không có số liệu, giá, giờ, xếp hạng di tích chưa chắc chắn). Liên kết Wikipedia chỉ lấy từ thẻ `wikipedia` của OSM và đã kiểm tra đều mở được. Bãi biển Cửa Tùng chưa có trong OSM nên chưa đưa vào.
- Địa điểm dạng vùng rộng dùng `mapZoom` (vườn quốc gia 9.5) thay cho zoom mặc định 13.

- **Ảnh (30/09/2026):** 22 địa điểm có ảnh Wikimedia Commons (CC BY, CC BY-SA hoặc Public domain). Ảnh được chọn bằng cách xem từng ảnh bằng mắt, vì tìm theo tên thường ra ảnh sai (núi ở Iran, chùa ở Vũng Tàu, nghĩa trang ở Bỉ, Cửa Lò lẫn vào Nhật Lệ). Không dùng ảnh tư liệu chiến tranh chụp lính nước ngoài làm ảnh đại diện cho địa chỉ đỏ. Ghi công hiển thị trên ảnh ở thẻ địa điểm và trong mục "Nguồn ảnh". `build-places` báo lỗi nếu ảnh thiếu tác giả, giấy phép hoặc nguồn. Trang duyệt ảnh chỉ dùng khi dev: `/tools/review-images.html`.
- Chưa có ảnh phù hợp trên Commons: Nghĩa trang Đường 9, Nhà tù Lao Bảo, Làng Vây, Dốc Miếu, Hang Tám Cô, Suối Nước Moọc, Cồn Cỏ, Giếng cổ Gio An, Bàu Tró, Vũng Chùa. Những điểm này cần ảnh tự chụp hoặc ảnh do tỉnh cung cấp.

**Việc còn treo:**
- Commit lần đầu: chờ người dùng yêu cầu.
- Link góp ý/báo lỗi: chưa có địa chỉ nhận. Cần hỏi người dùng (email, form hay GitHub Issues), không tự dùng email cá nhân.
- Dữ liệu mẫu (đặc biệt mô tả các Địa chỉ đỏ) cần người dùng hoặc tỉnh xác minh trước khi coi là thật.
- `npm audit` báo lỗ hổng trong chuỗi phụ thuộc của mapshaper/sharp (chỉ là công cụ build chạy trên máy, không có trong bản web). Không chạy `npm audit fix --force` vì sẽ hạ mapshaper xuống phiên bản cũ.
- Dung lượng `wards.geojson` (885 KB, gzip khoảng 250 KB) có thể cần chia tile nếu thấy chậm trên điện thoại.
- Phase 2: lịch mùa vụ/lễ hội (`months`), tuyến trải nghiệm, song ngữ.
