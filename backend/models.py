from pydantic import BaseModel
from typing import Optional, Literal
from datetime import date, datetime
import uuid

TokenStatus = Literal["waiting", "called", "completed", "cancelled"]


class TokenCreate(BaseModel):
    farmer_id: uuid.UUID
    center_id: uuid.UUID


class TokenOut(BaseModel):
    id: uuid.UUID
    farmer_id: uuid.UUID
    center_id: uuid.UUID
    token_number: int
    status: TokenStatus
    created_at: datetime
    updated_at: datetime


class TokenStatusUpdate(BaseModel):
    status: TokenStatus


class CenterOut(BaseModel):
    id: uuid.UUID
    name: str
    location: Optional[str] = None
    crop_type: str
    msp_rate: float
    open_date: Optional[date] = None
    close_date: Optional[date] = None
    is_active: bool
