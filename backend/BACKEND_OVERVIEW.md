# ⚙️ DATN Backend — Spring Boot REST API
> Cung cấp REST API cho ứng dụng học luật AI. Xác thực bằng Cookie Session, lưu trữ MongoDB, tích hợp AI Server (FastAPI) qua WebClient.
> **Đọc file này đầu tiên trước mọi task.** Không cần đọc lại toàn bộ source code.

---

## 🛠 1. Tech Stack

| Mục | Công nghệ |
|---|---|
| Framework | **Spring Boot 4.0.5** |
| Language | **Java 17** |
| Build tool | **Maven** (`mvnw`) |
| Database | **MongoDB** (Spring Data MongoDB, `legal_assistant_db`) |
| Security | **Spring Security** — Custom Cookie Session (STATELESS, không dùng JWT) |
| HTTP Client | **Spring WebFlux / WebClient** (giao tiếp với AI Server) |
| Validation | **Spring Validation** (`@Valid`, Bean Validation) |
| Boilerplate | **Lombok** (`@Data`, `@Builder`, `@RequiredArgsConstructor`) |
| Server port | **8080** |

---

## 📂 2. Cấu trúc thư mục

```text
backend/
├── pom.xml
└── src/main/
    ├── resources/
    │   └── application.properties     # Cấu hình server, MongoDB, cookie, AI Server
    └── java/com/example/backend/
        ├── BackendApplication.java    # Entry point
        ├── config/
        │   ├── SecurityConfig.java    # CORS, filter chain, role-based authorization
        │   └── WebClientConfig.java   # WebClient bean cho gọi AI Server
        ├── controller/               # REST Controllers (tầng vào duy nhất)
        │   ├── AuthController.java        # /api/v1/auth/**
        │   ├── ConversationController.java    # /api/v1/conversations/**
        │   ├── ChatController.java        # /api/v1/chat
        │   ├── AdminController.java       # /api/v1/admin/** (ROLE_ADMIN)
        │   ├── LegalDataController.java   # /api/v1/legal/**
        │   ├── SearchController.java      # /api/v1/search/**
        │   ├── SettingsController.java    # /api/v1/settings/**
        │   └── UserController.java        # /api/v1/users/**
        ├── service/                  # Business logic interfaces + impls
        │   ├── AiServerClient.java        # Gọi FastAPI (WebClient) — class quan trọng nhất
        │   ├── AuthService.java / impl/AuthServiceImpl.java
        │   ├── ChatService.java / impl/ChatServiceImpl.java
        │   ├── ConversationService.java / impl/ConversationServiceImpl.java
        │   ├── LegalDataService.java / impl/LegalDataServiceImpl.java
        │   └── UserService.java / impl/UserServiceImpl.java
        ├── entity/                   # MongoDB Documents
        │   ├── User.java              # users collection (có embedded Progress + Settings)
        │   ├── UserAuthSession.java   # user_auth_sessions (cookie session store)
        │   ├── Conversation.java          # conversations collection
        │   ├── Message.java           # messages collection

        ├── repository/               # Spring Data MongoDB Repositories
        │   ├── UserRepository.java, UserAuthSessionRepository.java
        │   └── ConversationRepository.java, MessageRepository.java
        ├── dto/
        │   ├── request/              # LoginRequest, RegisterRequest, ChatRequest, ConversationRequest...
        │   ├── response/             # ApiResponse<T>, UserResponse, SearchResponse
        │   └── ai/                   # DTOs cho trao đổi với AI Server
        │       ├── LawInfo.java           # { so_ky_hieu, ten_day_du, loai_van_ban, chunk_count }
        │       ├── LawCreateResponse.java # IngestionResultDto: { so_ky_hieu, ten_day_du, chunks_stored }
        │       ├── DeleteLawResponse.java # { so_ky_hieu, chunks_deleted, law_deleted, status }
        │       ├── RAGQueryRequest.java
        │       ├── RAGResponse.java
        │       ├── AgentQueryRequest.java
        │       └── AgentQueryResponse.java
        ├── security/
        │   ├── CookieAuthenticationFilter.java  # Filter chính xác thực mỗi request
        │   ├── CustomUserDetails.java            # Adapter User → UserDetails
        │   └── CustomUserDetailsService.java
        ├── mapper/                   # Entity ↔ DTO conversion (UserMapper...)
        ├── exception/
        │   ├── GlobalExceptionHandler.java       # @ControllerAdvice xử lý toàn bộ lỗi
        │   ├── ResourceNotFoundException.java
        │   └── UnauthorizedException.java
        └── util/
            └── CookieUtils.java      # Tạo/đọc/xóa cookie SESSION_ID
```

---

## 🗺 3. API Endpoints

