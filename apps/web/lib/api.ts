import { z } from 'zod';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const Training = z.object({ 
  id: z.string(), 
  title: z.string(), 
  description: z.string().optional(), 
  flow_id: z.string().nullable().optional(), 
  ai_flow: z.string().nullable().optional(), 
  access_code: z.string().nullable().optional(), 
  avatar_id: z.string().nullable().optional(),
  avatar: z.object({
    id: z.string(),
    name: z.string(),
    personality: z.string(),
    elevenlabs_voice_id: z.string(),
    description: z.string().nullable().optional(),
    is_default: z.boolean(),
    company_id: z.string().nullable().optional(),
    image_url: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string()
  }).optional(),
  organization_id: z.string().nullable().optional() 
});
export type Training = z.infer<typeof Training>;

export const Asset = z.object({ 
  id: z.string(), 
  title: z.string(), 
  description: z.string().nullable().optional(), 
  kind: z.string(), 
  uri: z.string(),
  html_content: z.string().nullable().optional(),
  company_id: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  original_asset_id: z.string().nullable().optional()
});
export type Asset = z.infer<typeof Asset>;

export const TrainingSection = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(), 
  script: z.string().nullable().optional(),
  duration: z.number().nullable().optional(),
  video_object: z.string().nullable().optional(),
  asset_id: z.string().nullable().optional(),
  order_index: z.number(),
  training_id: z.string(),
  type: z.string().default("video"), // "video" or "llm_task"
  language: z.string().nullable().optional(),
  target_audience: z.string().nullable().optional(),
  audio_asset_id: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
});
export type TrainingSection = z.infer<typeof TrainingSection>;

export const FrameConfig = z.object({
  id: z.string(),
  training_section_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  object_position_x: z.number(),
  object_position_y: z.number(),
  scale: z.number(),
  transform_origin_x: z.number(),
  transform_origin_y: z.number(),
  transition_duration: z.number(),
  transition_easing: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  is_default: z.boolean(),
  global_config_id: z.string().nullable(),
});
export type FrameConfig = z.infer<typeof FrameConfig>;

export const GlobalFrameConfig = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  object_position_x: z.number(),
  object_position_y: z.number(),
  scale: z.number(),
  transform_origin_x: z.number(),
  transform_origin_y: z.number(),
  transition_duration: z.number(),
  transition_easing: z.string(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type GlobalFrameConfig = z.infer<typeof GlobalFrameConfig>;

export const Overlay = z.object({
  id: z.string(),
  training_id: z.string(),
  training_section_id: z.string().nullable().optional(),
  time_stamp: z.number(),
  type: z.string(),
  caption: z.string().nullable().optional(),
  content_id: z.string().nullable().optional(),
  style_id: z.string().nullable().optional(),
  frame: z.string().nullable().optional(),
  animation: z.string().nullable().optional(),
  duration: z.number().nullable().optional(),
  position: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  pause_on_show: z.boolean().nullable().optional(),
  frame_config_id: z.string().nullable().optional(),
  content_asset: Asset.nullable().optional()
});
export type Overlay = z.infer<typeof Overlay>;

export const Company = z.object({ 
  id: z.string(), 
  name: z.string(), 
  business_topic: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string()
});
export type Company = z.infer<typeof Company>;

export const User = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string().nullable().optional(),
  full_name: z.string().nullable().optional(),
  company_id: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  gpt_prefs: z.string().nullable().optional(),
});
export type User = z.infer<typeof User>;


export const CompanyTraining = z.object({ 
  id: z.string(), 
  company_id: z.string().nullable().optional(), 
  training_id: z.string(), 
  expectations: z.string().nullable().optional(), 
  access_code: z.string(),
  training: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable().optional()
  }).nullable().optional(),
  company: z.object({
    id: z.string(),
    name: z.string(),
    business_topic: z.string().nullable().optional()
  }).nullable().optional()
});
export type CompanyTraining = z.infer<typeof CompanyTraining>;

export const Style = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  style_json: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  created_by: z.string().nullable().optional(),
  is_default: z.boolean(),
  company_id: z.string().nullable().optional()
});
export type Style = z.infer<typeof Style>;

