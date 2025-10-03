# Place for API request/response schemas separate from SQLModel if needed.

from pydantic import BaseModel, Field
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


# ===== INTERACTION SESSION SCHEMAS =====

class InteractionSessionCreate(BaseModel):
    training_id: str
    user_id: str
    access_code: str
    current_section_id: Optional[str] = None


class InteractionSessionUpdate(BaseModel):
    current_section_id: Optional[str] = None
    status: Optional[str] = None
    current_phase: Optional[str] = None
    total_time_spent: Optional[int] = None
    interactions_count: Optional[int] = None
    completion_percentage: Optional[float] = None


class InteractionSessionResponse(BaseModel):
    id: str
    training_id: str
    user_id: str
    access_code: str
    current_section_id: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    last_activity_at: datetime
    total_time_spent: int
    interactions_count: int
    completion_percentage: float
    llm_context_json: str
    current_phase: str
    metadata_json: str


# ===== INTERACTION MESSAGE SCHEMAS =====

class InteractionMessageCreate(BaseModel):
    session_id: str
    message: str
    message_type: str  # user|assistant|system


class InteractionMessageResponse(BaseModel):
    id: str
    session_id: str
    message: str
    message_type: str
    llm_context_json: Optional[str] = None
    llm_response_json: Optional[str] = None
    llm_model: Optional[str] = None
    processing_time_ms: Optional[int] = None
    suggestions_json: str
    actions_json: str
    timestamp: datetime
    metadata_json: str


class LLMMessageRequest(BaseModel):
    message: str
    message_type: str = "user"


class LLMMessageResponse(BaseModel):
    message: str
    suggestions: list[str] = []
    actions: list[dict] = []
    session_id: str
    timestamp: datetime
    processing_time_ms: Optional[int] = None
    canProceedToNext: Optional[bool] = False


# ===== SECTION PROGRESS SCHEMAS =====

class SectionProgressCreate(BaseModel):
    session_id: str
    section_id: str
    user_id: str
    status: str = "not_started"


class SectionProgressUpdate(BaseModel):
    status: Optional[str] = None
    time_spent: Optional[int] = None
    interactions_count: Optional[int] = None
    completion_percentage: Optional[float] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class SectionProgressResponse(BaseModel):
    id: str
    session_id: str
    section_id: str
    user_id: str
    status: str
    time_spent: int
    interactions_count: int
    completion_percentage: float
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    last_accessed_at: datetime
    section_data_json: str


# ===== TRAINING PROGRESS SCHEMAS =====

class TrainingProgressResponse(BaseModel):
    training_id: str
    user_id: str
    session_id: str
    total_sections: int
    completed_sections: int
    current_section_id: Optional[str] = None
    completion_percentage: float
    total_time_spent: int
    total_interactions: int
    last_accessed_at: datetime
    sections_progress: list[SectionProgressResponse] = []


# ===== EVALUATION CRITERIA SCHEMAS =====

class EvaluationCriteriaCreate(BaseModel):
    training_id: str
    title: str
    description: Optional[str] = None
    section_id: Optional[str] = None
    applies_to_entire_training: bool = True
    llm_evaluation_prompt: str
    criteria_type: str = "question"
    weight: float = 1.0
    order_index: int = 0
    is_active: bool = True


class EvaluationCriteriaUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    section_id: Optional[str] = None
    applies_to_entire_training: Optional[bool] = None
    llm_evaluation_prompt: Optional[str] = None
    criteria_type: Optional[str] = None
    weight: Optional[float] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None


class EvaluationCriteriaResponse(BaseModel):
    id: str
    training_id: str
    title: str
    description: Optional[str] = None
    section_id: Optional[str] = None
    applies_to_entire_training: bool
    llm_evaluation_prompt: str
    criteria_type: str
    weight: float
    order_index: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    company_id: Optional[str] = None


# ===== EVALUATION RESULT SCHEMAS =====