| Controller | Route prefix | Auth yêu cầu |
|---|---|---|
| `AuthController` | `/api/v1/auth/**` | **Public** |
| `AdminController` | `/api/v1/admin/**` | `ROLE_ADMIN` |
| `ConversationController` | `/api/v1/conversations/**` | Authenticated |
| `ChatController` | `/api/v1/chat` | Authenticated |
| `LegalDataController` | `/api/v1/legal/**` | Authenticated |
| `SearchController` | `/api/v1/search/**` | Authenticated |
| `SettingsController` | `/api/v1/settings/**` | Authenticated |
| `UserController` | `/api/v1/users/**` | Authenticated |

### Auth endpoints chi tiết
```
POST /api/v1/auth/register    — Đăng ký tài khoản mới
POST /api/v1/auth/login       — Đăng nhập, set cookie SESSION_ID
POST /api/v1/auth/logout      — Xóa session + cookie
GET  /api/v1/auth/me          — Lấy thông tin user hiện tại
```

### Conversation + Chat
```
GET    /api/v1/conversations               — Lấy danh sách conversation của user
POST   /api/v1/conversations               — Tạo conversation mới
PUT    /api/v1/conversations/{id}          — Cập nhật conversation
DELETE /api/v1/conversations/{id}          — Xóa conversation
GET    /api/v1/conversations/{id}/messages — Lấy lịch sử chat
DELETE /api/v1/conversations/{id}/messages — Xóa lịch sử chat
GET    /api/v1/conversations/{id}/suggestions — Lấy gợi ý câu hỏi
POST   /api/v1/chat                    — Gửi tin nhắn (gọi AI Server)
```

### Admin (ROLE_ADMIN) — Quản lý ingestion Weaviate
```
GET    /api/v1/admin/laws                      — Liệt kê tất cả LegalChunk laws (distinct)
POST   /api/v1/admin/laws                      — Ingest luật từ MongoDB (JSON body: {ten_day_du})
POST   /api/v1/admin/laws/reload?soKyHieu=...  — Re-ingest lại bộ luật (xóa cũ + ingest lại)
DELETE /api/v1/admin/laws?soKyHieu=...         — Xóa toàn bộ LegalChunk của bộ luật đó
GET    /api/v1/admin/ai-health                 — Kiểm tra trạng thái AI Server
```

> **Thay đổi so với phiên bản cũ:**
> - `POST /laws` không còn upload multipart PDF — nhận JSON `{ten_day_du}` và AI Server tự lookup MongoDB
> - Không còn `POST /laws/{uuid}/files` (thêm file)
> - Không còn `DELETE /documents` (xóa chunk riêng lẻ)
> - Tham số đổi từ `uuid` sang `so_ky_hieu` (VD: `"91/2015/QH13"`)

---

## 🔐 4. Cơ chế Xác thực (Cookie Session)

> **KHÔNG dùng JWT.** Hệ thống dùng **Cookie Session tự quản lý** lưu trong MongoDB.

**Luồng đăng nhập:**
1. `POST /auth/login` → Tạo `UserAuthSession` trong MongoDB, set cookie `SESSION_ID` (HttpOnly, 7 ngày).
2. Mỗi request → `CookieAuthenticationFilter` đọc cookie, tìm session trong MongoDB, nếu hợp lệ → inject `CustomUserDetails` vào `SecurityContext`.
3. `POST /auth/logout` → Xóa session trong MongoDB + clear cookie.

**Lấy user trong controller:**
```java
@AuthenticationPrincipal CustomUserDetails userDetails
// userDetails.getId()    → userId (MongoDB _id)
// userDetails.getUser()  → User entity đầy đủ
```

---

## 🤖 5. Tích hợp AI Server (`AiServerClient.java`)

> `AiServerClient` là class trung tâm kết nối tới **FastAPI AI Server** tại `http://localhost:8000`.

- Dùng **Spring WebFlux WebClient** (không phải RestTemplate).
- Timeout: 30s cho request thường, 300s cho Multi-Agent queries.
- **Weaviate là nguồn sự thật** cho Law data — không lưu Law riêng trong MongoDB.

### Các method chính

| Method | Endpoint AI Server | Mô tả |
|--------|-------------------|-------|
| `query(RAGQueryRequest)` | `POST /api/v1/query/` | Standard RAG query |
| `queryStream(RAGQueryRequest)` | `POST /api/v1/query/stream` | SSE streaming |
| `agentQuery(AgentQueryRequest)` | `POST /api/v1/query/agent/` | Multi-Agent RAG |
| `listLaws()` | `GET /api/v1/ingestion/laws` | Lấy danh sách luật |
| `ingestFromMongodb(String tenDayDu)` | `POST /api/v1/ingestion/laws` | Import từ MongoDB |
| `deleteLaw(String soKyHieu)` | `DELETE /api/v1/ingestion/laws/{so_ky_hieu}` | Xóa bộ luật |
| `isHealthy()` | `GET /health` | Health check |

> **Đã xóa:** `createLaw(List<MultipartFile>)`, `addFilesToLaw()`, `deleteDocument()` — không còn upload PDF.

### DTOs quan trọng (`dto/ai/`)

