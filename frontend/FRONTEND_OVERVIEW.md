# 📚 DATN Frontend — AI Legal Study Assistant
> Ứng dụng hỗ trợ học luật thông minh: Chat AI với RAG, Flashcard, Quiz, Mind Map, tích hợp backend Spring Boot.
> **Đọc file này đầu tiên trước mọi task.** Không cần đọc lại toàn bộ source code.

---

## 🛠 1. Tech Stack
> ⚠️ Chỉ dùng các thư viện đã có sẵn. KHÔNG cài thêm thư viện mới nếu chưa hỏi.

| Mục | Công nghệ |
|---|---|
| Build tool | **Vite 6** + `@vitejs/plugin-react` |
| Framework | **React 18** (không dùng Next.js) |
| Language | **TypeScript** (strict, KHÔNG dùng `any`) |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`) |
| UI Components | **Radix UI** primitives (accordion, dialog, dropdown, tabs, v.v.) + **MUI v7** (một số chỗ) |
| Icons | **Lucide React** |
| Routing | **React Router v7** (`react-router`, createBrowserRouter) |
| Forms | **React Hook Form v7** |
| Animation | **Motion (Framer Motion v12)** + `tw-animate-css` |
| Charts | **Recharts** |
| Theme | **Light mode only** (dark mode đã bị xóa hoàn toàn) |
| Toasts | **Sonner** |
| Misc | `canvas-confetti`, `embla-carousel-react`, `react-dnd`, `react-resizable-panels`, `cmdk`, `vaul` |
| Path alias | `@` → `./src` |
| Dev server proxy | `/api` → `http://localhost:8080` |

---

## 📂 2. Cấu trúc thư mục

```text
frontend/
├── src/
│   ├── main.tsx              # Entry point, mount <App />
│   ├── styles/               # CSS global
│   └── app/
│       ├── App.tsx           # Root component (Provider wrappers)
│       ├── routes.tsx        # Khai báo toàn bộ routing
│       ├── types.ts          # Tất cả global interfaces/types
│       │
│       ├── api/              # Toàn bộ logic gọi HTTP
│       │   ├── apiClient.ts       # fetchApi() wrapper, MOCK_MODE toggle
│       │   ├── auth.api.ts        # /auth/login, /auth/register, /auth/me, /auth/logout
│       │   ├── chatService.ts     # Notebooks + Messages API
│       │   ├── legalService.ts    # Laws + Topics API
│       │   ├── flashcardService.ts
│       │   ├── quizService.ts
│       │   ├── settingsService.ts
│       │   └── adminService.ts    # Admin APIs (ingestion vào Weaviate, collections)
│       │
│       ├── context/          # React Context (state toàn app)
│       │   ├── AuthContext.tsx    # useAuth() — user, isAuthenticated, isAdmin, login/logout
│       │   └── AppContext.tsx     # useApp() — laws, notebooks, messages, notes, settings, layout
│       │
│       ├── components/       # Components dùng chung
│       │   ├── Layout.tsx         # Main app shell (Sidebar + Content + SourcePanel)
│       │   ├── LeftSidebar.tsx    # Danh sách Notebooks, điều hướng
│       │   ├── ChatPanel.tsx      # Chat UI chính, streaming effect
│       │   ├── SourcePanel.tsx    # Hiển thị Citations từ RAG
│       │   ├── Dashboard.tsx      # Trang thống kê học tập
│       │   ├── FlashcardMode.tsx  # Học bằng flashcard
│       │   ├── QuizMode.tsx       # Thi trắc nghiệm
│       │   ├── MindMapPage.tsx    # Sơ đồ tư duy
│       │   ├── SettingsPage.tsx   # Cài đặt người dùng
│       │   ├── WorkspacePage.tsx  # Trang chính khi vào app
│       │   ├── CommandPalette.tsx # Cmd+K palette
│       │   ├── StudyTimer.tsx     # Bộ đếm thời gian học
│       │   ├── VideoModal.tsx     # Modal xem video
│       │   ├── MarkdownRenderer.tsx
│       │   ├── RouteGuards.tsx    # ProtectedRoute + AdminRoute
│       │   ├── ui/               # Shadcn-style base UI components
│       │   └── figma/            # Components từ Figma export
│       │
│       ├── layouts/          # Layout wrappers theo role
│       │   ├── AuthLayout.tsx     # Wrapper cho trang Login/Signup
│       │   └── AdminLayout.tsx    # Wrapper cho các trang Admin
│       │
│       ├── pages/            # Page components theo nhóm
│       │   ├── Auth/
│       │   │   ├── LoginPage.tsx
│       │   │   └── SignupPage.tsx
│       │   └── Admin/
│       │       ├── AdminDashboard.tsx
│       │       ├── IngestionPage.tsx      # Quản lý ingest văn bản luật từ MongoDB
│       │       └── CollectionRegistryPage.tsx
│       │
│       ├── data/             # Static mock data / seed data
│       └── mocks/            # Mock backend
│           ├── mockDb.ts          # In-memory DB cho mock
│           └── mockHandlers.ts    # Intercept fetchApi khi MOCK_MODE=true
│
├── guidelines/
│   └── Guidelines.md         # Design guidelines (hiện còn là template)
├── index.html
├── vite.config.ts
└── package.json
```

