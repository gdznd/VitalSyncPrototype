const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const AUTH_TOKEN_KEY = 'vitalsync_patient_token';

export type PatientAuthUser = {
  id: number;
  email: string;
  role: 'doctor' | 'patient';
  is_temporary_password: boolean;
  name: string | null;
  patient_unique_id: string | null;
};

type LoginResponse = { token: string; user: PatientAuthUser };
type CurrentUserResponse = { user: PatientAuthUser };

export type PatientLog = {
  id: number;
  patient_id: number;
  patientUniqueId: string | null;
  type: 'food' | 'medication' | 'activity' | 'sleep' | 'stress' | 'social' | 'habit';
  date: string;
  time: string;
  title: string;
  detail: string;
  extra: string;
  payload: Record<string, unknown>;
};

export type NewPatientLog = Omit<PatientLog, 'id' | 'patient_id' | 'patientUniqueId'>;
export type ActivityTypesResponse = { activities: string[] };

export type ProviderGoal = {
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

export type PersonalGoalDto = {
  id: number;
  patientUniqueId?: string;
  title: string;
  category: string;
  target: string;
  frequency: 'Daily' | 'Weekdays' | 'Weekly';
  startDate: string;
  reviewDate: string;
  instructions: string;
  status: 'Active' | 'Paused' | 'Completed' | 'Cancelled';
  progressPercent: number;
};

export type PatientProvider = {
  id: number;
  name: string;
  initials: string;
  color: string;
  role: string;
  specialty: string;
  clinic: string;
  about: string;
  license: string;
};

export type PatientProfileDto = {
  name: string;
  email: string;
  memberSince: string | null;
  primaryPhysician: string | null;
  careFocus: string | null;
  monitoringActive: boolean;
  phone: string;
  homeAddress: string;
  emergencyContact: string;
  dateOfBirth: string;
  age: number | null;
  weightLbs: string;
  heightInches: string;
};

export type PatientProfileChanges = Pick<
  PatientProfileDto,
  'phone' | 'homeAddress' | 'emergencyContact' | 'dateOfBirth' | 'weightLbs' | 'heightInches'
>;

export type ConversationMessage = {
  id: number;
  sender: 'patient' | 'doctor';
  text: string;
  time: string;
  important: boolean;
};
export type PatientPreferencesDto = {
  theme: 'system' | 'light' | 'dark';
  accent: 'teal' | 'navy' | 'green' | 'purple';
  textSize: 'normal' | 'large' | 'xlarge';
  language: 'English' | 'Filipino';
  notifications: {
    dailyReminder: boolean;
    messageAlerts: boolean;
    weeklySummary: boolean;
    goalReminders: boolean;
  };
};
export type ConversationPreferencesDto = {
  pinned: boolean;
  notificationPreference: 'All messages' | 'Important only' | 'Muted';
};

export const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY);

export const clearAuthToken = () => localStorage.removeItem(AUTH_TOKEN_KEY);

async function fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
  if (!response.ok) {
    if (response.status === 401) clearAuthToken();
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const patientApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await fetchWithAuth<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem(AUTH_TOKEN_KEY, response.token);
    return response;
  },
  me: () => fetchWithAuth<CurrentUserResponse>('/auth/me'),
  getProfile: () => fetchWithAuth<{ profile: PatientProfileDto }>('/patient/profile'),
  updateProfile: (changes: PatientProfileChanges) =>
    fetchWithAuth<{ profile: PatientProfileDto }>('/patient/profile', {
      method: 'PATCH',
      body: JSON.stringify(changes),
    }),
  changeEmail: (currentPassword: string, newEmail: string) =>
    fetchWithAuth<{ email: string }>('/patient/account/email', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newEmail }),
    }),
  requestPasswordChangeCode: () =>
    fetchWithAuth<{ message: string }>('/auth/change-password/code', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  verifyPasswordChangeCode: (code: string) =>
    fetchWithAuth<{ message: string }>('/auth/change-password/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  changePassword: (newPassword: string) =>
    fetchWithAuth<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),
  getPreferences: () => fetchWithAuth<{ preferences: PatientPreferencesDto }>('/preferences'),
  updatePreferences: (changes: Partial<PatientPreferencesDto>) =>
    fetchWithAuth<{ preferences: PatientPreferencesDto }>('/preferences', {
      method: 'PATCH',
      body: JSON.stringify(changes),
    }),
  getActivityTypes: () => fetchWithAuth<ActivityTypesResponse>('/activity-types'),
  createActivityType: (name: string) =>
    fetchWithAuth<ActivityTypesResponse>('/activity-types', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  getLogs: () => fetchWithAuth<{ logs: PatientLog[] }>('/logs'),
  getProviderGoals: () => fetchWithAuth<{ goals: ProviderGoal[] }>('/provider-goals'),
  getPersonalGoals: () => fetchWithAuth<{ goals: PersonalGoalDto[] }>('/personal-goals'),
  createPersonalGoal: (goal: Omit<PersonalGoalDto, 'id' | 'patientUniqueId'>) =>
    fetchWithAuth<{ goal: PersonalGoalDto }>('/personal-goals', {
      method: 'POST',
      body: JSON.stringify(goal),
    }),
  updatePersonalGoal: (id: number, changes: Partial<Omit<PersonalGoalDto, 'id' | 'patientUniqueId'>>) =>
    fetchWithAuth<{ goal: PersonalGoalDto }>(`/personal-goals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(changes),
    }),
  getProviders: () => fetchWithAuth<{ providers: PatientProvider[] }>('/providers'),
  getMessages: (doctorId: number) =>
    fetchWithAuth<{ messages: ConversationMessage[] }>(`/messages/${doctorId}`),
  getConversationPreferences: (doctorId: number) =>
    fetchWithAuth<{ preferences: ConversationPreferencesDto }>(`/conversation-preferences/doctor/${doctorId}`),
  updateConversationPreferences: (doctorId: number, changes: Partial<ConversationPreferencesDto>) =>
    fetchWithAuth<{ preferences: ConversationPreferencesDto }>(`/conversation-preferences/doctor/${doctorId}`, {
      method: 'PATCH',
      body: JSON.stringify(changes),
    }),
  sendMessage: (doctorId: number, text: string, important: boolean) =>
    fetchWithAuth<{ message: ConversationMessage }>(`/messages/${doctorId}`, {
      method: 'POST',
      body: JSON.stringify({ text, important }),
    }),
  createLog: (log: NewPatientLog) =>
    fetchWithAuth<{ log: PatientLog }>('/logs', {
      method: 'POST',
      body: JSON.stringify(log),
    }),
};