class EvaluationResultCreate(BaseModel):
    criteria_id: str
    session_id: str
    user_id: str
    training_id: str
    evaluation_score: Optional[float] = None
    evaluation_result: str
    explanation: str
    llm_model: Optional[str] = None
    processing_time_ms: Optional[int] = None
    tokens_used: Optional[int] = None
    section_id: Optional[str] = None
    user_interactions_json: str = "{}"
    context_data_json: str = "{}"
    metadata_json: str = "{}"


class EvaluationResultUpdate(BaseModel):
    evaluation_score: Optional[float] = None
    evaluation_result: Optional[str] = None
    explanation: Optional[str] = None
    metadata_json: Optional[str] = None


class EvaluationResultResponse(BaseModel):
    id: str
    criteria_id: str
    session_id: str
    user_id: str
    training_id: str
    evaluation_score: Optional[float] = None
    evaluation_result: str
    explanation: str
    llm_model: Optional[str] = None
    processing_time_ms: Optional[int] = None
    tokens_used: Optional[int] = None
    section_id: Optional[str] = None
    user_interactions_json: str
    context_data_json: str
    evaluated_at: datetime
    created_at: datetime
    metadata_json: str


# ===== EVALUATION REPORT SCHEMAS =====

class EvaluationReportCreate(BaseModel):
    session_id: str
    user_id: str
    training_id: str
    report_title: str
    overall_score: Optional[float] = None
    summary: str
    detailed_analysis: str
    recommendations: str
    criteria_results_json: str = "{}"
    strengths: str = ""
    weaknesses: str = ""
    is_public: bool = False
    generated_by: Optional[str] = None
    metadata_json: str = "{}"


class EvaluationReportUpdate(BaseModel):
    report_title: Optional[str] = None
    overall_score: Optional[float] = None
    summary: Optional[str] = None
    detailed_analysis: Optional[str] = None
    recommendations: Optional[str] = None
    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    status: Optional[str] = None
    is_public: Optional[bool] = None
    reviewed_by: Optional[str] = None
    metadata_json: Optional[str] = None


class EvaluationReportResponse(BaseModel):
    id: str
    session_id: str
    user_id: str
    training_id: str
    report_title: str
    overall_score: Optional[float] = None
    summary: str
    detailed_analysis: str
    recommendations: str
    criteria_results_json: str
    strengths: str
    weaknesses: str
    status: str
    is_public: bool
    generated_at: datetime
    reviewed_at: Optional[datetime] = None
    finalized_at: Optional[datetime] = None
    generated_by: Optional[str] = None
    reviewed_by: Optional[str] = None
    company_id: Optional[str] = None
    metadata_json: str


# Training Feedback Schemas
class TrainingFeedbackCreate(BaseModel):
    session_id: str
    training_id: str
    overall_rating: int = Field(ge=1, le=5, description="Genel değerlendirme (1-5)")
    content_quality: int = Field(ge=1, le=5, description="İçerik kalitesi (1-5)")
    ease_of_understanding: int = Field(ge=1, le=5, description="Anlaşılabilirlik (1-5)")
    interactivity: int = Field(ge=1, le=5, description="Etkileşimlilik (1-5)")
    technical_quality: int = Field(ge=1, le=5, description="Teknik kalite (1-5)")
    what_did_you_like: Optional[str] = None
    what_could_be_improved: Optional[str] = None
    additional_comments: Optional[str] = None
    is_anonymous: bool = False
    metadata_json: str = "{}"


class TrainingFeedbackResponse(BaseModel):
    id: str
    session_id: str
    user_id: str
    training_id: str
    overall_rating: int
    content_quality: int
    ease_of_understanding: int
    interactivity: int
    technical_quality: int
    what_did_you_like: Optional[str] = None
    what_could_be_improved: Optional[str] = None
    additional_comments: Optional[str] = None
    is_anonymous: bool
    created_at: datetime
    company_id: Optional[str] = None
    metadata_json: str
