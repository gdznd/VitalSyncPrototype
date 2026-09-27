const STORAGE_KEY = 'vitalsync_logs_v1';
const GOALS_KEY = 'vitalsync_goals_v1';
const PROVIDER_GOALS_KEY = 'vitalsync_provider_goals_v1';
const CURRENT_PATIENT_KEY = 'vitalsync_current_patient_id';

export function getCurrentPatientId(): string {
  try {
    return localStorage.getItem(CURRENT_PATIENT_KEY) || 'VS-0002';
  } catch {
    return 'VS-0002';
  }
}

export function setCurrentPatientId(id: string) {
  try {
    localStorage.setItem(CURRENT_PATIENT_KEY, id);
  } catch (e) {
    console.error('Failed to set current patient id', e);
  }
}

export function getLogs(): any[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const currentId = getCurrentPatientId();
    // Migration: assign unassigned logs to 'VS-0002' (the default demo patient)
    const migrated = parsed.map((log: any) => ({
      ...log,
      patientUniqueId: log.patientUniqueId || 'VS-0002'
    }));
    return migrated.filter((log: any) => log.patientUniqueId === currentId);
  } catch (e) {
    console.error('Failed to read logs', e);
    return [];
  }
}

export function saveLogs(logs: any[]) {
  try {
    const currentId = getCurrentPatientId();
    const raw = localStorage.getItem(STORAGE_KEY);
    const allLogs = raw ? JSON.parse(raw) : [];
    const otherLogs = Array.isArray(allLogs) ? allLogs.filter((l: any) => (l.patientUniqueId || 'VS-0002') !== currentId) : [];
    const stampedLogs = logs.map((l: any) => ({ ...l, patientUniqueId: l.patientUniqueId || currentId }));
    const combined = [...otherLogs, ...stampedLogs];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
  } catch (e) {
    console.error('Failed to save logs', e);
  }
}

export function clearLogs() {
  const currentId = getCurrentPatientId();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const allLogs = JSON.parse(raw);
    if (!Array.isArray(allLogs)) return;
    const remaining = allLogs.filter((l: any) => (l.patientUniqueId || 'VS-0002') !== currentId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  } catch (e) {
    console.error('Failed to clear logs for patient', e);
  }
}

export function getGoals() {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const currentId = getCurrentPatientId();
    // Migration: assign unassigned personal goals to 'VS-0002'
    const migrated = parsed.map((g: any) => ({
      ...g,
      patientUniqueId: g.patientUniqueId || 'VS-0002'
    }));
    return migrated.filter((g: any) => g.patientUniqueId === currentId);
  } catch (e) {
    console.error('Failed to read goals', e);
    return [];
  }
}

export function saveGoals(goals: any[]) {
  try {
    const currentId = getCurrentPatientId();
    const raw = localStorage.getItem(GOALS_KEY);
    const allGoals = raw ? JSON.parse(raw) : [];
    const otherGoals = Array.isArray(allGoals) ? allGoals.filter((g: any) => (g.patientUniqueId || 'VS-0002') !== currentId) : [];
    const stampedGoals = goals.map((g: any) => ({ ...g, patientUniqueId: g.patientUniqueId || currentId }));
    const combined = [...otherGoals, ...stampedGoals];
    localStorage.setItem(GOALS_KEY, JSON.stringify(combined));
  } catch (e) {
    console.error('Failed to save goals', e);
  }
}

export function clearGoals() {
  const currentId = getCurrentPatientId();
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    if (!raw) return;
    const allGoals = JSON.parse(raw);
    if (!Array.isArray(allGoals)) return;
    const remaining = allGoals.filter((g: any) => (g.patientUniqueId || 'VS-0002') !== currentId);
    localStorage.setItem(GOALS_KEY, JSON.stringify(remaining));
  } catch (e) {
    console.error('Failed to clear goals for patient', e);
  }
}

export function getProviderGoals(): any[] {
  try {
    const raw = localStorage.getItem(PROVIDER_GOALS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const currentId = getCurrentPatientId();
    return parsed.map((pg: any) => ({
      ...pg,
      patientUniqueId: pg.patientUniqueId || 'VS-0002'
    })).filter((pg: any) => pg.patientUniqueId === currentId);
  } catch (e) {
    console.error('Failed to read provider goals', e);
    return [];
  }
}

export function saveProviderGoals(goals: any[]) {
  try {
    const currentId = getCurrentPatientId();
    const raw = localStorage.getItem(PROVIDER_GOALS_KEY);
    const allGoals = raw ? JSON.parse(raw) : [];
    const otherGoals = Array.isArray(allGoals) ? allGoals.filter((pg: any) => (pg.patientUniqueId || 'VS-0002') !== currentId) : [];
    const stampedGoals = goals.map((pg: any) => ({ ...pg, patientUniqueId: pg.patientUniqueId || currentId }));
    const combined = [...otherGoals, ...stampedGoals];
    localStorage.setItem(PROVIDER_GOALS_KEY, JSON.stringify(combined));
  } catch (e) {
    console.error('Failed to save provider goals', e);
  }
}

export default { getCurrentPatientId, setCurrentPatientId, getLogs, saveLogs, clearLogs, getGoals, saveGoals, clearGoals, getProviderGoals, saveProviderGoals };
