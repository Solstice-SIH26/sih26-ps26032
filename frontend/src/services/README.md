# Frontend Services Layer

## Why native `fetch`?

Team decision: use the browser's built-in `fetch` API instead of Axios to avoid an
extra dependency. The project aims to keep `package.json` lean. `fetch` is available
in all modern browsers and provides everything we need (JSON bodies, headers,
status codes, abort signals).

## Architecture

```
services/
├── api.js               ← Centralized fetch wrapper (base URL, error handling)
├── tokenService.js      ← Token CRUD operations
├── scheduleService.js   ← Procurement center / schedule operations
├── priceService.js      ← Crop MSP rates (derived from centers data)
└── README.md            ← This file
```

### api.js

- Exports `apiFetch(path, options)` — thin wrapper around `fetch()`.
- Reads `VITE_API_BASE_URL` env var; defaults to `http://localhost:8000`.
- Automatically sets `Content-Type: application/json`.
- Throws `ApiError` (also exported) on non-2xx responses, carrying the HTTP status
  and parsed error body when available.
- Handles `204 No Content` gracefully.
- Does NOT send authentication headers (auth not yet implemented).

### tokenService.js

| Function | Endpoint | Method |
|----------|----------|--------|
| `requestToken(farmerId, centerId)` | `POST /tokens` | POST |
| `getToken(tokenId)` | `GET /tokens/{id}` | GET |
| `updateTokenStatus(tokenId, status)` | `PATCH /tokens/{id}/status` | PATCH |

Token response fields: `id`, `farmer_id`, `center_id`, `token_number`, `status`,
`created_at`, `updated_at`.

Valid token statuses: `waiting`, `called`, `completed`, `cancelled`.

### scheduleService.js

| Function | Endpoint | Method |
|----------|----------|--------|
| `getCenters(cropType?)` | `GET /centers?crop_type=...` | GET |
| `getCenter(centerId)` | `GET /centers/{id}` | GET |
| `getCenterQueue(centerId, status?)` | `GET /centers/{id}/queue?status=...` | GET |

Center response fields: `id`, `name`, `location`, `crop_type`, `msp_rate`,
`open_date`, `close_date`, `is_active`.

### priceService.js

| Function | Endpoint | Method |
|----------|----------|--------|
| `getCropPrices()` | `GET /centers` | GET |

**Note:** There is no dedicated `/prices` endpoint on the backend. MSP rates are
embedded in center objects (`crop_type` + `msp_rate` fields). `priceService` calls
the centers API and de-duplicates by crop type to produce a clean price list.

Returns `{ crop, mspRate }` objects.

## Temporary assumptions (auth not yet implemented)

- **No authentication headers** are sent with requests. When the team leader
  integrates auth, `api.js` will need to attach a Bearer token (or similar) to
  outgoing requests.
- **`farmer_id`** is required by `POST /tokens` but there is no login flow yet.
  The farmer dashboard uses a clearly marked demo UUID placeholder
  (`00000000-0000-0000-0000-000000000001`) for this field until authentication
  is available.
- **`center_id`** comes from the actual center list returned by `GET /centers`.
  It is NOT hardcoded.

## Environment variable

Set `VITE_API_BASE_URL` in a `.env` file at the `frontend/` root to point to a
deployed backend:

```
VITE_API_BASE_URL=https://api.example.com
```

If unset, all requests go to `http://localhost:8000`.