```java
// LawInfo — response từ GET /laws
{
  "so_ky_hieu": "91/2015/QH13",
  "ten_day_du": "Dân sự",
  "loai_van_ban": "Bộ luật",
  "chunk_count": 412
}

// LawCreateResponse — response từ POST /laws (IngestionResultDto)
{
  "so_ky_hieu": "91/2015/QH13",
  "ten_day_du": "Dân sự",
  "chunks_stored": 412,
  "success": true,
  "error_message": null,
  "status": "ingested"
}
```

---

## 📐 6. Patterns & Quy tắc code

- **Response format chuẩn:** Mọi controller trả về `ApiResponse<T>`:
  ```java
  return ApiResponse.success(data);  // { status: "success", data: ... }
  return ApiResponse.error("msg", 401); // { status: "error", error: { message, code } }
  ```
- **Service pattern:** Interface + Impl riêng biệt (VD: `AuthService` / `AuthServiceImpl`).
- **Lombok bắt buộc:** Dùng `@Data`, `@Builder`, `@RequiredArgsConstructor` trên mọi class.
- **MongoDB Entity:** Dùng `@Document(collection = "...")`, `@Id` cho `String id`.
- **Validation:** Dùng `@Valid` trên `@RequestBody` + annotation trên DTO field.
- **Exception:** Throw `ResourceNotFoundException` hoặc `UnauthorizedException` — `GlobalExceptionHandler` tự bắt và format response.

---

## ⚙️ 7. Cấu hình quan trọng (`application.properties`)

```properties
server.port=8080
spring.data.mongodb.uri=mongodb://localhost:27017/legal_assistant_db
auth.cookie.name=SESSION_ID
auth.cookie.max-age=604800          # 7 ngày
ai-server.base-url=http://localhost:8000
ai-server.timeout=30000
ai-server.stream-timeout=120000
```

> **Đã xóa:** `spring.servlet.multipart.max-file-size` — không còn upload file.

---

## 🚀 8. Chạy dự án

```bash
# Chạy backend (cần MongoDB đang chạy ở localhost:27017)
./mvnw spring-boot:run

# Hoặc build jar rồi chạy
./mvnw clean package -DskipTests
java -jar target/backend-0.0.1-SNAPSHOT.jar
```

> **Phụ thuộc khi chạy:** MongoDB (`localhost:27017`) + AI Server FastAPI (`localhost:8000`).

---

## 📋 9. Trạng thái hiện tại & Việc cần làm
> ⚠️ **Cập nhật phần này trước mỗi lần kết thúc phiên làm việc!**

### ✅ Đã hoàn thành
- **Refactor (2026-05-31):** Đổi tên toàn bộ `Notebook` thành `Conversation` (ở các entity, controller, repository, services, và MongoDB collection).
- Toàn bộ tầng Security: Cookie Session, CookieAuthFilter, Role-based access
- Auth: register, login, logout, getMe
- Conversation CRUD + Messages + Suggestions
- Chat endpoint (tích hợp AiServerClient)
- **Chat mode routing**: `ChatRequest.mode` ('quick'/'agent') → `ChatServiceImpl` gọi đúng pipeline
  - `quick` → `AiServerClient.query()` (POST `/api/v1/query/`)
  - `agent` → `AiServerClient.agentQuery()` (POST `/api/v1/query/agent`)
- **Legal Document API Pipeline**:
  - Tích hợp 2 collections MongoDB mới: `legal_documents` (metadata) và `legal_articles` (điều khoản).
  - API list, search, và get detail (`LegalDataController`, `/api/v1/legal/documents`).
  - Hỗ trợ cung cấp cấu trúc path (`phan`, `chuong`, `muc`, `tieuMuc`) chi tiết cho từng Điều luật để phục vụ frontend xây dựng cây phân cấp Mục lục.
- **Refactor Ingestion (2026-05-29 & 05-30):**
  - `AdminController` — đổi từ multipart PDF upload sang nhận JSON `{ten_day_du}`
  - `AiServerClient` — `ingestFromMongodb(String tenDayDu)` thay thế `createLaw(MultipartFile)`
  - DTOs mới: `LawInfo` (so_ky_hieu, ten_day_du, loai_van_ban), `LawCreateResponse` (IngestionResultDto)
  - Endpoint `reloadLaw` và `deleteLaw` đổi sang dùng `@RequestParam String soKyHieu` thay cho `@PathVariable` để sửa lỗi parse URL khi ID chứa `/`.
- **Dọn dẹp hệ thống (2026-05-30):**
  - Xóa bỏ hoàn toàn các entity dư thừa (`Law`, `Clause`, `LegalTopic`) và API liên quan (`/api/v1/laws`, `/api/v1/clauses`, `/api/v1/topics`) không còn được sử dụng ở RAG pipeline mới.
  - Xóa bỏ `ProgressController` và các trường theo dõi tiến độ học (`lawsLearned`, `User.Progress`) không cần thiết.

### 🔧 Đang làm / Cần kiểm tra
- *(Cập nhật tại đây khi có)*

### 📌 Việc cần làm tiếp theo
- *(Cập nhật tại đây khi có)*
