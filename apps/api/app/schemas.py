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


class FrameConfigCreate(BaseModel):
    name: str
    description: Optional[str] = None
    object_position_x: float = 50.0
    object_position_y: float = 50.0
    scale: float = 1.0
    transform_origin_x: float = 50.0
    transform_origin_y: float = 50.0
    transition_duration: float = 0.8
    transition_easing: str = "cubic-bezier(0.4, 0, 0.2, 1)"
    is_default: bool = False


class FrameConfigUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    object_position_x: Optional[float] = None
    object_position_y: Optional[float] = None
    scale: Optional[float] = None
    transform_origin_x: Optional[float] = None
    transform_origin_y: Optional[float] = None
    transition_duration: Optional[float] = None
    transition_easing: Optional[str] = None
    is_default: Optional[bool] = None


class FrameConfigResponse(BaseModel):
    id: str
    training_section_id: str
    name: str
    description: Optional[str] = None
    object_position_x: float
    object_position_y: float
    scale: float
    transform_origin_x: float
    transform_origin_y: float
    transition_duration: float
    transition_easing: str
    created_at: datetime
    updated_at: datetime
    is_default: bool
    global_config_id: Optional[str]


class GlobalFrameConfigCreate(BaseModel):
    name: str
    description: Optional[str] = None
    object_position_x: float = 50.0
    object_position_y: float = 50.0
    scale: float = 1.0
    transform_origin_x: float = 50.0
    transform_origin_y: float = 50.0
    transition_duration: float = 0.8
    transition_easing: str = "cubic-bezier(0.4, 0, 0.2, 1)"
    is_active: bool = True


class GlobalFrameConfigUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    object_position_x: Optional[float] = None
    object_position_y: Optional[float] = None
    scale: Optional[float] = None
    transform_origin_x: Optional[float] = None
    transform_origin_y: Optional[float] = None
    transition_duration: Optional[float] = None
    transition_easing: Optional[str] = None
    is_active: Optional[bool] = None


class GlobalFrameConfigResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    object_position_x: float
    object_position_y: float
    scale: float
    transform_origin_x: float
    transform_origin_y: float
    transition_duration: float
    transition_easing: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
