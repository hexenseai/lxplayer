import { z } from 'zod';

export const Training = z.object({ id: z.string(), title: z.string(), description: z.string().optional(), flow_id: z.string().nullable().optional(), ai_flow: z.string().nullable().optional() });
export type Training = z.infer<typeof Training>;

export const Asset = z.object({ 
  id: z.string(), 
  title: z.string(), 
  description: z.string().nullable().optional(), 
  kind: z.string(), 
  uri: z.string(),
  html_content: z.string().nullable().optional()
});
export type Asset = z.infer<typeof Asset>;

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

export const Organization = z.object({ id: z.string(), name: z.string(), business_topic: z.string().nullable().optional() });
export type Organization = z.infer<typeof Organization>;

export const User = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string().nullable().optional(),
  full_name: z.string().nullable().optional(),
  organization_id: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  gpt_prefs: z.string().nullable().optional(),
});
export type User = z.infer<typeof User>;

export const TrainingSection = z.object({
  id: z.string(),
  training_id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  script: z.string().nullable().optional(),
  duration: z.number().nullable().optional(),
  video_object: z.string().nullable().optional(),
  asset_id: z.string().nullable().optional(),
  order_index: z.number(),
  asset: Asset.nullable().optional()
});
export type TrainingSection = z.infer<typeof TrainingSection>;

export const CompanyTraining = z.object({ 
  id: z.string(), 
  organization_id: z.string(), 
  training_id: z.string(), 
  expectations: z.string().nullable().optional(), 
  access_code: z.string(),
  training: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable().optional()
  }).nullable().optional(),
  organization: z.object({
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
  is_default: z.boolean()
});
export type Style = z.infer<typeof Style>;