---

## 🗺 3. Routing & Phân quyền

| Route | Component | Bảo vệ |
|---|---|---|
| `/auth/login` | `LoginPage` | Public |
| `/auth/signup` | `SignupPage` | Public |
| `/` | `WorkspacePage` (trong `MainLayout`) | `ProtectedRoute` (đã đăng nhập) |
| `/dashboard` | `Dashboard` | `ProtectedRoute` |
| `/flashcards` | `FlashcardMode` | `ProtectedRoute` |
| `/quiz` | `QuizMode` | `ProtectedRoute` |
| `/mindmap` | `MindMapPage` | `ProtectedRoute` |
| `/settings` | `SettingsPage` | `ProtectedRoute` |
| `/admin` | `AdminDashboard` | `AdminRoute` (role = `ROLE_ADMIN`) |
| `/admin/ingestion` | `IngestionPage` | `AdminRoute` |
| `/admin/collections` | `CollectionRegistryPage` | `AdminRoute` |

---

## ⚙️ 4. State Management

### AuthContext (`src/app/context/AuthContext.tsx`)
- Hook: `useAuth()`
- Tự động gọi `GET /api/v1/auth/me` khi mount để kiểm tra session.
- Phiên đăng nhập dựa trên **Cookie Session** (credentials: 'include'), KHÔNG dùng JWT/localStorage.
- `isAdmin` = `user?.role === 'ROLE_ADMIN'`

### AppContext (`src/app/context/AppContext.tsx`)
- Hook: `useApp()`
- Quản lý: **Notebooks, Messages, Laws, Topics, Notes, Settings, Layout state**
- Streaming AI response: giả lập bằng `setInterval` từ phía FE (khi BE hỗ trợ SSE thì thay).
- `notebookMessages`: `Record<notebookId, Message[]>` — cache messages theo từng notebook.

---

## 🔌 5. API Layer

### Pattern chuẩn (`src/app/api/apiClient.ts`)
```typescript
// Mọi API call đều qua fetchApi<T>()
import { fetchApi } from '../api/apiClient';

const data = await fetchApi<ResponseType>('/endpoint', {
  method: 'POST',
  body: JSON.stringify(payload)
});
```

- Base URL: `/api/v1` (proxy qua Vite → `http://localhost:8080`)
- Auth: Cookie Session (`credentials: 'include'` — đã set sẵn trong apiClient)
- Response format chuẩn từ BE: `{ status, data, error }` — hàm `fetchApi` tự unwrap `result.data`
- **MOCK_MODE**: Đặt `MOCK_MODE = true` trong `apiClient.ts` để chạy offline với mock data

### Các service đã có
| File | Chức năng |
|---|---|
| `auth.api.ts` | login, register, logout, getMe |
| `chatService.ts` | getNotebooks, createNotebook, updateNotebook, deleteNotebook, getMessages, sendMessage, clearChat |
| `legalService.ts` | getLaws, getLegalTopics |
| `adminService.ts` | quản lý ingestion Weaviate, danh sách laws |
| `flashcardService.ts` | getFlashcards |
| `quizService.ts` | getQuizQuestions |
| `settingsService.ts` | getSettings, updateSettings |

### adminService.ts — API types quan trọng

```typescript
// LawInfo — law đã được vector hóa trong Weaviate
export interface LawInfo {
  so_ky_hieu: string;   // "91/2015/QH13"
  ten_day_du: string;   // "Dân sự"
  loai_van_ban: string; // "Bộ luật"
  chunk_count: number;
}

// LawCreateResponse — kết quả import từ MongoDB
export interface LawCreateResponse {
  so_ky_hieu: string;
  ten_day_du: string;
  chunks_stored: number;
  success: boolean;
  error_message?: string;
  status: string;
}

// API methods
adminApi.listLaws()                          // GET /admin/laws
adminApi.createLaw(ten_day_du: string)       // POST /admin/laws {ten_day_du}
adminApi.reloadLaw(so_ky_hieu, ten_day_du)   // POST /admin/laws/{so_ky_hieu}/reload
adminApi.deleteLaw(so_ky_hieu: string)       // DELETE /admin/laws/{so_ky_hieu}
adminApi.checkAiHealth()                     // GET /admin/ai-health
```

