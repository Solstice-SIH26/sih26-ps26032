# API Contract — SIH PS26032 Backend (current state)

This reflects what the backend actually does right now, not a target design.
Base URL during dev: `http://localhost:8000`

## Auth

**None implemented yet.** No headers, no tokens, no cookies required on any
endpoint below. `farmer_id` / `center_id` are passed directly by the client.
This is temporary — see the team notes from the build session. Do not build
header-passing logic for auth yet; there's nothing on the backend to receive it.

---

## 1. Token statuses (exact enum)

Backend enum (`Literal` type, enforced by a Postgres `check` constraint too):

| Value | Meaning |
|---|---|
| `waiting` | Token created, farmer waiting in line |
| `called` | Staff has called this token up |
| `completed` | Transaction done |
| `cancelled` | Token voided (no-show, farmer left, etc.) |

There is **no `processing` status**. Any status string outside these four is
rejected by FastAPI request validation (422) before it reaches the database.

---

## 2. Endpoints

### `POST /tokens`
Farmer requests a token at a center.

**Request body** (all required):
```json
{
  "farmer_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "center_id": "9c858901-8a57-4791-81fe-4c455b099bc9"
}
```
| Field | Type | Required |
|---|---|---|
| `farmer_id` | UUID string | yes |
| `center_id` | UUID string | yes |

**Success response — `200 OK`:**
```json
{
  "id": "a1b2c3d4-...",
  "farmer_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "center_id": "9c858901-8a57-4791-81fe-4c455b099bc9",
  "token_number": 4,
  "status": "waiting",
  "created_at": "2026-08-28T09:15:00.123456+00:00",
  "updated_at": "2026-08-28T09:15:00.123456+00:00"
}
```
`token_number` is server-assigned (count of that center's tokens created
today, + 1) — the client never sends it.

**Error responses:**
- `422 Unprocessable Entity` — missing/invalid `farmer_id` or `center_id` (bad UUID, wrong type). Standard FastAPI shape:
  ```json
  { "detail": [ { "loc": ["body","farmer_id"], "msg": "...", "type": "..." } ] }
  ```
- `500 Internal Server Error` — insert failed: `{"detail": "Could not create token"}`

---

### `GET /tokens/{id}`
Farmer checks their token's current status. `{id}` = token UUID in the URL path.

**Request:** no body, no query params.

**Success response — `200 OK`:** same shape as the `POST /tokens` response above.

**Error responses:**
- `404 Not Found` — `{"detail": "Token not found"}`
- `422` — `{id}` isn't a valid UUID

---

### `PATCH /tokens/{id}/status`
Staff updates a token's status.

**Request body:**
```json
{ "status": "called" }
```
| Field | Type | Required |
|---|---|---|
| `status` | one of `waiting`/`called`/`completed`/`cancelled` | yes |

**Success response — `200 OK`:** full token object, same shape as above, with `status` and `updated_at` reflecting the change.

**Error responses:**
- `404 Not Found` — `{"detail": "Token not found"}`
- `422` — invalid status value (anything outside the 4 above) or bad UUID

**Note:** there is currently no restriction on transition order — you can
technically PATCH a `completed` token back to `waiting`. Nothing enforces
sequence on the backend today.

---

### `GET /centers`
Farmer/staff browse all active centers.

**Query params (all optional):**
| Param | Type | Effect |
|---|---|---|
| `crop_type` | string | filters centers to that crop type (exact match) |

**Success response — `200 OK`:** array of center objects (see field table below).
```json
[
  {
    "id": "9c858901-8a57-4791-81fe-4c455b099bc9",
    "name": "Karnal Mandi Center 3",
    "location": "Karnal, Haryana",
    "crop_type": "Wheat",
    "msp_rate": 2425.00,
    "open_date": "2026-09-01",
    "close_date": "2026-09-15",
    "is_active": true
  }
]
```
Only centers with `is_active = true` are ever returned by this endpoint —
there's no query param to include inactive ones. Empty array (`[]`, still `200`) if none match.

---

### `GET /centers/{id}`
Single center detail. `{id}` = center UUID in the URL path.

**Success response — `200 OK`:** single center object, same shape as one item from `GET /centers` above.

**Error responses:**
- `404 Not Found` — `{"detail": "Center not found"}`
- `422` — bad UUID

---

### `GET /centers/{id}/queue`
Staff view of a center's token queue, ordered by `token_number` ascending.

**Query params (optional):**
| Param | Type | Effect |
|---|---|---|
| `status` | one of `waiting`/`called`/`completed`/`cancelled` | filters queue to only that status |

**Success response — `200 OK`:** array of token objects (same shape as `POST /tokens` response).
```json
[
  { "id": "...", "farmer_id": "...", "center_id": "...", "token_number": 1, "status": "waiting", "created_at": "...", "updated_at": "..." },
  { "id": "...", "farmer_id": "...", "center_id": "...", "token_number": 2, "status": "waiting", "created_at": "...", "updated_at": "..." }
]
```
Empty array (`[]`, still `200`) if the queue is empty.

---

## 3. "Call next" flow

**There is no dedicated `/call-next` endpoint.** The flow is exactly your
option 1:

1. `GET /centers/{id}/queue?status=waiting` — this returns only waiting
   tokens, already sorted by `token_number` ascending. The frontend does
   **not** need to fetch the whole queue and filter client-side — the
   `?status=waiting` param does that server-side.
2. Take the first item in the returned array — that's the next token.
3. `PATCH /tokens/{that_token_id}/status` with `{"status": "called"}`.

**Known gap:** there's no locking between steps 1–3. If staff double-click
"call next" quickly, or two staff members hit it at once, both could read
the same "first waiting" token before either PATCH lands. Not addressed yet
— acceptable for a demo, worth knowing if judges stress-test it.

---

## 4. Center fields — exact reference

| Field | Type | Example | Notes |
|---|---|---|---|
| `id` | UUID string | `"9c858901-..."` | primary key |
| `name` | string | `"Karnal Mandi Center 3"` | |
| `location` | string \| null | `"Karnal, Haryana"` | free text, nullable |
| `crop_type` | string | `"Wheat"` | single crop per center, not a list |
| `msp_rate` | number (float) | `2425.00` | price per unit; unit itself isn't stored — confirm with team what unit MSP is quoted in for display |
| `open_date` | string (`YYYY-MM-DD`) \| null | `"2026-09-01"` | date only, no time-of-day field exists |
| `close_date` | string (`YYYY-MM-DD`) \| null | `"2026-09-15"` | date only |
| `is_active` | boolean | `true` | only `true` centers appear in `GET /centers` |

There is **no separate "current availability" or "open now" boolean** — if
you need "is this center open today," the frontend will need to compare
`open_date`/`close_date` against today's date itself; the backend doesn't
compute or return that.
