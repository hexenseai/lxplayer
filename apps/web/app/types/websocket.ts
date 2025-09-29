type BaseEvent = {
  type: string;
};

type UserTranscriptEvent = BaseEvent & {
  type: "user_transcript";
  user_transcription_event: {
    user_transcript: string;
  };
};

type AgentResponseEvent = BaseEvent & {
  type: "agent_response";
  agent_response_event: {
    agent_response: string;
  };
};

type AgentResponseCorrectionEvent = BaseEvent & {
  type: "agent_response_correction";
  agent_response_correction_event: {
    original_agent_response: string;
    corrected_agent_response: string;
  };
};

type AudioResponseEvent = BaseEvent & {
  type: "audio";
  audio_event: {
    audio_base_64: string;
    event_id: number;
  };
};

type InterruptionEvent = BaseEvent & {
  type: "interruption";
  interruption_event: {
    reason: string;
  };
};

type PingEvent = BaseEvent & {
  type: "ping";
  ping_event: {
    event_id: number;
    ping_ms?: number;
  };
};

type EvaluationResultsEvent = BaseEvent & {
  type: "evaluation_results";
  evaluation_results_event: {
    results: Array<{
      criteria_id: string;
      criteria_title: string;
      result: 'successful' | 'unsuccessful' | 'unknown';
      score?: number;
      explanation?: string;
    }>;
  };
};

export type ElevenLabsWebSocketEvent = 
  | UserTranscriptEvent
  | AgentResponseEvent
  | AgentResponseCorrectionEvent
  | AudioResponseEvent
  | InterruptionEvent
  | PingEvent
  | EvaluationResultsEvent;

export type WebSocketMessage = {
  user_audio_chunk?: string;
  type?: string;
  event_id?: number;
  contextual_update?: {
    type: "contextual_update";
    text: string;
  };
};
