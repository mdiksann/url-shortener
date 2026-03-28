# LinkShort Frontend

A production-ready React frontend for the URL Shortener service. Built with TypeScript, Vite, TailwindCSS, and a minimalist monochrome design.

## Features

- **Clean, minimalist UI** with monochrome design system
- **User authentication** with JWT tokens
- **URL shortening** with custom code support
- **Analytics dashboard** with click tracking
- **API key management** for programmatic access
- **Type-safe** with full TypeScript support
- **Fast builds** with Vite
- **Server state management** with React Query
- **Form validation** with React Hook Form + Zod
- **Toast notifications** with Sonner

## Tech Stack

- **React 18** with TypeScript
- **Vite** - lightning-fast build tool
- **React Router** - client-side routing
- **TanStack Query (React Query)** - server state management
- **Zustand** - client state management
- **React Hook Form** - efficient form handling
- **Zod** - schema validation
- **TailwindCSS** - utility-first styling
- **Axios** - HTTP client with interceptors
- **Sonner** - toast notifications

## Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities (API client, clipboard, etc.)
│   ├── pages/              # Page components
│   ├── stores/             # Zustand state stores
│   ├── types/              # TypeScript types
│   ├── App.tsx             # Main app with routing
│   ├── main.tsx            # Entry point
│   └── index.css            # Global styles with Tailwind
├── public/                 # Static assets
├── index.html              # HTML entry point
├── vite.config.ts          # Vite configuration
├── tailwind.config.js       # Tailwind CSS config
├── tsconfig.json           # TypeScript config
└── package.json            # Dependencies
```

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd frontend
npm install
cp .env.example .env
```

### Environment Variables

```env
# Backend API URL
VITE_API_URL=http://localhost:5000/api/v1
```

### Development

```bash
npm run dev
```

Frontend will be available at `http://localhost:3000` with proxying to backend at `http://localhost:5000`.

### Build

```bash
npm run build
```

Generates optimized production build in `dist/`.

### Preview

```bash
npm run preview
```

Locally preview production build.

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## Architecture

### State Management

**Server State (React Query)**
- URL data, analytics, API keys
- Automatic caching and background refetching
- Optimistic updates

**Client State (Zustand)**
- User authentication (`useAuthStore`)
- Persisted to localStorage

### Authentication Flow

1. User logs in → JWT in response body + refresh token in HttpOnly cookie
2. Access token stored in Zustand store and localStorage
3. Axios interceptors automatically add Bearer token to requests
4. 401 errors trigger automatic refresh token flow
5. Failed refresh redirects to login

### Form Handling

- React Hook Form for efficient form state
- Zod for runtime schema validation
- Resolver integration with `@hookform/resolvers`
- Field-level and form-level error messages

### API Integration

All API calls go through the `apiClient` (Axios instance) in `src/lib/api.ts`:
- Request interceptor adds JWT Bearer token
- Response interceptor handles 401 + token refresh
- CORS configured with credentials

## Key Components

### `Navigation`
Top navigation with auth status and menu links.

### `Button`
Reusable button with variants (primary, secondary, danger) and sizes (sm, md, lg).

### `Input`
Form input with label, error display, and validation styling.

### `ProtectedRoute`
Route guard that redirects unauthenticated users to login.

### `UrlList`
Displays user's shortened URLs with copy, stats, and deactivate actions.

### `ApiKeyList`
Lists user's API keys with creation date, last used, and revoke button.

## Design System

### Colors (Monochrome)
- **Primary**: `slate-900` (text, buttons)
- **Secondary**: `slate-600` (muted text)
- **Background**: `slate-0` (white), `slate-50` (light gray)
- **Borders**: `slate-200`, `slate-300`
- **Accent**: `slate-400` (placeholder)

### Typography
- Font: Inter (system-ui as fallback)
- Sizes: sm (12px), base (14px), lg (18px), xl (20px), etc.
- Weight: Regular (400), Medium (500), Semibold (600), Bold (700)

### Spacing
Based on 4px grid: `px-2`, `py-3`, `gap-4`, etc.

### Borders & Shadows
- Rounded: `rounded-lg` (8px)
- Shadows: `shadow-sm` (subtle)
- Borders: `border-slate-200` (light gray)

## API Endpoints Used

### Auth
- `POST /auth/register` - Create account
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout

### URLs
- `POST /urls` - Shorten URL
- `GET /urls/:code` - Get metadata
- `GET /urls/:code/stats` - Get analytics
- `DELETE /urls/:code` - Deactivate URL

### Account
- `POST /account/api-keys` - Create API key
- `GET /account/api-keys` - List API keys
- `DELETE /account/api-keys/:keyId` - Revoke API key
- `POST /account/api-keys/revoke-all` - Revoke all keys

## Performance Optimizations

- Code splitting with React Router
- Lazy loading with React.lazy
- Query caching with React Query (5m stale time)
- Image optimization
- CSS minification with Tailwind
- Automatic tree-shaking with Vite

## Production Deployment

### Build

```bash
npm run build
```

### Serve

The `dist/` folder contains the static build. Serve with any static host:
- Netlify
- Vercel
- GitHub Pages
- S3 + CloudFront
- Traditional nginx/Apache

### Environment

Update `VITE_API_URL` to point to production backend before building.

## Security Considerations

- ✅ JWT tokens in response body (secure from CSRF)
- ✅ Refresh tokens in HttpOnly cookies (immune to XSS)
- ✅ CORS enabled with credentials
- ✅ Input validation with Zod
- ✅ No sensitive data in localStorage (only non-sensitive user info)
- ✅ Automatic logout on 401

## Contributing

Follow the existing code style and patterns:
- Use TypeScript for all new code
- Props destructure with types
- Use Zustand for client state
- Use React Query for server state
- Handle errors with toast notifications

## License

MIT
