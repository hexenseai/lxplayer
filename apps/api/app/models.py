from __future__ import annotations
from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field
import uuid


def gen_uuid() -> str:
    return str(uuid.uuid4())


auto_now = datetime.utcnow


class Organization(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    name: str
    business_topic: Optional[str] = None


class User(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    email: str = Field(index=True, unique=True)
    username: Optional[str] = None
    full_name: Optional[str] = None
    organization_id: Optional[str] = Field(default=None, foreign_key="organization.id")
    role: str = Field(default="User")
    department: Optional[str] = None
    password: Optional[str] = None
    gpt_prefs: Optional[str] = None


class Asset(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    title: str
    kind: str = Field(description="video|audio|image|doc")
    uri: str = Field(description="Object storage url or key (e.g. minio)")
    description: Optional[str] = None
    html_content: Optional[str] = None


class Flow(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    title: str
    graph_json: str = Field(default="{}")


class Training(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    title: str
    description: Optional[str] = None
    flow_id: Optional[str] = Field(default=None, foreign_key="flow.id")
    ai_flow: Optional[str] = Field(default=None, description="JSON string for AI flow configuration")


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


class CompanyTraining(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    organization_id: str = Field(foreign_key="organization.id")
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
    frame: Optional[str] = Field(default=None, description="wide|face_left|face_right|face_middle|face_close")
    animation: Optional[str] = Field(default=None, description="fade_in|slide_in_left|slide_in_right|scale_in")
    duration: Optional[float] = Field(default=2.0, description="animation duration in seconds")
    position: Optional[str] = Field(default=None, description="left_half_content|right_half_content|left_content|right_content|buttom_left|bottom_middle|bottom_right|bottom_face")
    style_id: Optional[str] = Field(default=None, foreign_key="style.id", description="Reference to saved style")
    icon: Optional[str] = Field(default=None, description="Lucide icon name for label and button overlays")
    pause_on_show: Optional[bool] = Field(default=False, description="When true, pauses the base video while this overlay is visible")


class Style(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    name: str = Field(description="Style name for easy identification")
    description: Optional[str] = Field(default=None, description="Style description")
    style_json: str = Field(description="JSON string containing style settings")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = Field(default=None, foreign_key="user.id")
    is_default: bool = Field(default=False, description="Whether this is a default system style")


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
