const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export type AuthUser = {
  id: number;
  email: string;
  role: 'doctor' | 'patient';
  is_temporary_password: boolean;
  name: string | null;
  specialty: string | null;
  initials: string | null;
  display_color: string | null;
};

type LoginResponse = { token: string; user: AuthUser };
type CurrentUserResponse = { user: AuthUser };
type DoctorDirectoryEntry = { id: number; name: string; initials: string; color: string };
export type DoctorProfileDto = {
  id: number;
  name: string;
  email: string;
  specialty: string;
  clinic: string;
  about: string;
  license: string;
  phone: string;
  initials: string;
  color: string;
};
export type DoctorProfileChanges = Pick<DoctorProfileDto, 'name' | 'specialty' | 'clinic' | 'about' | 'license' | 'phone'>;
export type DoctorPreferencesDto = {
  clinic: string;
  theme: 'system' | 'light' | 'dark';
  accent: 'teal' | 'blue' | 'purple' | 'green';
  defaultPatientType: 'Out-patient' | 'In-patient';
  defaultFollowUpDays: 3 | 7 | 14 | 30;
  defaultVisibility: 'Assigned Only' | 'Selected Doctors' | 'All Doctors';
  notifications: { dashboard: boolean; messages: boolean; reminders: boolean; activity: boolean };
};
export type ConversationPreferencesDto = {
  pinned: boolean;
  notificationPreference: 'All messages' | 'Important only' | 'Muted';
};
export type PatientConversationMessage = { id: number; sender: 'patient' | 'doctor'; text: string; time: string; important: boolean };
export type DoctorNoteDto = { id: number; text: string; createdAt: string | null };
export type TeamMessageDto = { id: number; side: 'doctor' | 'team'; text: string; time: string; important: boolean };
export type MonitoringHistoryEpisodeDto = {
  id: number;
  careFocus: string;
  startedAt: string | null;
  endedAt: string | null;
  status: 'Current' | 'Completed';
  managingDoctor: string | null;
};
export type ProviderGoalDto = {
  id: number;
  patientUniqueId: string;
  title: string;
  category: string;
  target: string;
  frequency: 'Daily' | 'Weekdays' | 'Weekly';
  startDate: string;
  reviewDate: string;
  instructions: string;
  status: 'Active' | 'Paused' | 'Completed' | 'Cancelled';
  progressPercent: number;
  assignedBy: string;
  evaluationType?: 'duration' | 'indicator' | 'occurrence' | 'reflection' | 'none';
  targetValue?: number | null;
  targetUnit?: string;
  metricKey?: string;
};
type CreatedPatient = {
  id: number;
  unique_id: string;
  name: string;
  age: number | null;
  phone: string | null;
  email: string;
  care_focus: string | null;
  patient_type: 'Out-patient' | 'In-patient';
  status: 'Needs attention' | 'On track' | 'Follow up';
  priority: 'High' | 'Medium' | 'Low';
  follow_up_date: string | null;
  monitoring_active: boolean;
};
export type PatientChanges = {
  name: string;
  careFocus: string;
  patientType: 'Out-patient' | 'In-patient';
  priority: 'High' | 'Medium' | 'Low';
};

// Helper to get stored auth token
export const getAuthToken = () => localStorage.getItem('vitalsync_token');

// Helper to save auth token
export const setAuthToken = (token: string) => localStorage.setItem('vitalsync_token', token);

export const clearAuthToken = () => {
  localStorage.removeItem('vitalsync_token');
  localStorage.removeItem('token');
};

