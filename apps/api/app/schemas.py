# Place for API request/response schemas separate from SQLModel if needed.

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class StyleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    style_json: str


class StyleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    style_json: Optional[str] = None


class StyleResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    style_json: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    is_default: bool
