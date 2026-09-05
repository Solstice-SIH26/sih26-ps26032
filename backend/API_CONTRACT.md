# API Contract — SIH PS26032 Backend (v3: pending/approve workflow)

Base URL during dev: `http://localhost:8000`

## Auth

**None implemented yet.** No headers, tokens, or cookies required on any
endpoint below — including admin ones. IDs are passed directly by the
client. JWT verification (Supabase Auth) is planned once login is working
on the auth side.

---

## 1. Token statuses (exact enum)

| Value | Meaning | Set by |
|---|---|---|
| `pending` | Farmer submitted a request, awaiting staff review | `POST /tokens` (default) |
| `waiting` | Staff approved it — has a `token_number` and `time_slot` now | `PATCH /tokens/{id}/approve` |
| `called` | Staff has called this token up | `PATCH /tokens/{id}/status` |
| `completed` | Transaction done | `PATCH /tokens/{id}/status` |
| `rejected` | Staff declined the pending request | `PATCH /tokens/{id}/reject` |
| `cancelled` | Farmer or staff cancelled (only from `pending`/`waiting`) | `PATCH /tokens/{id}/cancel` |

Flow: `pending → waiting → called → completed`, with `pending → rejected`
and `pending`/`waiting` → `cancelled` as off-ramps.

---

## 2. Endpoints

### `POST /tokens`
Farmer submits a procurement request. **Does not join the queue directly** — goes to `pending` for staff review.

**Request body** (all required):
```json
{
  "farmer_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "center_id": "9c858901-8a57-4791-81fe-4c455b099bc9",
  "requested_date": "2026-09-10",
  "crop_type": "Wheat",
  "quantity_kg": 500
}
```
| Field | Type | Required |
|---|---|---|
| `farmer_id` | UUID string | yes |
| `center_id` | UUID string | yes |
| `requested_date` | date string `YYYY-MM-DD` | yes |
| `crop_type` | string | yes |
| `quantity_kg` | number | yes |

**Success response — `200 OK`:**
```json
{
  "id": "a1b2c3d4-...",
  "farmer_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "center_id": "9c858901-8a57-4791-81fe-4c455b099bc9",
  "requested_date": "2026-09-10",
  "crop_type": "Wheat",
  "quantity_kg": 500,
  "token_number": null,
  "time_slot": null,
  "status": "pending",
  "created_at": "2026-08-28T09:15:00.123456+00:00",
  "updated_at": "2026-08-28T09:15:00.123456+00:00"
}
```
`token_number` and `time_slot` are **`null`** until approved — the frontend should handle this, not assume they're always populated.

**Error responses:**
- `400 Bad Request` — one of:
  - `{"detail": "farmer_id or center_id does not exist"}` (bad foreign key)
  - `{"detail": "You already have an active request for 2026-09-10."}` (one-per-day rule)
  - `{"detail": "You already have 3 active requests. Cancel one before submitting a new request."}` (max-3-active rule)
- `422 Unprocessable Entity` — missing/invalid field or wrong type
- `500 Internal Server Error` — `{"detail": "Could not create request"}`

---

### `GET /tokens/{id}`
Farmer checks their request/token status. Same response shape as `POST /tokens` above, reflecting current state (`token_number`/`time_slot` populated once approved).

**Errors:** `404` `{"detail": "Token not found"}`; `422` bad UUID.

---

### `PATCH /tokens/{id}/approve`
Staff approves a pending request. **No request body.**

**Success response — `200 OK`:** full token object with `status: "waiting"`, `token_number` and `time_slot` now populated, e.g.:
```json
{ "...": "...", "status": "waiting", "token_number": 3, "time_slot": "09:50" }
```

**Error responses:**
- `404 Not Found` — `{"detail": "Token not found"}`
- `400 Bad Request`:
  - `{"detail": "Only pending requests can be approved (current status: waiting)."}` — wrong current state
  - `{"detail": "Approving this request (500.0kg) would exceed the center's daily capacity (4800.0kg already approved / 5000.0kg limit for 2026-09-10)."}` — capacity exceeded

---

### `PATCH /tokens/{id}/reject`
Staff rejects a pending request. **No request body.**

**Success — `200 OK`:** token object with `status: "rejected"`.
**Errors:** `404` not found; `400` `{"detail": "Only pending requests can be rejected (current status: ...)."}`

