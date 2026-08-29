from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import uuid

from models import TokenCreate, TokenOut, TokenStatusUpdate
from db import supabase

router = APIRouter(prefix="/tokens", tags=["tokens"])


@router.post("", response_model=TokenOut)
def create_token(payload: TokenCreate):
    """
    Farmer requests a token at a center.

    TEMPORARY: no auth yet, so farmer_id is passed directly in the request body
    instead of being read from a logged-in session/JWT. Once auth is wired up,
    this will likely change to read farmer_id from the authenticated user instead
    of trusting the client — flag this to whoever owns auth integration.

    token_number is naive: count of tokens already created today for this
    center, + 1. Good enough for a demo; not safe under concurrent requests
    (no locking), and "today" is server UTC date, not center-local date.
    """
    today = datetime.now(timezone.utc).date().isoformat()
    existing = (
        supabase.table("tokens")
        .select("id", count="exact")
        .eq("center_id", str(payload.center_id))
        .gte("created_at", today)
        .execute()
    )
    token_number = (existing.count or 0) + 1

    row = {
        "farmer_id": str(payload.farmer_id),
        "center_id": str(payload.center_id),
        "token_number": token_number,
        "status": "waiting",
    }
    res = supabase.table("tokens").insert(row).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Could not create token")
    return res.data[0]


@router.get("/{token_id}", response_model=TokenOut)
def get_token(token_id: uuid.UUID):
    """Farmer checks the current status of their token."""
    res = supabase.table("tokens").select("*").eq("id", str(token_id)).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Token not found")
    return res.data


@router.patch("/{token_id}/status", response_model=TokenOut)
def update_token_status(token_id: uuid.UUID, payload: TokenStatusUpdate):
    """
    Procurement staff update a token's status (waiting -> called -> completed,
    or -> cancelled). No validation yet on legal transitions (e.g. blocking
    completed -> waiting) — kept permissive for the demo.
    """
    res = (
        supabase.table("tokens")
        .update({
            "status": payload.status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", str(token_id))
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Token not found")
    return res.data[0]
