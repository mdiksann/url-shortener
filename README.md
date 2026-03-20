# URL Shortener API

A production-ready URL shortening service built with Node.js and Express, featuring user authentication, analytics tracking, and Redis caching.

## Features

- **URL Shortening** — Create custom or auto-generated short URLs
- **Authentication** — JWT-based auth with refresh token rotation
- **Analytics** — Track clicks, referrers, and user agents
- **Caching** — Redis-backed caching with negative cache support
- **Security** — Bcrypt password hashing, timing-safe login, HttpOnly session cookies
- **Database** — PostgreSQL with migrations and connection pooling
- **Rate Limiting** — Request rate limits to prevent abuse
- **Docker** — Docker Compose setup for easy deployment

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express v4
- **Database:** PostgreSQL (pg driver)
- **Cache:** Redis (node-redis v4)
- **Auth:** JWT (jsonwebtoken)
- **Hashing:** bcryptjs
- **ID Generation:** NanoID v3
- **HTTP Parsing:** cookie-parser
- **Dev:** Nodemon

## Quick Start

### Prerequisites
- Node.js (v14+)
- PostgreSQL (v12+)
- Redis (v6+)
- npm

### Installation

1. **Clone and install:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your database, Redis, and JWT credentials
   ```

3. **Run migrations:**
   ```bash
   npm run migrate
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

### Docker Setup

```bash
docker compose up
```

This starts PostgreSQL, Redis, and the API together.

## Configuration

Key environment variables (see `.env.example`):
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `JWT_SECRET` — Secret for signing access tokens
- `REFRESH_TOKEN_SECRET` — Secret for signing refresh tokens
- `JWT_EXPIRY` — Access token TTL (default: 15m)
- `REFRESH_TOKEN_EXPIRY` — Refresh token TTL (default: 7d)
- `NODE_ENV` — `development` or `production`
- `PORT` — Server port (default: 3000)

## API Endpoints

### Authentication (Public)

<table>
<tr>
  <th>Method</th>
  <th>Endpoint</th>
  <th>Description</th>
  <th>Body</th>
</tr>
<tr>
  <td>POST</td>
  <td>/api/v1/auth/register</td>
  <td>Create account</td>
  <td>{email, password}</td>
</tr>
<tr>
  <td>POST</td>
  <td>/api/v1/auth/login</td>
  <td>Login</td>
  <td>{email, password}</td>
</tr>
<tr>
  <td>POST</td>
  <td>/api/v1/auth/refresh</td>
  <td>Rotate refresh token</td>
  <td>—</td>
</tr>
<tr>
  <td>POST</td>
  <td>/api/v1/auth/logout</td>
  <td>Invalidate session</td>
  <td>—</td>
</tr>
</table>

### URL Management

<table>
<tr>
  <th>Method</th>
  <th>Endpoint</th>
  <th>Auth</th>
  <th>Description</th>
</tr>
<tr>
  <td>POST</td>
  <td>/api/v1/urls</td>
  <td>Required</td>
  <td>Create short URL</td>
</tr>
<tr>
  <td>GET</td>
  <td>/:code</td>
  <td>—</td>
  <td>Redirect to full URL</td>
</tr>
<tr>
  <td>GET</td>
  <td>/api/v1/urls/:code</td>
  <td>—</td>
  <td>Get URL metadata</td>
</tr>
<tr>
  <td>DELETE</td>
  <td>/api/v1/urls/:code</td>
  <td>Owner</td>
  <td>Deactivate URL</td>
</tr>
<tr>
  <td>GET</td>
  <td>/api/v1/health</td>
  <td>—</td>
  <td>Health check</td>
</tr>
</table>

### Example Requests

**Create a short URL:**
```bash
curl -X POST http://localhost:3000/api/v1/urls \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"originalUrl":"https://example.com/very/long/path"}'
```

**Redirect (follow automatically):**
```bash
curl -L http://localhost:3000/abc12345
```

**Get metadata:**
```bash
curl http://localhost:3000/api/v1/urls/abc12345
```

## Architecture

The project follows **clean architecture** principles:

```
src/
├── config/          # Configuration (env vars, database, Redis, Swagger)
├── middlewares/     # Express middlewares (auth, error handling)
├── repositories/    # SQL queries (data access layer)
├── services/        # Business logic (URL, auth, cache)
├── controllers/     # HTTP handlers (thin adapters)
├── routes/          # Route definitions
├── utils/           # Helpers (errors, validation)
└── app.js          # Express app setup
```

### Key Principles

- **SQL isolation:** All database queries live in `src/repositories/`
- **Business logic:** All application logic lives in `src/services/`
- **Thin controllers:** Controllers only handle HTTP concerns
- **Middleware ordering:** Auth routes first, then URLs, then catch-all `/:code` last

## Security

- **Password hashing:** bcryptjs with automatic salting
- **JWT tokens:** Short-lived access tokens (15m) + HttpOnly refresh cookies
- **Timing-safe login:** bcrypt.compare runs even when email not found
- **Token rotation:** Refresh tokens invalidated after use
- **HTTPS-ready:** HttpOnly, Secure cookie flags
- **Rate limiting:** Per-endpoint limits to prevent abuse
- **Ownership validation:** Users can only modify their own URLs

## Database Schema

### urls
```sql
CREATE TABLE urls (
  id SERIAL PRIMARY KEY,
  short_code VARCHAR(10) UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  click_count INTEGER DEFAULT 0
);
```

### users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### refresh_tokens
```sql
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);
```

## Development

### Run tests
```bash
npm test
```

### Code style
```bash
npm run lint
```

### Database migrations
```bash
# Run pending migrations
npm run migrate

# View migration status
npm run migrate:status
```

## Performance Notes

- **Short code format:** 8 characters from a 54-char alphabet = ~720 billion combinations
- **Caching strategy:** URL mappings cached in Redis (TTL configurable)
- **Negative caching:** Missing URLs cached with NULL sentinel to reduce DB load
- **Redirect strategy:** 302 (temporary) redirects to preserve analytics accuracy
- **Rate limits:**
  - POST /urls: 10 requests/minute per IP
  - GET /:code: 60 requests/minute per IP

## Troubleshooting

**Connection refused errors?**
- Check PostgreSQL is running (`psql -U postgres`)
- Check Redis is running (`redis-cli ping`)
- Verify connection strings in `.env`

**Port already in use?**
- Change PORT in `.env`
- Or find and kill the process: `lsof -i :3000`

**Migration errors?**
- Ensure database exists: `createdb url_shortener`
- Check migration files in `migrations/` directory

## License

MIT

## Support

For issues or questions, check:
- Database logs: Check PostgreSQL error logs
- Application logs: Check console output from `npm run dev`
- Redis logs: Check Redis connection with `redis-cli`
