export type StressLabel = "NO_STRESS" | "MILD_STRESS" | "MODERATE_STRESS" | "HIGH_STRESS";

// Doctor-only result of the stress classifier for the patient's latest stress reflection.
// The classification is requested from the backend each time; it is not stored.
export type StressClassification =
  | { status: "loading" }
  | { status: "no_reflection" }
  | { status: "ok"; label: StressLabel; date: string }
  | { status: "unable_to_classify"; date: string }
  | { status: "unavailable" }
  | null;

export const STRESS_LABEL_TEXT: Record<StressLabel, string> = {
  NO_STRESS: "No Stress",
  MILD_STRESS: "Mild Stress",
  MODERATE_STRESS: "Moderate Stress",
  HIGH_STRESS: "High Stress",
};

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
  if (!stressClassification) return null;
  switch (stressClassification.status) {
    case "loading":
      return "Checking the latest stress reflection…";
    case "no_reflection":
      return `${patientName} has no stress reflection to classify yet.`;
    case "ok":
      return `The latest stress reflection for ${patientName} (${stressClassification.date}) was classified as ${STRESS_LABEL_TEXT[stressClassification.label]} by the prototype stress classifier. This is a prototype indicator, not a clinical assessment.`;
    case "unable_to_classify":
      return `The latest stress reflection for ${patientName} (${stressClassification.date}) could not be classified because it has no usable text.`;
    case "unavailable":
      return "The stress classifier is unavailable right now, so no classification is shown.";
  }
}
