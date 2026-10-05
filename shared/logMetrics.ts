export type LogPayload = Record<string, unknown> | null | undefined;

export function getActivityMinutes(payload: LogPayload): number | null {
  const minutes = payload?.minutes;
  return typeof minutes === 'number' && Number.isFinite(minutes) && minutes >= 0
    ? minutes
    : null;
}

export function getSleepMinutes(payload: LogPayload): number | null {
  const duration = payload?.durationMinutes;
  if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
    return duration;
  }

  const bedtime = payload?.sleepTime;
  const wakeTime = payload?.wakeTime;
  if (typeof bedtime !== 'string' || typeof wakeTime !== 'string') return null;
  const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  if (!timePattern.test(bedtime) || !timePattern.test(wakeTime)) return null;

  const [bedtimeHours, bedtimeMinutes] = bedtime.split(':').map(Number);
  const [wakeHours, wakeMinutes] = wakeTime.split(':').map(Number);
  const start = bedtimeHours * 60 + bedtimeMinutes;
  const end = wakeHours * 60 + wakeMinutes;
  const minutes = (end - start + 24 * 60) % (24 * 60);
  return minutes > 0 ? minutes : null;
}

export function getMedicationNames(payload: LogPayload): string[] {
  const medications = payload?.medications;
  if (!Array.isArray(medications)) return [];
  return medications.flatMap((medication) => {
    if (typeof medication !== 'object' || medication === null || !('name' in medication)) {
      return [];
    }
    const name = medication.name;
    return typeof name === 'string' && name.trim() ? [name.trim()] : [];
  });
}
