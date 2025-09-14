# Place for API request/response schemas separate from SQLModel if needed.

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CompanyCreate(BaseModel):
    name: str
    business_topic: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    business_topic: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None


class CompanyResponse(BaseModel):
    id: str
    name: str
    business_topic: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    is_system: bool
    created_at: datetime
    updated_at: datetime


class StyleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    style_json: str
    company_id: Optional[str] = None


class StyleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    style_json: Optional[str] = None
    company_id: Optional[str] = None


class StyleResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    style_json: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    is_default: bool
    company_id: Optional[str] = None


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
    organization_id: Optional[str] = None


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
    organization_id: Optional[str] = None


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
    organization_id: Optional[str] = None


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
    organization_id: Optional[str] = None


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
    organization_id: Optional[str] = None


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
    organization_id: Optional[str] = None


class TrainingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    flow_id: Optional[str] = None
    ai_flow: Optional[str] = None
    organization_id: Optional[str] = None


class TrainingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    flow_id: Optional[str] = None
    ai_flow: Optional[str] = None
    organization_id: Optional[str] = None


class TrainingResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    flow_id: Optional[str] = None
    ai_flow: Optional[str] = None
    organization_id: Optional[str] = None


class AssetCreate(BaseModel):
    title: str
    kind: str
    uri: str
    description: Optional[str] = None
    html_content: Optional[str] = None
    organization_id: Optional[str] = None


class AssetUpdate(BaseModel):
    title: Optional[str] = None
    kind: Optional[str] = None
    uri: Optional[str] = None
    description: Optional[str] = None
    html_content: Optional[str] = None
    organization_id: Optional[str] = None


class AssetResponse(BaseModel):
    id: str
    title: str
    kind: str
    uri: str
    description: Optional[str] = None
    html_content: Optional[str] = None
    organization_id: Optional[str] = None


class FlowCreate(BaseModel):
    title: str
    graph_json: str = "{}"
    organization_id: Optional[str] = None


class FlowUpdate(BaseModel):
    title: Optional[str] = None
    graph_json: Optional[str] = None
    organization_id: Optional[str] = None


class FlowResponse(BaseModel):
    id: str
    title: str
    graph_json: str
    organization_id: Optional[str] = None


class AvatarCreate(BaseModel):
    name: str
    personality: str
    elevenlabs_voice_id: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_default: bool = False
    company_id: Optional[str] = None


class AvatarUpdate(BaseModel):
    name: Optional[str] = None
    personality: Optional[str] = None
    elevenlabs_voice_id: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_default: Optional[bool] = None
    company_id: Optional[str] = None


class AvatarResponse(BaseModel):
    id: str
    name: str
    personality: str
    elevenlabs_voice_id: str
    description: Optional[str] = None
    is_default: bool
    company_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime