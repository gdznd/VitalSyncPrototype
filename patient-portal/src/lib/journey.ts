
export function deriveJourneyObservations(logs: any[]): string[] {
  const observations: string[] = [];
  
  const hasFood = logs.some(l => l.type === 'food');
  const hasActivity = logs.some(l => l.type === 'activity');
  const hasSleep = logs.some(l => l.type === 'sleep');
  const hasMedication = logs.some(l => l.type === 'medication');
  const hasReflection = logs.some(l => l.type === 'stress' || l.type === 'social' || l.type === 'habit');

  if (hasFood) {
    observations.push("You've been consistently logging your meals this period.");
  }
  if (hasActivity) {
    observations.push("You've recorded several physical activities this period.");
  }
  if (hasSleep) {
    observations.push("You've been regularly tracking your sleep.");
  }
  if (hasMedication) {
    observations.push("You've been keeping up with your medication logging.");
  }
  if (hasReflection) {
    observations.push("You've been taking time to reflect on your wellbeing.");
  }

  if (observations.length === 0) {
    observations.push("Start by adding your first health log today.");
  }

  return observations;
}

// The stress classification is doctor-only (team decision D-03): the Patient Portal never shows it.