// Generic fetch wrapper with Authorization header
async function fetchWithAuth<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthToken();
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// Doctor Dashboard API endpoints
export const api = {
  // Login doctor
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const data = await fetchWithAuth<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      setAuthToken(data.token);
    }
    return data;
  },

  // Fetch current user
  getMe: () => fetchWithAuth<CurrentUserResponse>('/auth/me'),
  getDoctorProfile: () => fetchWithAuth<{ profile: DoctorProfileDto }>('/doctor/profile'),
  updateDoctorProfile: (changes: DoctorProfileChanges) =>
    fetchWithAuth<{ profile: DoctorProfileDto }>('/doctor/profile', {
      method: 'PATCH',
      body: JSON.stringify(changes),
    }),
  getAccountPreferences: () =>
    fetchWithAuth<{ preferences: DoctorPreferencesDto }>('/preferences'),
  updateAccountPreferences: (changes: Partial<DoctorPreferencesDto>) =>
    fetchWithAuth<{ preferences: DoctorPreferencesDto }>('/preferences', {
      method: 'PATCH',
      body: JSON.stringify(changes),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    fetchWithAuth<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // Register a new doctor account
  registerDoctor: async (account: { name: string; email: string; password: string; specialty: string }): Promise<LoginResponse> => {
    const data = await fetchWithAuth<LoginResponse>('/auth/register-doctor', {
      method: 'POST',
      body: JSON.stringify(account),
    });
    if (data.token) {
      setAuthToken(data.token);
    }
    return data;
  },

  // Patient Directory
  getPatients: (monitoringActive = true) => fetchWithAuth(`/patients?monitoring_active=${monitoringActive}`),
  getDoctors: () => fetchWithAuth<{ doctors: (DoctorDirectoryEntry & { specialty: string; is_current: boolean })[] }>('/doctors'),
  getPatientById: (id: number) => fetchWithAuth(`/patients/${id}`),
  getPatientLogs: (patientId: number, filters: { startDate?: string; endDate?: string; type?: 'food' | 'medication' | 'activity' | 'sleep' | 'stress' | 'social' | 'habit' } = {}) => {
    const params = new URLSearchParams({ patient_id: String(patientId) });
    if (filters.startDate) params.set('start_date', filters.startDate);
    if (filters.endDate) params.set('end_date', filters.endDate);
    if (filters.type) params.set('type', filters.type);
    return fetchWithAuth<{ logs: { id: number; patient_id: number; patientUniqueId: string | null; type: 'food' | 'medication' | 'activity' | 'sleep' | 'stress' | 'social' | 'habit'; date: string; time: string; title: string; detail: string; extra: string; payload: Record<string, unknown> }[] }>(`/logs?${params.toString()}`);
  },
  getPatientMessages: (patientId: number) =>
    fetchWithAuth<{ messages: PatientConversationMessage[] }>(`/patients/${patientId}/messages`),
  sendPatientMessage: (patientId: number, text: string, important: boolean) =>
    fetchWithAuth<{ message: PatientConversationMessage }>(`/patients/${patientId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text, important }),
    }),
  getProviderGoals: (patientId: number) =>
    fetchWithAuth<{ goals: ProviderGoalDto[] }>(`/patients/${patientId}/provider-goals`),
  saveProviderGoals: (patientId: number, goals: ProviderGoalDto[]) =>
    fetchWithAuth<{ goals: ProviderGoalDto[] }>(`/patients/${patientId}/provider-goals`, {
      method: 'PUT',
      body: JSON.stringify({ goals }),
    }),
  getMonitoringHistory: (patientId: number) =>
    fetchWithAuth<{ episodes: MonitoringHistoryEpisodeDto[] }>(`/patients/${patientId}/monitoring-history`),
  getDoctorNotes: () => fetchWithAuth<{ notes: DoctorNoteDto[] }>('/doctor/notes'),
  getDoctorReminders: () => fetchWithAuth<{ patientIds: number[] }>('/doctor/reminders'),
  setPatientReminder: (patientId: number, enabled: boolean) =>
    fetchWithAuth<{ patientId: number; enabled: boolean }>(`/patients/${patientId}/reminder`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    }),
  createDoctorNote: (text: string) =>
    fetchWithAuth<{ note: DoctorNoteDto }>('/doctor/notes', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  deleteDoctorNote: (noteId: number) =>
    fetchWithAuth<void>(`/doctor/notes/${noteId}`, { method: 'DELETE' }),
  getTeamMessages: (doctorId: number) =>
    fetchWithAuth<{ messages: TeamMessageDto[] }>(`/team/messages/${doctorId}`),
  getConversationPreferences: (targetType: 'patient' | 'doctor', targetId: number) =>
    fetchWithAuth<{ preferences: ConversationPreferencesDto }>(`/conversation-preferences/${targetType}/${targetId}`),
  updateConversationPreferences: (
    targetType: 'patient' | 'doctor',
    targetId: number,
    changes: Partial<ConversationPreferencesDto>,
  ) =>
    fetchWithAuth<{ preferences: ConversationPreferencesDto }>(`/conversation-preferences/${targetType}/${targetId}`, {
      method: 'PATCH',
      body: JSON.stringify(changes),
    }),
  sendTeamMessage: (doctorId: number, text: string, important: boolean) =>
    fetchWithAuth<{ message: TeamMessageDto }>(`/team/messages/${doctorId}`, {
      method: 'POST',
      body: JSON.stringify({ text, important }),
    }),

  createPatient: (patient: { email: string; name: string; phone?: string }): Promise<{ patient: CreatedPatient; message: string }> =>
    fetchWithAuth('/patients', {
      method: 'POST',
      body: JSON.stringify(patient),
    }),

  updatePatient: (id: number, data: PatientChanges) =>
    fetchWithAuth<{ message: string; patient: CreatedPatient }>(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updatePatientFollowUp: (id: number, followUpDate: string) =>
    fetchWithAuth(`/patients/${id}/follow-up`, {
      method: 'PATCH',
      body: JSON.stringify({ followUpDate }),
    }),

  updatePatientVisibility: (id: number, visibility: 'Assigned Only' | 'Selected Doctors' | 'All Doctors', selectedDoctorIds: number[] = []) =>
    fetchWithAuth<{ patient: { id: number; visibility: 'Assigned Only' | 'Selected Doctors' | 'All Doctors'; selected_doctor_ids: number[] } }>(`/patients/${id}/visibility`, {
      method: 'PATCH',
      body: JSON.stringify({ visibility, selectedDoctorIds }),
    }),

  archivePatient: (id: number) =>
    fetchWithAuth(`/patients/${id}/archive`, { method: 'POST' }),

  reactivatePatient: (uniqueId: string) =>
    fetchWithAuth('/patients/reactivate', {
      method: 'POST',
      body: JSON.stringify({ uniqueId }),
    }),

  deletePatient: (id: number) =>
    fetchWithAuth(`/patients/${id}`, {
      method: 'DELETE',
    }),

  // Vitals
  getPatientVitals: (patientId: number) => fetchWithAuth(`/vitals/patient/${patientId}`),
  getLatestVitals: (patientId: number) => fetchWithAuth(`/vitals/patient/${patientId}/latest`),
  addVitals: (patientId: number, vitals: { heart_rate: number; blood_pressure: string; spo2: number; temperature: number }) =>
    fetchWithAuth('/vitals', {
      method: 'POST',
      body: JSON.stringify({ patient_id: patientId, ...vitals }),
    }),
};