> **Thay đổi so với phiên bản cũ:**
> - Không còn `createLaw(files: File[])` — thay bằng `createLaw(ten_day_du: string)`
> - Không còn `addFilesToLaw()` — không còn khái niệm "thêm file vào Law"
> - `deleteLaw(lawUuid)` → `deleteLaw(soKyHieu)` — đổi key định danh

---

## 📐 6. Types chính (`src/app/types.ts`)

```typescript
// Entities cốt lõi của dự án
Law, LawStatus, LegalTopic, Clause, Citation
Message  // { id, role: 'user'|'ai', content, citations?, confidence?, suggestedQuestions?, isStreaming? }
Notebook // { id, title, emoji, color, messageCount, createdAt }
Note, Flashcard, QuizQuestion, UserProgress, AppSettings
UserResponse // { id, email, role }  — từ auth.api.ts
```

> **Lưu ý về Law type:** Trong `adminService.ts`, `LawInfo` interface đã được cập nhật dùng `so_ky_hieu` thay vì `law_uuid`. Không còn các field `description`, `keywords`, `source_files`.

---

## 🎨 7. Design System

- **Theme**: **Light mode cố định**. Dark mode đã bị xóa hoàn toàn (không còn ThemeToggle, không còn `.dark` CSS, không còn `dark:*` Tailwind classes).
- **Styling**: 100% Tailwind CSS v4. Tránh inline style.
- **Phải dùng Tailwind**: Các class như `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-primary` để đảm bảo theme hoạt động.
- **Animation**: Dùng `motion` (Framer Motion) cho transitions phức tạp, `tw-animate-css` cho class-based.
- **Toast**: Dùng `Sonner` (`import { toast } from 'sonner'`).
- **Icons**: Chỉ dùng `lucide-react`.
- **Component pattern**: Arrow function, props có interface rõ ràng. Tách component nhỏ < 200 dòng nếu được.

---

## 🚀 8. Chạy dự án

```bash
# Cài dependencies (dùng npm hoặc pnpm)
npm install

# Chạy dev server (port mặc định của Vite)
npm run dev

# Build production
npm run build
```

> Backend Spring Boot phải chạy ở `http://localhost:8080` để proxy hoạt động.

---

## 📋 9. Trạng thái hiện tại & Việc cần làm
> ⚠️ **Cập nhật phần này trước mỗi lần kết thúc phiên làm việc!**

### ✅ Đã hoàn thành
- Toàn bộ routing (Auth, Main App, Admin) với Route Guards
- AuthContext: đăng nhập/đăng xuất bằng cookie session
- AppContext: quản lý Notebooks, Chat, streaming effect
- UI chính: Layout, LeftSidebar, ChatPanel, SourcePanel
- Các mode học: FlashcardMode, QuizMode, MindMapPage
- Admin pages: AdminDashboard, IngestionPage, CollectionRegistryPage
- Mock system (MOCK_MODE) để dev offline
- **Chat mode selector**: 2 nút "Nhanh" (⚡) và "Tư duy" (🧠) trong ChatPanel
  - `QueryMode` type trong `types.ts`
  - `sendMessage(content, mode?)` trong AppContext + chatService
  - Backend nhận field `mode: 'quick' | 'agent'` trong `ChatRequest`
- **Đã xóa Dark Mode** (2026-05-24): Removed `ThemeToggle.tsx`, `.dark {}` CSS block, `@custom-variant dark`, tất cả `dark:*` Tailwind classes trong ~22 files. App chỉ còn Light mode cố định.
- **Tính năng Tra cứu Văn bản pháp luật**:
  - Thêm `LegalDocumentPage.tsx` (danh sách + tìm kiếm luật) và `LegalDocumentViewer.tsx` (giao diện đọc văn bản có thanh cuộn Mục lục TOC).
  - `MarkdownRenderer.tsx` được tối ưu hóa: render bảng GFM, chèn blank line tự động cho định dạng chuẩn.
- **Refactor IngestionPage (2026-05-29):**
  - Bỏ hoàn toàn drag-and-drop file upload.
  - Thay bằng text input nhập tên văn bản (`ten_day_du`) → click đồng bộ.
  - Hiển thị danh sách luật dạng bảng với `so_ky_hieu`, `ten_day_du`, `loai_van_ban`, `chunk_count`.
  - `adminService.ts` đã được cập nhật types + methods cho ingestion JSON mới.

### 🔧 Đang làm / Cần kiểm tra
- *(Cập nhật tại đây khi có)*

### 📌 Việc cần làm tiếp theo
- *(Cập nhật tại đây khi có)*