---

### `PATCH /tokens/{id}/cancel`
Farmer or staff cancels. Works from `pending` or `waiting` only. **No request body.**

**Success — `200 OK`:** token object with `status: "cancelled"`.
**Errors:** `404` not found; `400` `{"detail": "Only pending or waiting requests can be cancelled (current status: ...)."}`

---

### `PATCH /tokens/{id}/status`
Staff progresses an **already-approved** token through the physical queue. **Only two transitions are accepted: `waiting→called` and `called→completed`.** Everything else (approve/reject/cancel) must use the dedicated endpoints above.

**Request body:**
```json
{ "status": "called" }
```

**Success — `200 OK`:** updated token object.
**Errors:**
- `404` not found
- `400` `{"detail": "Cannot move token from 'pending' to 'called' via this endpoint. Use /approve, /reject, or /cancel for other transitions."}`

---

### `GET /centers`
Unchanged behavior. Optional `?crop_type=` filter. Response now includes `daily_capacity_kg`:
```json
[
  {
    "id": "9c858901-...",
    "name": "Karnal Mandi Center 3",
    "location": "Karnal, Haryana",
    "crop_type": "Wheat",
    "msp_rate": 2425.00,
    "open_date": "2026-09-01",
    "close_date": "2026-09-15",
    "daily_capacity_kg": 5000,
    "is_active": true
  }
]
```

### `GET /centers/{id}`
Same shape as one item above. `404` if not found.

### `POST /centers` / `PATCH /centers/{id}`
Admin center management — body accepts/returns `daily_capacity_kg` (defaults to `5000` if omitted on create). `PATCH` handles crop-price updates too — send just `{"msp_rate": 2450}`, no separate price endpoint exists.

### `DELETE /centers/{id}`
Admin: permanently delete a center. **No request body.**

**Success — `204 No Content`.**

**Errors:**
- `404 Not Found` — `{"detail": "Center not found"}`
- `400 Bad Request` — `{"detail": "Can't delete a center with existing tokens or assigned staff. Use PATCH with {\"is_active\": false} to deactivate it instead."}`

### `GET /centers/{id}/queue`
Unchanged URL. `?status=` now accepts any of the 6 statuses — e.g. `?status=pending` to see the approval queue, `?status=waiting` to see who's up next. Ordered by `token_number` (approved tokens first, in order), then `created_at` (pending requests, oldest first).

### `GET /users`
Unchanged. `?role=admin|procurement|farmer` optional filter. Response now includes `is_active`.

### `PATCH /users/{id}`
Admin: edit a profile, or deactivate one. **This is how you "remove" a user without breaking their token history** — set `{"is_active": false}` instead of deleting.

**Request body (all optional):**
```json
{ "is_active": false }
```

**Success — `200 OK`:** updated profile.
**Errors:** `400` empty body, or bad `center_id`; `404` not found.

### `DELETE /users/{id}`
Admin: **permanently deletes the person's Supabase Auth account** (not just the profile row) — this removes their ability to log in entirely. Their profile is removed automatically via cascade; any of their existing tokens remain in the database but will reference a `farmer_id` with no profile attached. **No request body.**

**Success — `204 No Content`.**
**Errors:** `404` if the auth user doesn't exist; `500` on other auth API failures.

---

## 3. Capacity check — exact logic

On `PATCH /tokens/{id}/approve`:
1. Sum `quantity_kg` of all tokens for the same `center_id` + `requested_date` that are already in `waiting`, `called`, or `completed` (i.e. already approved — `pending` requests don't count yet).
2. If `sum + this_request.quantity_kg > center.daily_capacity_kg` → `400`, nothing changes.
3. Otherwise → token gets `token_number = (count of already-approved) + 1`, `time_slot` assigned by that same position (see below), status → `waiting`.

Rejecting or cancelling a token removes it from this sum automatically — no separate "freeing" step exists or is needed.

## 4. Time slot assignment — exact logic

Fixed-interval spacing in **approval order**, not a scheduling algorithm:
- First approval for a given center+date → `09:00`
- Second → `09:25`
- Third → `09:50`
- ... i.e. `09:00 + (approval_position - 1) × 25 minutes`

Not configurable per center yet. If your team wants different spacing or center-specific hours, that's a small follow-up change — ask.