async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
  const url = `${base}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) {
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
  
  // trainings
  listTrainings: () => request('/trainings', z.array(Training)),
  getTraining: (id: string) => request(`/trainings/${id}`, Training),
  createTraining: (input: { title: string; description?: string; flow_id?: string | null }) =>
    request('/trainings', Training, { method: 'POST', body: JSON.stringify(input) }),
  updateTraining: (id: string, input: { title: string; description?: string; flow_id?: string | null; ai_flow?: string | null }) =>
    request(`/trainings/${id}`, Training, { method: 'PUT', body: JSON.stringify(input) }),
  deleteTraining: (id: string) => request(`/trainings/${id}`, z.object({ ok: z.boolean() }), { method: 'DELETE' }),



  // users
  listUsers: () => request('/users', z.array(User)),
  getUser: (id: string) => request(`/users/${id}`, User),
  createUser: (input: { email: string; username?: string; full_name?: string; organization_id?: string | null; role?: string | null; department?: string | null; password?: string | null; gpt_prefs?: string | null }) =>
    request('/users', User, { method: 'POST', body: JSON.stringify(input) }),
  updateUser: (id: string, input: { email: string; username?: string; full_name?: string; organization_id?: string | null; role?: string | null; department?: string | null; password?: string | null; gpt_prefs?: string | null }) =>
    request(`/users/${id}`, User, { method: 'PUT', body: JSON.stringify(input) }),
  deleteUser: (id: string) => request(`/users/${id}`, z.object({ ok: z.boolean() }), { method: 'DELETE' }),

  // organizations
  listOrganizations: () => request('/organizations', z.array(Organization)),
  getOrganization: (id: string) => request(`/organizations/${id}`, Organization),
  createOrganization: (input: { name: string; business_topic?: string }) =>
    request('/organizations', Organization, { method: 'POST', body: JSON.stringify(input) }),
  updateOrganization: (id: string, input: { name: string; business_topic?: string }) =>
    request(`/organizations/${id}`, Organization, { method: 'PUT', body: JSON.stringify(input) }),
  deleteOrganization: (id: string) => request(`/organizations/${id}`, z.object({ ok: z.boolean() }), { method: 'DELETE' }),

  // company trainings
  attachTrainingToOrg: (orgId: string, input: { training_id: string; expectations?: string }) =>
    request(`/organizations/${orgId}/trainings`, CompanyTraining, { method: 'POST', body: JSON.stringify(input) }),
  listOrgTrainings: (orgId: string) => request(`/organizations/${orgId}/trainings`, z.array(CompanyTraining)),
  listCompanyTrainings: () => request('/company-trainings', z.array(CompanyTraining)),
  getCompanyTraining: (id: string) => request(`/company-trainings/${id}`, CompanyTraining),
  updateCompanyTraining: (orgId: string, trainingId: string, input: { training_id: string; expectations?: string }) =>
    request(`/organizations/${orgId}/trainings/${trainingId}`, CompanyTraining, { method: 'PUT', body: JSON.stringify(input) }),
  deleteCompanyTraining: (orgId: string, trainingId: string) =>
    request(`/organizations/${orgId}/trainings/${trainingId}`, z.object({ ok: z.boolean() }), { method: 'DELETE' }),

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
  createAsset: (input: { title: string; description?: string; kind: string; uri: string }) =>
    request('/assets', Asset, { method: 'POST', body: JSON.stringify(input) }),
  updateAsset: (id: string, input: { title: string; description?: string; kind: string; uri: string }) =>
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
  createTrainingSection: (trainingId: string, input: { title: string; description?: string; script?: string; duration?: number; video_object?: string; asset_id?: string; order_index?: number }) =>
    request(`/trainings/${trainingId}/sections`, TrainingSection, { method: 'POST', body: JSON.stringify(input) }),
  updateTrainingSection: (trainingId: string, sectionId: string, input: { title: string; description?: string; script?: string; duration?: number; video_object?: string; asset_id?: string; order_index?: number }) =>
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

  // section overlays
  listSectionOverlays: (trainingId: string, sectionId: string) => request(`/trainings/${trainingId}/sections/${sectionId}/overlays`, z.array(Overlay)),
  getSectionOverlay: (trainingId: string, sectionId: string, overlayId: string) => request(`/trainings/${trainingId}/sections/${sectionId}/overlays/${overlayId}`, Overlay),
  createSectionOverlay: (trainingId: string, sectionId: string, input: { time_stamp: number; type: string; caption?: string; content_id?: string; style_id?: string; frame?: string; animation?: string; position?: string; icon?: string; pause_on_show?: boolean; frame_config_id?: string }) =>
    request(`/trainings/${trainingId}/sections/${sectionId}/overlays`, Overlay, { method: 'POST', body: JSON.stringify({ ...input, training_section_id: sectionId }) }),
  updateSectionOverlay: (trainingId: string, sectionId: string, overlayId: string, input: { time_stamp: number; type: string; caption?: string; content_id?: string; style_id?: string; frame?: string; animation?: string; position?: string; icon?: string; pause_on_show?: boolean; frame_config_id?: string }) =>
    request(`/trainings/${trainingId}/sections/${sectionId}/overlays/${overlayId}`, Overlay, { method: 'PUT', body: JSON.stringify({ ...input, training_section_id: sectionId }) }),
  deleteSectionOverlay: (trainingId: string, sectionId: string, overlayId: string) => request(`/trainings/${trainingId}/sections/${sectionId}/overlays/${overlayId}`, z.object({ ok: z.boolean() }), { method: 'DELETE' }),

  // styles
  listStyles: () => request('/styles', z.array(Style)),
  getStyle: (id: string) => request(`/styles/${id}`, Style),
  createStyle: (input: { name: string; description?: string; style_json: string }) =>
    request('/styles', Style, { method: 'POST', body: JSON.stringify(input) }),
  updateStyle: (id: string, input: { name?: string; description?: string; style_json?: string }) =>
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
  listGlobalFrameConfigs: () => request(`/frame-configs/global`, z.array(GlobalFrameConfig)),
  getGlobalFrameConfig: (globalConfigId: string) => request(`/frame-configs/global/${globalConfigId}`, GlobalFrameConfig),
  createGlobalFrameConfig: (input: { name: string; description?: string; object_position_x?: number; object_position_y?: number; scale?: number; transform_origin_x?: number; transform_origin_y?: number; transition_duration?: number; transition_easing?: string; is_active?: boolean }) =>
    request(`/frame-configs/global`, GlobalFrameConfig, { method: 'POST', body: JSON.stringify(input) }),
  updateGlobalFrameConfig: (globalConfigId: string, input: { name?: string; description?: string; object_position_x?: number; object_position_y?: number; scale?: number; transform_origin_x?: number; transform_origin_y?: number; transition_duration?: number; transition_easing?: string; is_active?: boolean }) =>
    request(`/frame-configs/global/${globalConfigId}`, GlobalFrameConfig, { method: 'PUT', body: JSON.stringify(input) }),
  deleteGlobalFrameConfig: (globalConfigId: string) => request(`/frame-configs/global/${globalConfigId}`, z.object({ ok: z.boolean() }), { method: 'DELETE' }),

  // SCORM package download
  downloadScormPackage: (trainingId: string) => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
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
};
