-- SIH PS26032 — Procurement Center System
-- Schema for Supabase (Postgres)
-- Run this in the Supabase SQL editor, or via `supabase db push` if using migrations.

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- =========================================================
-- PROCUREMENT CENTERS
-- One row per physical procurement center.
-- =========================================================
create table if not exists procurement_centers (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    location    text,
    crop_type   text not null,          -- e.g. 'Wheat', 'Paddy'
    msp_rate    numeric(10,2) not null, -- MSP price per quintal (or whatever unit you standardize on)
    open_date   date,                   -- next/current procurement window start
    close_date  date,                   -- procurement window end
    is_active   boolean not null default true,
    created_at  timestamptz not null default now()
);

-- =========================================================
-- USERS
-- NOTE: this assumes a standalone `users` table with a `role` column.
-- If Supabase Auth ends up being used for login, the auth/admin owner
-- on the team may prefer this to instead be a `profiles` table keyed
-- off `auth.users(id)`. CONFIRM the exact shape with whoever wires up
-- auth before the team builds heavily against this table.
-- =========================================================
create table if not exists users (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    phone       text unique,
    role        text not null check (role in ('admin', 'procurement', 'farmer')),
    center_id   uuid references procurement_centers(id), -- set only when role = 'procurement'
    created_at  timestamptz not null default now()
);

-- =========================================================
-- TOKENS
-- One row per farmer's queue token at a center.
-- =========================================================
create table if not exists tokens (
    id           uuid primary key default gen_random_uuid(),
    farmer_id    uuid not null references users(id),
    center_id    uuid not null references procurement_centers(id),
    token_number int not null,   -- sequential per center, resets daily (see note in routers/tokens.py)
    status       text not null default 'waiting'
                 check (status in ('waiting', 'called', 'completed', 'cancelled')),
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

create index if not exists idx_tokens_center_created on tokens (center_id, created_at);
create index if not exists idx_tokens_center_status on tokens (center_id, status);
