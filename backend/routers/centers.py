from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
import uuid

from models import CenterOut, TokenOut
from db import supabase

router = APIRouter(prefix="/centers", tags=["centers"])


@router.get("", response_model=List[CenterOut])
def list_centers(crop_type: Optional[str] = None):
    """
    Farmer-facing: browse all active centers, with their crop_type, msp_rate,
    and open/close schedule all in one response (no separate /schedule or
    /price endpoint — kept as one call since the fields all live on the same
    row). Optional ?crop_type= filter.
    """
    query = supabase.table("procurement_centers").select("*").eq("is_active", True)
    if crop_type:
        query = query.eq("crop_type", crop_type)
    res = query.execute()
    return res.data


@router.get("/{center_id}", response_model=CenterOut)
def get_center(center_id: uuid.UUID):
    """Single center detail — same shape as list_centers items."""
    res = (
        supabase.table("procurement_centers")
        .select("*")
        .eq("id", str(center_id))
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Center not found")
    return res.data


@router.get("/{center_id}/queue", response_model=List[TokenOut])
def get_queue(center_id: uuid.UUID, status: Optional[str] = Query(None)):
    """
    Staff-facing: the live queue for a center, ordered by token_number.
    Optional ?status=waiting|called|completed|cancelled to filter.
    """
    query = supabase.table("tokens").select("*").eq("center_id", str(center_id))
    if status:
        query = query.eq("status", status)
    query = query.order("token_number", desc=False)
    res = query.execute()
    return res.data
