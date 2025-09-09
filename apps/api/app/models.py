from __future__ import annotations
from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field
import uuid


def gen_uuid() -> str:
    return str(uuid.uuid4())


auto_now = datetime.utcnow


class Company(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    name: str
    business_topic: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    is_system: bool = Field(default=False, description="Whether this is the system company for SuperAdmins")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class User(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    email: str = Field(index=True, unique=True)
    username: Optional[str] = None
    full_name: Optional[str] = None
    company_id: Optional[str] = Field(default=None, foreign_key="company.id")
    role: str = Field(default="User", description="SuperAdmin|Admin|User")
    department: Optional[str] = None
    password: Optional[str] = None
    gpt_prefs: Optional[str] = None
    # is_active: bool = Field(default=True)  # Temporarily disabled due to DB schema mismatch
    # created_at: datetime = Field(default_factory=datetime.utcnow)  # Temporarily disabled due to DB schema mismatch
    # updated_at: datetime = Field(default_factory=datetime.utcnow)  # Temporarily disabled due to DB schema mismatch


class Asset(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    title: str
    kind: str = Field(description="video|audio|image|doc")
    uri: str = Field(description="Object storage url or key (e.g. minio)")
    description: Optional[str] = None
    html_content: Optional[str] = None
    company_id: Optional[str] = Field(default=None, foreign_key="company.id")
    
    # Audio-specific fields for dubbing/translation
    language: Optional[str] = Field(default=None, description="Language code for audio assets")
    original_asset_id: Optional[str] = Field(default=None, foreign_key="asset.id", description="Reference to original video asset for audio dubbing")


class Flow(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    title: str
    graph_json: str = Field(default="{}")
    company_id: Optional[str] = Field(default=None, foreign_key="company.id")


class Training(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    title: str
    description: Optional[str] = None
    flow_id: Optional[str] = Field(default=None, foreign_key="flow.id")
    ai_flow: Optional[str] = Field(default=None, description="JSON string for AI flow configuration")
    company_id: Optional[str] = Field(default=None, foreign_key="company.id")


class TrainingSection(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    training_id: str = Field(foreign_key="training.id")
    title: str
    description: Optional[str] = None
    script: Optional[str] = None
    duration: Optional[int] = Field(default=None, description="duration in seconds")
    video_object: Optional[str] = Field(default=None, description="MinIO object key or full video URL for this section")
    asset_id: Optional[str] = Field(default=None, foreign_key="asset.id")
    order_index: int = Field(default=0, description="order of sections within training")
    
    # New fields for language and target audience
    language: Optional[str] = Field(default="TR", description="Language code: TR, EN, DE, FR, ES, etc.")
    target_audience: Optional[str] = Field(default="Genel", description="Target audience category based on education science")
    audio_asset_id: Optional[str] = Field(default=None, foreign_key="asset.id", description="Audio asset for dubbing/translation")


class CompanyTraining(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    company_id: str = Field(foreign_key="company.id")
    training_id: str = Field(foreign_key="training.id")
    expectations: Optional[str] = None
    access_code: str = Field(index=True, unique=True)


class Overlay(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    training_id: str = Field(foreign_key="training.id")
    training_section_id: Optional[str] = Field(default=None, foreign_key="trainingsection.id")
    time_stamp: int = Field(description="video da gözükeceği sn")
    type: str = Field(description="frame_set|button_link|button_message|button_content|label|content")
    caption: Optional[str] = Field(default=None, description="metin içeriği")
    content_id: Optional[str] = Field(default=None, foreign_key="asset.id")
    frame: Optional[str] = Field(default=None, description="wide|face_left|face_right|face_middle|face_close|custom")
    animation: Optional[str] = Field(default=None, description="fade_in|slide_in_left|slide_in_right|scale_in")
    duration: Optional[float] = Field(default=2.0, description="animation duration in seconds")
    position: Optional[str] = Field(default=None, description="left_half_content|right_half_content|left_content|right_content|buttom_left|bottom_middle|bottom_right|bottom_face")
    style_id: Optional[str] = Field(default=None, foreign_key="style.id", description="Reference to saved style")
    icon_style_id: Optional[str] = Field(default=None, foreign_key="style.id", description="Reference to icon-specific style")
    icon: Optional[str] = Field(default=None, description="Lucide icon name for label and button overlays")
    pause_on_show: Optional[bool] = Field(default=False, description="When true, pauses the base video while this overlay is visible")
    frame_config_id: Optional[str] = Field(default=None, foreign_key="frameconfig.id", description="Reference to custom frame configuration")


class FrameConfig(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    training_section_id: str = Field(foreign_key="trainingsection.id", description="Training section this frame config belongs to")
    name: str = Field(description="Frame configuration name")
    description: Optional[str] = Field(default=None, description="Frame configuration description")
    object_position_x: float = Field(default=50.0, description="Object position X percentage (0-100)")
    object_position_y: float = Field(default=50.0, description="Object position Y percentage (0-100)")
    scale: float = Field(default=1.0, description="Zoom scale factor")
    transform_origin_x: float = Field(default=50.0, description="Transform origin X percentage (0-100)")
    transform_origin_y: float = Field(default=50.0, description="Transform origin Y percentage (0-100)")
    transition_duration: float = Field(default=0.8, description="Transition duration in seconds")
    transition_easing: str = Field(default="cubic-bezier(0.4, 0, 0.2, 1)", description="CSS transition easing function")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_default: bool = Field(default=False, description="Whether this is a default frame configuration")
    global_config_id: Optional[str] = Field(default=None, foreign_key="globalframeconfig.id", description="Reference to global frame configuration if copied from one")
    company_id: Optional[str] = Field(default=None, foreign_key="company.id")


class GlobalFrameConfig(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    name: str = Field(description="Global frame configuration name")
    description: Optional[str] = Field(default=None, description="Global frame configuration description")
    object_position_x: float = Field(default=50.0, description="Object position X percentage (0-100)")
    object_position_y: float = Field(default=50.0, description="Object position Y percentage (0-100)")
    scale: float = Field(default=1.0, description="Zoom scale factor")
    transform_origin_x: float = Field(default=50.0, description="Transform origin X percentage (0-100)")
    transform_origin_y: float = Field(default=50.0, description="Transform origin Y percentage (0-100)")
    transition_duration: float = Field(default=0.8, description="Transition duration in seconds")
    transition_easing: str = Field(default="cubic-bezier(0.4, 0, 0.2, 1)", description="CSS transition easing function")
    is_active: bool = Field(default=True, description="Whether this global config is active")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    company_id: Optional[str] = Field(default=None, foreign_key="company.id")


class Style(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    name: str = Field(description="Style name for easy identification")
    description: Optional[str] = Field(default=None, description="Style description")
    style_json: str = Field(description="JSON string containing style settings")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = Field(default=None, foreign_key="user.id")
    is_default: bool = Field(default=False, description="Whether this is a default system style")
    company_id: Optional[str] = Field(default=None, foreign_key="company.id")


class Session(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    user_id: Optional[str] = Field(default=None, foreign_key="user.id")
    training_id: str = Field(foreign_key="training.id")
    started_at: datetime = Field(default_factory=auto_now)
    ended_at: Optional[datetime] = None


class InteractionLog(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    session_id: str = Field(foreign_key="session.id")
    timestamp: datetime = Field(default_factory=auto_now)
    event: str
    data_json: str = Field(default="{}")


class Rubric(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    title: str
    criteria_json: str = Field(default="{}")


class Report(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    training_id: str = Field(foreign_key="training.id")
    generated_at: datetime = Field(default_factory=auto_now)
    metrics_json: str = Field(default="{}")


class Embedding(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    owner_kind: str = Field(description="asset|overlay|rubric|training")
    owner_id: str
    vector: bytes = Field(description="binary or serialized vector")
