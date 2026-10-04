export type StressClassification = "HIGH_STRESS" | "LOW_NORMAL" | null;

export function deriveJourneyObservations(logs: any[], patientName: string = 'Patient'): string[] {
  const observations: string[] = [];
  
  const hasFood = logs.some(l => l.type === 'food');
  const hasActivity = logs.some(l => l.type === 'activity');
  const hasSleep = logs.some(l => l.type === 'sleep');
  const hasMedication = logs.some(l => l.type === 'medication');
  const hasReflection = logs.some(l => l.type === 'stress' || l.type === 'social' || l.type === 'habit');

  if (hasFood) {
    observations.push(`${patientName} has been consistently logging meals this period.`);
  }
  if (hasActivity) {
    observations.push(`${patientName} has recorded several physical activities this period.`);
  }
  if (hasSleep) {
    observations.push(`${patientName} has been regularly tracking sleep.`);
  }
  if (hasMedication) {
    observations.push(`${patientName} has been keeping up with medication logging.`);
  }
  if (hasReflection) {
    observations.push(`${patientName} has been taking time to reflect on wellbeing.`);
  }

  if (observations.length === 0) {
    observations.push(`No health logs recorded by ${patientName} in this timeframe yet.`);
  }

  return observations;
}

export function getNlpObservation(stressClassification: StressClassification, patientName: string = 'Patient'): string | null {
  if (stressClassification === "HIGH_STRESS") {
    return `The latest stress reflection for ${patientName} was classified as High Stress by the prototype NLP module.`;
  }
  if (stressClassification === "LOW_NORMAL") {
    return `The latest stress reflection for ${patientName} was classified as Low/Normal Stress by the prototype NLP module.`;
  }
  return null;
}
