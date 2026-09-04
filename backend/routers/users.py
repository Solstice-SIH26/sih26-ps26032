from fastapi import APIRouter, Query
from typing import Optional, List

from models import ProfileOut, Role
from db import supabase

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=List[ProfileOut])
def list_users(role: Optional[Role] = Query(None)):
    """
    Admin: list profiles, optionally filtered by role
    (?role=admin|procurement|farmer).

    TEMPORARY: no auth check yet — same caveat as the center admin
    endpoints. This reads the `profiles` table, not Supabase's internal
    `auth.users` — it only returns the app-specific fields (name, phone,
    role, center_id), not login/identity data.
    """
    query = supabase.table("profiles").select("*")
    if role:
        query = query.eq("role", role)
    res = query.execute()
    return res.data
