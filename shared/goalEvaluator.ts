export type EvaluationType = 'duration' | 'indicator' | 'occurrence' | 'reflection' | 'none';
export type GoalFrequency = 'Daily' | 'Weekdays' | 'Weekly';

export interface StructuredGoal {
  id: number;
  title: string;
  category: string;
  target: string;
  frequency: GoalFrequency;
  startDate: string;
  reviewDate: string;
  evaluationType?: EvaluationType;
  targetValue?: number;
  targetUnit?: string;
  metricKey?: string;
}

export interface HealthLog {
  id: number;
  type: string;
  date: string;
  time: string;
  title: string;
  detail: string;
  extra?: string;
}

export interface EvaluationResult {
  evaluable: boolean;
  achievedCount: number;
  expectedCount: number;
  percentage: number;
  progressText: string;
  statusReason: string;
}

function parseMinutes(detail: string): number {
  const minutes = detail.match(/(\d+)\s*minutes?/i);
  const hours = detail.match(/(\d+)\s*hr/i);
  return (minutes ? parseInt(minutes[1], 10) : 0)
    + (hours ? parseInt(hours[1], 10) * 60 : 0)
    || parseInt(detail, 10)
    || 0;
}

function parseSleepHours(extra: string): number {
  const match = extra.match(/(\d+)h\s*(\d+)?m?/i);
  if (!match) return 8;
  return parseInt(match[1], 10) + (match[2] ? parseInt(match[2], 10) / 60 : 0);
}

export function evaluateGoal(
  goal: StructuredGoal,
  logs: HealthLog[],
  referenceDate: string = new Date().toISOString().slice(0, 10),
): EvaluationResult {
  const evalType = goal.evaluationType || 'none';
  const supportedCombination = (
    evalType === 'duration' && (goal.metricKey === 'activity' || goal.metricKey === 'sleep')
  ) || (
    evalType === 'indicator' && (goal.metricKey === 'food' || goal.category === 'Nutrition')
  ) || (
    evalType === 'occurrence' && Boolean(goal.metricKey)
  ) || (
    evalType === 'reflection' && ['stress', 'social', 'habit'].includes(goal.metricKey || '')
  );
  if (!supportedCombination || !goal.startDate || !goal.reviewDate) {
    return {
      evaluable: false,
      achievedCount: 0,
      expectedCount: 0,
      percentage: 0,
      progressText: 'Progress not automatically evaluated',
      statusReason: 'Custom or unsupported goal type without automatic evaluation',
    };
  }

  const start = new Date(goal.startDate);
  const end = new Date(goal.reviewDate > referenceDate ? referenceDate : goal.reviewDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return {
      evaluable: false,
      achievedCount: 0,
      expectedCount: 0,
      percentage: 0,
      progressText: '0/0 (0%)',
      statusReason: 'Invalid date range',
    };
  }

  const dates: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    const dateString = current.toISOString().slice(0, 10);
    const dayOfWeek = current.getDay();
    if (goal.frequency === 'Daily') {
      dates.push(dateString);
    } else if (goal.frequency === 'Weekdays' && dayOfWeek >= 1 && dayOfWeek <= 5) {
      dates.push(dateString);
    } else if (goal.frequency === 'Weekly') {
      dates.push(dateString);
    }
    current.setDate(current.getDate() + 1);
  }

  if (goal.frequency === 'Weekly') {
    const totalWeeks = Math.max(1, Math.ceil(dates.length / 7));
    const targetPerWeek = goal.targetValue || 1;
    const expectedTotal = totalWeeks * targetPerWeek;
    let totalAchieved = 0;
    const eligibleLogs = logs.filter(
      (log) => log.date >= goal.startDate
        && log.date <= (goal.reviewDate < referenceDate ? goal.reviewDate : referenceDate),
    );

    if (evalType === 'duration' && goal.metricKey === 'activity') {
      const totalMinutes = eligibleLogs
        .filter((log) => log.type === 'activity')
        .reduce((sum, log) => sum + parseMinutes(log.detail), 0);
      totalAchieved = Math.min(expectedTotal, Math.floor(totalMinutes / (goal.targetValue || 30)));
    } else {
      totalAchieved = eligibleLogs.filter((log) => {
        if (evalType === 'indicator' && log.type === 'food') return true;
        if (
          evalType === 'occurrence'
          && log.type === 'medication'
          && goal.metricKey
          && log.detail.toLowerCase().includes(goal.metricKey.toLowerCase())
        ) return true;
        return evalType === 'reflection' && Boolean(goal.metricKey) && log.type === goal.metricKey;
      }).length;
    }

    const percentage = expectedTotal > 0
      ? Math.min(100, Math.round((totalAchieved / expectedTotal) * 100))
      : 0;
    return {
      evaluable: true,
      achievedCount: totalAchieved,
      expectedCount: expectedTotal,
      percentage,
      progressText: `${totalAchieved}/${expectedTotal} target (${percentage}%)`,
      statusReason: 'Weekly aggregate evaluation completed successfully',
    };
  }

  const expectedCount = dates.length;
  if (expectedCount === 0) {
    return {
      evaluable: true,
      achievedCount: 0,
      expectedCount: 0,
      percentage: 0,
      progressText: '0/0 (0%)',
      statusReason: 'No expected days in evaluation window',
    };
  }

  let achievedCount = 0;
  for (const dateString of dates) {
    const dayLogs = logs.filter((log) => log.date === dateString);
    let met = false;
    if (evalType === 'duration') {
      if (goal.metricKey === 'activity') {
        const totalMinutes = dayLogs
          .filter((log) => log.type === 'activity')
          .reduce((sum, log) => sum + parseMinutes(log.detail), 0);
        met = totalMinutes >= (goal.targetValue || 30);
      } else if (goal.metricKey === 'sleep') {
        const sleepLog = dayLogs.find((log) => log.type === 'sleep');
        met = Boolean(sleepLog?.extra && parseSleepHours(sleepLog.extra) >= (goal.targetValue || 7));
      }
    } else if (evalType === 'indicator') {
      met = (goal.metricKey === 'food' || goal.category === 'Nutrition')
        && dayLogs.some((log) => log.type === 'food');
    } else if (evalType === 'occurrence' && goal.metricKey) {
      const metricKey = goal.metricKey.toLowerCase();
      met = dayLogs.some(
        (log) => log.type === 'medication'
          && log.detail.toLowerCase().includes(metricKey),
      );
    } else if (evalType === 'reflection' && goal.metricKey) {
      met = dayLogs.some((log) => log.type === goal.metricKey);
    }
    if (met) achievedCount++;
  }

  const percentage = Math.round((achievedCount / expectedCount) * 100);
  return {
    evaluable: true,
    achievedCount,
    expectedCount,
    percentage,
    progressText: `${achievedCount}/${expectedCount} days (${percentage}%)`,
    statusReason: 'Daily/weekday evaluation completed successfully',
  };
}
