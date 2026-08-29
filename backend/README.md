# SIH PS26032 — Procurement Center API (backend, WIP)

Token queue + schedule + MSP price endpoints for the farmer/procurement/admin app.
This covers **schema + token/queue/schedule/price endpoints only**. Admin UI,
auth, and the React frontend are being built by teammates.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env   # fill in SUPABASE_URL and SUPABASE_KEY
```

Run `schema.sql` in the Supabase SQL editor (or via migrations) to create the tables.

```bash
uvicorn main:app --reload
```

Interactive API docs: http://localhost:8000/docs

## Endpoints

| Method | Path                        | Who calls it        | Body / Query                          | Returns |
|--------|-----------------------------|----------------------|----------------------------------------|---------|
| POST   | `/tokens`                   | Farmer (get a token) | `{farmer_id, center_id}`               | Token object (`waiting`, with `token_number`) |
| GET    | `/tokens/{token_id}`        | Farmer (check status)| —                                       | Token object |
| PATCH  | `/tokens/{token_id}/status` | Procurement staff     | `{status}` (`waiting/called/completed/cancelled`) | Updated token object |
| GET    | `/centers`                  | Farmer (browse)      | optional `?crop_type=`                 | List of centers (name, crop_type, msp_rate, open/close dates) |
| GET    | `/centers/{center_id}`      | Farmer / staff        | —                                       | Single center object |
| GET    | `/centers/{center_id}/queue`| Procurement staff     | optional `?status=`                    | List of tokens for that center, ordered by `token_number` |
| GET    | `/health`                   | anyone                | —                                       | `{"status": "ok"}` |

Full request/response schemas are auto-generated at `/docs` — no need to hand-describe fields, just point teammates there.

## Incomplete / temporary — flag before demo day

- **No auth yet.** `farmer_id` / `center_id` are passed directly in request bodies instead of being read from a logged-in session. Once auth is wired up (team lead), these endpoints will likely need to switch to reading identity from a validated token instead of trusting the client.
- **`users` table shape is provisional.** It's a standalone table with a `role` column. If Supabase Auth ends up being used for login, whoever owns auth may prefer a `profiles` table keyed off `auth.users(id)` instead — confirm before building heavily on top of it.
- **`token_number` generation is naive**: counts today's tokens for a center + 1, no locking. Fine for a demo with light concurrent use; would double-assign under real concurrent load.
- **No status-transition validation** on `PATCH /tokens/{id}/status` — staff can technically set any status in any order.
- **CORS is wide open** (`allow_origins=["*"]`) — fine for local dev, should be narrowed if this ever gets deployed somewhere public.
- **No pagination** on `/centers` or `/centers/{id}/queue` — assumes small demo dataset.