async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const url = `${base}${path}`;
  console.log('🌐 API Request:', { path, url, method: init?.method || 'GET' });
  
  // Get token from localStorage
  let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  // QUICK BYPASS: Auto-login as superadmin in development
  if (!token && typeof window !== 'undefined' && (process.env.NODE_ENV === 'development' || process.env.BYPASS_AUTH === 'true')) {
    try {
      console.log('🔄 Auto-login as superadmin...');
      const loginResponse = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          email: 'superadmin@example.com', 
          password: 'superadmin123' 
        }),
      });
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        token = loginData.access_token;
        if (token) {
          localStorage.setItem('token', token);
          localStorage.setItem('lx_user', JSON.stringify(loginData.user));
          document.cookie = `lx_token=${token}; path=/; SameSite=Lax`;
          console.log('✅ Auto-login successful');
        }
      } else {
        console.log('❌ Auto-login failed, continuing without auth');
      }
    } catch (error) {
      console.log('❌ Auto-login error:', error);
    }
  }
  
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  
  // Add authorization header if token exists
  if (token) {
    headers['authorization'] = `Bearer ${token}`;
  }
  
  const res = await fetch(url, {
    ...init,
    headers: { ...headers, ...(init?.headers || {}) },
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) {
    // 401 Unauthorized - token geçersiz, login sayfasına yönlendir
    if (res.status === 401) {
      localStorage.removeItem('token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    
    try {
      const err = JSON.parse(text);
      const detail = err?.detail || err?.error || err?.message || text;
      throw new Error(`API ${res.status}: ${detail}`);
    } catch (_) {
      throw new Error(`API ${res.status}: ${text || url}`);
    }
  }
  const data = text ? JSON.parse(text) : {};
  return schema.parse(data);
}

export const api = {
  // health check
  healthCheck: () => request('/', z.object({ status: z.string() })),
  
  // current user
  getCurrentUser: () => request('/auth/me', User),
  
  // trainings
  listTrainings: () => request('/trainings', z.array(Training)),
  getTraining: (id: string) => request(`/trainings/${id}`, Training),
  createTraining: (input: { title: string; description?: string; flow_id?: string | null; access_code?: string | null; company_id?: string | null }) =>
    request('/trainings', Training, { method: 'POST', body: JSON.stringify(input) }),
  updateTraining: (id: string, input: { title: string; description?: string; flow_id?: string | null; ai_flow?: string | null; access_code?: string | null; company_id?: string | null }) =>
    request(`/trainings/${id}`, Training, { method: 'PUT', body: JSON.stringify(input) }),
  deleteTraining: (id: string) => request(`/trainings/${id}`, z.object({ ok: z.boolean() }), { method: 'DELETE' }),
  
  // system trainings
  listSystemTrainings: () => request('/trainings/system', z.array(Training)),
  copyTraining: (sourceTrainingId: string) => request(`/trainings/${sourceTrainingId}/copy`, z.object({
    message: z.string(),
    new_training_id: z.string(),
    sections_copied: z.number(),
    overlays_copied: z.number(),
    assets_copied: z.number(),
    styles_copied: z.number()
  }), { method: 'POST' }),

  // users
  listUsers: () => request('/users', z.array(User)),
  getDashboardStatistics: () => request('/users/statistics/dashboard', z.object({
    totalUsers: z.number(),
    totalTrainings: z.number(),
    totalAssets: z.number(),
    totalStyles: z.number(),
    totalAvatars: z.number()
  })),
  getUser: (id: string) => request(`/users/${id}`, User),
  createUser: (input: { email: string; username?: string; full_name?: string; company_id?: string | null; role?: string | null; department?: string | null; password?: string | null; gpt_prefs?: string | null }) =>
    request('/users', User, { method: 'POST', body: JSON.stringify(input) }),
  updateUser: (id: string, input: { email: string; username?: string; full_name?: string; company_id?: string | null; role?: string | null; department?: string | null; password?: string | null; gpt_prefs?: string | null }) =>
    request(`/users/${id}`, User, { method: 'PUT', body: JSON.stringify(input) }),
  deleteUser: (id: string) => request(`/users/${id}`, z.object({ ok: z.boolean() }), { method: 'DELETE' }),

  // companies
  listCompanies: () => request('/companies', z.array(Company)),
  getCompany: (id: string) => request(`/companies/${id}`, Company),
  createCompany: (input: { name: string; business_topic?: string; description?: string; address?: string; phone?: string; email?: string; website?: string }) =>
    request('/companies', Company, { method: 'POST', body: JSON.stringify(input) }),
  updateCompany: (id: string, input: { name: string; business_topic?: string; description?: string; address?: string; phone?: string; email?: string; website?: string }) =>
    request(`/companies/${id}`, Company, { method: 'PUT', body: JSON.stringify(input) }),
  deleteCompany: (id: string) =>
    request(`/companies/${id}`, z.object({ ok: z.boolean() }), { method: 'DELETE' }),

  // company trainings
  attachTrainingToCompany: (companyId: string, input: { training_id: string; expectations?: string }) =>
    request(`/companies/${companyId}/trainings`, CompanyTraining, { method: 'POST', body: JSON.stringify(input) }),
  listCompanyTrainings: (companyId: string) => request(`/companies/${companyId}/trainings`, z.array(CompanyTraining)),
  listAllCompanyTrainings: () => request('/company-trainings', z.array(CompanyTraining)),
  getCompanyTraining: (id: string) => request(`/company-trainings/${id}`, CompanyTraining),
  updateCompanyTraining: (companyId: string, trainingId: string, input: { training_id: string; expectations?: string }) =>
    request(`/companies/${companyId}/trainings/${trainingId}`, CompanyTraining, { method: 'PUT', body: JSON.stringify(input) }),
  deleteCompanyTraining: (companyId: string, trainingId: string) =>
    request(`/companies/${companyId}/trainings/${trainingId}`, z.object({ ok: z.boolean() }), { method: 'DELETE' }),

  // user trainings
  createUserTraining: (userId: string, input: { training_id: string; expectations?: string }) =>
    request(`/users/${userId}/trainings`, CompanyTraining, { method: 'POST', body: JSON.stringify(input) }),
  listUserTrainings: (userId: string) => request(`/users/${userId}/trainings`, z.array(CompanyTraining)),
  updateUserTraining: (userId: string, trainingId: string, input: { training_id: string; expectations?: string }) =>
    request(`/users/${userId}/trainings/${trainingId}`, CompanyTraining, { method: 'PUT', body: JSON.stringify(input) }),
  deleteUserTraining: (userId: string, trainingId: string) =>
    request(`/users/${userId}/trainings/${trainingId}`, z.object({ ok: z.boolean() }), { method: 'DELETE' }),

  // assets
  listAssets: () => request('/assets', z.array(Asset)),
  getAsset: (id: string) => request(`/assets/${id}`, Asset),
  createAsset: (input: { title: string; description?: string; kind: string; uri: string; company_id?: string | null }) =>
    request('/assets', Asset, { method: 'POST', body: JSON.stringify(input) }),
  updateAsset: (id: string, input: { title: string; description?: string; kind: string; uri: string; company_id?: string | null }) =>
    request(`/assets/${id}`, Asset, { method: 'PUT', body: JSON.stringify(input) }),
  deleteAsset: (id: string) => request(`/assets/${id}`, z.object({ ok: z.boolean() }), { method: 'DELETE' }),

  // generation
  generateImage: (input: { provider: string; model: string; prompt: string; tags?: string[]; width?: number; height?: number }) =>
    request('/generate/image', z.object({ uri: z.string(), content_type: z.string() }), { method: 'POST', body: JSON.stringify(input) }),
  generateVideo: (input: { provider: string; model: string; prompt: string; tags?: string[]; width?: number; height?: number; duration_seconds?: number; avatar_id?: string; voice_id?: string }) =>
    request('/generate/video', z.object({ uri: z.string().optional(), content_type: z.string().optional() }).or(z.object({ detail: z.string() })), { method: 'POST', body: JSON.stringify(input) }),

  // training sections
  listTrainingSections: (trainingId: string) => request(`/trainings/${trainingId}/sections`, z.array(TrainingSection)),
  getTrainingSection: (trainingId: string, sectionId: string) => request(`/trainings/${trainingId}/sections/${sectionId}`, TrainingSection),
  createTrainingSection: (trainingId: string, input: { title: string; description?: string; script?: string; duration?: number; video_object?: string; asset_id?: string; order_index?: number; type?: string; language?: string; target_audience?: string; audio_asset_id?: string }) =>
    request(`/trainings/${trainingId}/sections`, TrainingSection, { method: 'POST', body: JSON.stringify(input) }),
  updateTrainingSection: (trainingId: string, sectionId: string, input: { title: string; description?: string; script?: string; duration?: number; video_object?: string; asset_id?: string; order_index?: number; type?: string; language?: string; target_audience?: string; audio_asset_id?: string }) =>
    request(`/trainings/${trainingId}/sections/${sectionId}`, TrainingSection, { method: 'PUT', body: JSON.stringify(input) }),
  deleteTrainingSection: (trainingId: string, sectionId: string) => request(`/trainings/${trainingId}/sections/${sectionId}`, z.object({ ok: z.boolean() }), { method: 'DELETE' }),

  // transcript generation
  generateTranscript: (trainingId: string, sectionId: string) => request(`/trainings/${trainingId}/sections/${sectionId}/transcript`, z.object({ 
    transcript: z.string(),
    srt: z.string(),
    segments: z.array(z.object({
      id: z.number(),
      start: z.number(),
      end: z.number(),
      text: z.string()
    }))
  }), { method: 'POST' }),

  // description generation
  generateDescription: (trainingId: string, sectionId: string) => request(`/trainings/${trainingId}/sections/${sectionId}/description`, z.object({ 
    description: z.string()
  }), { method: 'POST' }),

  // audio dubbing
  dubAudio: (trainingId: string, sectionId: string) => request(`/trainings/${trainingId}/sections/${sectionId}/dub-audio`, z.object({
    audio_asset_id: z.string(),
    transcript: z.string(),
    audio_url: z.string(),
    segments_count: z.number(),
    total_duration: z.number(),
    is_srt_format: z.boolean()
  }), { method: 'POST' }),

  // section overlays
  listSectionOverlays: (trainingId: string, sectionId: string) => request(`/trainings/${trainingId}/sections/${sectionId}/overlays`, z.array(Overlay)),
  getSectionOverlay: (trainingId: string, sectionId: string, overlayId: string) => request(`/trainings/${trainingId}/sections/${sectionId}/overlays/${overlayId}`, Overlay),
  createSectionOverlay: (trainingId: string, sectionId: string, input: { time_stamp: number; type: string; caption?: string; content_id?: string; style_id?: string; frame?: string; animation?: string; position?: string; icon?: string; pause_on_show?: boolean; frame_config_id?: string }) =>
    request(`/trainings/${trainingId}/sections/${sectionId}/overlays`, Overlay, { method: 'POST', body: JSON.stringify({ ...input, training_section_id: sectionId }) }),
  updateSectionOverlay: (trainingId: string, sectionId: string, overlayId: string, input: { time_stamp: number; type: string; caption?: string; content_id?: string; style_id?: string; frame?: string; animation?: string; position?: string; icon?: string; pause_on_show?: boolean; frame_config_id?: string }) =>
    request(`/trainings/${trainingId}/sections/${sectionId}/overlays/${overlayId}`, Overlay, { method: 'PUT', body: JSON.stringify({ ...input, training_section_id: sectionId }) }),
  deleteSectionOverlay: (trainingId: string, sectionId: string, overlayId: string) => request(`/trainings/${trainingId}/sections/${sectionId}/overlays/${overlayId}`, z.object({ ok: z.boolean() }), { method: 'DELETE' }),

  // styles
  listStyles: () => request('/styles/', z.array(Style)),
  getStyle: (id: string) => request(`/styles/${id}`, Style),
  createStyle: (input: { name: string; description?: string; style_json: string; company_id?: string | null }) =>
    request('/styles/', Style, { method: 'POST', body: JSON.stringify(input) }),
  updateStyle: (id: string, input: { name?: string; description?: string; style_json?: string; company_id?: string | null }) =>
    request(`/styles/${id}`, Style, { method: 'PUT', body: JSON.stringify(input) }),
  deleteStyle: (id: string) => request(`/styles/${id}`, z.object({ message: z.string() }), { method: 'DELETE' }),
  seedDefaultStyles: () => request('/styles/seed-defaults', z.object({ message: z.string() }), { method: 'POST' }),

  // frame configurations
  listSectionFrameConfigs: (sectionId: string) => request(`/frame-configs/sections/${sectionId}`, z.array(FrameConfig)),
  getFrameConfig: (frameConfigId: string) => request(`/frame-configs/${frameConfigId}`, FrameConfig),
  createFrameConfig: (sectionId: string, input: { name: string; description?: string; object_position_x?: number; object_position_y?: number; scale?: number; transform_origin_x?: number; transform_origin_y?: number; transition_duration?: number; transition_easing?: string; is_default?: boolean }) =>
    request(`/frame-configs/sections/${sectionId}`, FrameConfig, { method: 'POST', body: JSON.stringify(input) }),
  updateFrameConfig: (frameConfigId: string, input: { name?: string; description?: string; object_position_x?: number; object_position_y?: number; scale?: number; transform_origin_x?: number; transform_origin_y?: number; transition_duration?: number; transition_easing?: string; is_default?: boolean }) =>
    request(`/frame-configs/${frameConfigId}`, FrameConfig, { method: 'PUT', body: JSON.stringify(input) }),
  deleteFrameConfig: (frameConfigId: string) => request(`/frame-configs/${frameConfigId}`, z.object({ ok: z.boolean() }), { method: 'DELETE' }),
  copyFrameConfigFromGlobal: (sectionId: string, globalConfigId: string) =>
    request(`/frame-configs/sections/${sectionId}/copy-from-global/${globalConfigId}`, FrameConfig, { method: 'POST' }),

  // global frame configurations
  listGlobalFrameConfigs: () => {
    console.log('🔍 Calling listGlobalFrameConfigs with path: /frame-configs/global');
    return request(`/frame-configs/global`, z.array(GlobalFrameConfig));
  },
  getGlobalFrameConfig: (globalConfigId: string) => request(`/frame-configs/global/${globalConfigId}`, GlobalFrameConfig),
  createGlobalFrameConfig: (input: { name: string; description?: string; object_position_x?: number; object_position_y?: number; scale?: number; transform_origin_x?: number; transform_origin_y?: number; transition_duration?: number; transition_easing?: string; is_active?: boolean }) =>
    request(`/frame-configs/global`, GlobalFrameConfig, { method: 'POST', body: JSON.stringify(input) }),
  updateGlobalFrameConfig: (globalConfigId: string, input: { name?: string; description?: string; object_position_x?: number; object_position_y?: number; scale?: number; transform_origin_x?: number; transform_origin_y?: number; transition_duration?: number; transition_easing?: string; is_active?: boolean }) =>
    request(`/frame-configs/global/${globalConfigId}`, GlobalFrameConfig, { method: 'PUT', body: JSON.stringify(input) }),
  deleteGlobalFrameConfig: (globalConfigId: string) => request(`/frame-configs/global/${globalConfigId}`, z.object({ ok: z.boolean() }), { method: 'DELETE' }),

  // training sections
  listTrainingSections: (trainingId: string) => request(`/trainings/${trainingId}/sections`, z.array(TrainingSection)),
  getTrainingSection: (trainingId: string, sectionId: string) => request(`/trainings/${trainingId}/sections/${sectionId}`, TrainingSection),
  createTrainingSection: (trainingId: string, input: { title: string; description?: string; order_index?: number }) =>
    request(`/trainings/${trainingId}/sections`, TrainingSection, { method: 'POST', body: JSON.stringify(input) }),
  updateTrainingSection: (trainingId: string, sectionId: string, input: { title?: string; description?: string; order_index?: number }) =>
    request(`/trainings/${trainingId}/sections/${sectionId}`, TrainingSection, { method: 'PUT', body: JSON.stringify(input) }),
  deleteTrainingSection: (trainingId: string, sectionId: string) => request(`/trainings/${trainingId}/sections/${sectionId}`, z.object({ ok: z.boolean() }), { method: 'DELETE' }),

  // SCORM package download
  downloadScormPackage: (trainingId: string) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const url = `${base}/trainings/${trainingId}/scorm-package`;
    return fetch(url, {
      method: 'GET',
      headers: { 'content-type': 'application/json' },
    }).then(response => {
      if (!response.ok) {
        throw new Error(`API ${response.status}: ${response.statusText}`);
      }
      return response.blob();
    });
  },

  // Avatar management
  listAvatars: () => request('/avatars/', z.array(z.object({
    id: z.string(),
    name: z.string(),
    personality: z.string(),
    elevenlabs_voice_id: z.string(),
    description: z.string().nullable().optional(),
    is_default: z.boolean(),
    company_id: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string()
  }))),
  getAvatar: (avatarId: string) => request(`/avatars/${avatarId}`, z.object({
    id: z.string(),
    name: z.string(),
    personality: z.string(),
    elevenlabs_voice_id: z.string(),
    description: z.string().nullable().optional(),
    is_default: z.boolean(),
    company_id: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string()
  })),
  createAvatar: (input: { name: string; personality: string; elevenlabs_voice_id: string; description?: string; is_default?: boolean }) =>
    request('/avatars/', z.object({
      id: z.string(),
      name: z.string(),
      personality: z.string(),
      elevenlabs_voice_id: z.string(),
      description: z.string().nullable().optional(),
      is_default: z.boolean(),
      company_id: z.string().nullable().optional(),
      created_at: z.string(),
      updated_at: z.string()
    }), { method: 'POST', body: JSON.stringify(input) }),
  updateAvatar: (avatarId: string, input: { name?: string; personality?: string; elevenlabs_voice_id?: string; description?: string; is_default?: boolean }) =>
    request(`/avatars/${avatarId}`, z.object({
      id: z.string(),
      name: z.string(),
      personality: z.string(),
      elevenlabs_voice_id: z.string(),
      description: z.string().nullable().optional(),
      is_default: z.boolean(),
      company_id: z.string().nullable().optional(),
      created_at: z.string(),
      updated_at: z.string()
    }), { method: 'PUT', body: JSON.stringify(input) }),
  deleteAvatar: (avatarId: string) => request(`/avatars/${avatarId}`, z.object({ message: z.string() }), { method: 'DELETE' }),
  importAvatars: (avatars: any[]) => request('/avatars/import', z.object({
    imported_count: z.number(),
    errors: z.array(z.string()),
    avatars: z.array(z.any())
  }), { method: 'POST', body: JSON.stringify(avatars) }),
  exportAvatars: () => request('/avatars/export/company', z.object({
    avatars: z.array(z.any()),
    exported_count: z.number(),
    exported_at: z.string()
  })),

  // ElevenLabs integration
  getElevenLabsVoices: () => request('/avatars/elevenlabs/voices', z.object({
    voices: z.array(z.object({
      voice_id: z.string(),
      name: z.string(),
      category: z.string(),
      description: z.string(),
      labels: z.record(z.string()),
      preview_url: z.string()
    })),
    total_count: z.number()
  })),
  testElevenLabsVoice: (voiceId: string, text?: string) => request(`/avatars/elevenlabs/test-voice?voice_id=${encodeURIComponent(voiceId)}&text=${encodeURIComponent(text || 'Merhaba! Bu bir ses denemesidir.')}`, z.object({
    success: z.boolean(),
    audio_data: z.string(),
    voice_id: z.string(),
    text: z.string(),
    content_type: z.string()
  }), { 
    method: 'POST'
  }),
  
  // Avatar image upload
  uploadAvatarImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return fetch(`${API_BASE}/uploads/avatar-image`, {
      method: 'POST',
      body: formData,
      headers
    }).then(async (response) => {
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
      }
      return response.json();
    });
  },

  // User interactions and tracking
  createSession: (sessionData: {
    user_id: string;
    training_id: string;
    company_id: string;
    status?: string;
  }) => request('/interactions/sessions', z.object({ 
    id: z.string(), 
    message: z.string() 
  }), {
    method: 'POST',
    body: JSON.stringify(sessionData)
  }),

  createInteraction: (interaction: {
    session_id: string;
    interaction_type: string;
    section_id?: string;
    overlay_id?: string;
    video_time?: number;
    duration?: number;
    content?: string;
    interaction_metadata?: Record<string, any>;
    response_time?: number;
    success?: boolean;
  }) => request('/interactions/interactions', z.object({ id: z.string(), message: z.string() }), {
    method: 'POST',
    body: JSON.stringify(interaction)
  }),

  createChatMessage: (message: {
    session_id: string;
    message_type: string;
    content: string;
    section_id?: string;
    video_time?: number;
    llm_model?: string;
    llm_tokens_used?: number;
    llm_response_time?: number;
    audio_data?: string;
    has_audio?: boolean;
    message_metadata?: Record<string, any>;
  }) => request('/interactions/chat-messages', z.object({ id: z.string(), message: z.string() }), {
    method: 'POST',
    body: JSON.stringify(message)
  }),

  updateTrainingProgress: (userId: string, trainingId: string, progress: {
    current_section_id?: string;
    current_video_time?: number;
    completed_sections?: string[];
    status?: string;
    is_completed?: boolean;
  }) => request(`/interactions/training-progress/${userId}/${trainingId}`, z.object({ 
    message: z.string(), 
    progress: z.any() 
  }), {
    method: 'PUT',
    body: JSON.stringify(progress)
  }),

  // Training Completion
  completeTraining: (completionData: {
    user_id: string;
    training_id: string;
    company_id?: string;
    completion_time?: number;
    completion_percentage?: number;
  }) => request('/interactions/complete-training', z.object({ 
    id: z.string(), 
    message: z.string(),
    completion_time: z.number(),
    completion_percentage: z.number()
  }), {
    method: 'POST',
    body: JSON.stringify(completionData)
  }),

  getTrainingCompletions: () => request('/interactions/training-completions', z.object({
    completions: z.array(z.object({
      id: z.string(),
      user_id: z.string(),
      training_id: z.string(),
      company_id: z.string(),
      completed_at: z.string(),
      completion_percentage: z.number(),
      total_time_spent: z.number(),
      total_interactions: z.number(),
      sections_completed: z.number()
    })),
    total_count: z.number()
  }), {
    method: 'GET'
  }),

  getTrainingProgress: (userId: string, trainingId: string) => request(`/interactions/training-progress/${userId}/${trainingId}`, z.any()),

  getUserReport: (userId: string, trainingId: string) => request(`/interactions/user-report/${userId}/${trainingId}`, z.object({
    user_id: z.string(),
    training_id: z.string(),
    total_sessions: z.number(),
    total_time_spent: z.number(),
    completion_percentage: z.number(),
    last_accessed: z.string(),
    sections_completed: z.number(),
    total_interactions: z.number(),
    chat_messages_count: z.number(),
    average_session_duration: z.number(),
    engagement_score: z.number()
  })),

  getSessionInteractions: (sessionId: string, limit?: number, offset?: number) => request(
    `/interactions/interactions/${sessionId}?limit=${limit || 100}&offset=${offset || 0}`,
    z.object({
      interactions: z.array(z.any()),
      total: z.number(),
      limit: z.number(),
      offset: z.number()
    })
  ),

  getChatHistory: (sessionId: string, limit?: number, offset?: number) => request(
    `/interactions/chat-history/${sessionId}?limit=${limit || 100}&offset=${offset || 0}`,
    z.object({
      messages: z.array(z.any()),
      total: z.number(),
      limit: z.number(),
      offset: z.number()
    })
  ),

  getTrainingAnalytics: (trainingId: string, days?: number) => request(
    `/interactions/analytics/training/${trainingId}?days=${days || 30}`,
    z.object({
      training_id: z.string(),
      period_days: z.number(),
      progress_stats: z.object({
        total_users: z.number(),
        completed_users: z.number(),
        average_completion: z.number(),
        average_time_spent: z.number()
      }),
      interaction_stats: z.object({
        total_interactions: z.number(),
        chat_interactions: z.number(),
        navigation_interactions: z.number()
      })
    })
  ),
};
