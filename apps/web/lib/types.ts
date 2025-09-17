export interface TrainingData {
  id: string;
  title: string;
  description?: string;
  ai_flow?: string;
  avatar_id?: string;
  avatar?: Avatar;
  sections: Section[];
}

export interface Section {
  id: string;
  title: string;
  description?: string;
  script?: string;
  duration?: number;
  order_index: number;
  type?: string; // "video", "llm_interaction", or "llm_agent"
  agent_id?: string; // ElevenLabs Agent ID for llm_agent sections
  video_url?: string;
  overlays: Overlay[];
}

export interface Overlay {
  id: string;
  time_stamp: number;
  type: 'frame_set' | 'button_link' | 'button_message' | 'button_content' | 'label' | 'content' | 'llm_interaction';
  caption?: string;
  content_id?: string;
  style_id?: string;
  icon_style_id?: string;
  frame?: 'wide' | 'face_left' | 'face_right' | 'face_middle' | 'face_close';
  animation?: 'fade_in' | 'slide_in_left' | 'slide_in_right' | 'scale_in';
  duration?: number;
  position?: 'left_half_content' | 'right_half_content' | 'left_content' | 'right_content' | 'buttom_left' | 'bottom_middle' | 'bottom_right' | 'bottom_face' | 'top_left' | 'top_middle' | 'top_right' | 'center' | 'fullscreen' | 'fullscreen_cover' | 'fullscreen_dark';
  icon?: string;
  pause_on_show?: boolean;
  content_asset?: {
    id: string;
    title: string;
    kind: string;
    uri: string;
    description?: string;
    html_content?: string | null;
  };
  style?: {
    id: string;
    name: string;
    description?: string;
    style_json: string;
  };
}

export interface PlayerState {
  current_section: string | null;
  current_time: number;
  is_playing: boolean;
  current_overlay: string | null;
  volume: number;
  is_muted: boolean;
  show_subtitles: boolean;
  is_microphone_active: boolean;
}

export interface LLMMessage {
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export interface WebSocketMessage {
  type: 'training_loaded' | 'ai_response' | 'player_action' | 'error' | 'user_message';
  data?: any;
  message?: string;
  action?: string;
  action_value?: any;
  actions?: { type: string; value?: any }[];
  state?: Partial<PlayerState>;
  timestamp?: number;
  metadata?: {
    source?: string;
    buttonData?: any;
  };
}

export interface AudioVisualizerProps {
  isPlaying: boolean;
  audioData?: number[];
}

export interface OverlayComponentProps {
  overlay: Overlay;
  onAction?: (action: string, value?: any) => void;
  isVisible: boolean;
}

export interface VideoFrameProps {
  videoUrl?: string;
  currentTime: number;
  isPlaying: boolean;
  frame?: string;
  frameConfig?: {
    object_position_x: number;
    object_position_y: number;
    scale: number;
    transform_origin_x: number;
    transform_origin_y: number;
    transition_duration: number;
    transition_easing: string;
  };
  onTimeUpdate: (time: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onEnded: () => void;
  onDurationChange?: (duration: number) => void;
}

export interface ControlBarProps {
  onTogglePlay: () => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onToggleMicrophone: () => void;
  onToggleSubtitles: () => void;
  onSettings: () => void;
  onSendMessage: (message: string) => void;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  isMicrophoneActive: boolean;
  showSubtitles: boolean;
  currentMessage: string;
  onMessageChange: (message: string) => void;
}

export interface ChatAreaProps {
  messages: LLMMessage[];
  onSendMessage: (message: string) => void;
  currentMessage: string;
  onMessageChange: (message: string) => void;
  isMicrophoneActive: boolean;
  onToggleMicrophone: () => void;
}

export interface FlowStepsProps {
  sections: Section[];
  currentSection: string | null;
  onSectionSelect: (sectionId: string) => void;
}

export interface Avatar {
  id: string;
  name: string;
  personality: string;
  elevenlabs_voice_id: string;
  description?: string;
  image_url?: string;
  is_default: boolean;
  company_id?: string;
  created_at: string;
  updated_at: string;
}