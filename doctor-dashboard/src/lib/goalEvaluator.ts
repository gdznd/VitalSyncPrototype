export type EvaluationType = 'duration' | 'indicator' | 'occurrence' | 'reflection' | 'none';
export type GoalFrequency = 'Daily' | 'Weekdays' | 'Weekly';

export interface StructuredGoal {
  id: number;
  title: string;
  category: string;
  target: string;
  frequency: GoalFrequency;
  startDate: string; // YYYY-MM-DD
  reviewDate: string; // YYYY-MM-DD
  evaluationType?: EvaluationType;
  targetValue?: number;
  targetUnit?: string;
  metricKey?: string; // e.g., medication name, activity type, reflection type
}

export interface HealthLog {
  id: number;
  type: string;
  date: string; // YYYY-MM-DD
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
  const m = detail.match(/(\d+)\s*minutes?/i);
  const h = detail.match(/(\d+)\s*hr/i);
  return (m ? parseInt(m[1], 10) : 0) + (h ? parseInt(h[1], 10) * 60 : 0) || parseInt(detail, 10) || 0;
}

function parseSleepHours(extra: string): number {
  const m = extra.match(/(\d+)h\s*(\d+)?m?/i);
  if (!m) return 8;
  return parseInt(m[1], 10) + (m[2] ? parseInt(m[2], 10) / 60 : 0);
}

export function evaluateGoal(goal: StructuredGoal, logs: HealthLog[], referenceDate: string = new Date().toISOString().slice(0, 10)): EvaluationResult {
  const evalType = goal.evaluationType || 'none';
  if (evalType === 'none' || !goal.startDate || !goal.reviewDate) {
    return {
      evaluable: false,
      achievedCount: 0,
      expectedCount: 0,
      percentage: 0,
      progressText: 'Progress not automatically evaluated',
      statusReason: 'Custom or unsupported goal type without automatic evaluation'
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
      statusReason: 'Invalid date range'
    };
  }

  const dates: string[] = [];
  const curr = new Date(start);
  while (curr <= end) {
    const dateStr = curr.toISOString().slice(0, 10);
    const dayOfWeek = curr.getDay(); // 0 = Sun, 6 = Sat
    
    if (goal.frequency === 'Daily') {
      dates.push(dateStr);
    } else if (goal.frequency === 'Weekdays') {
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        dates.push(dateStr);
      }
    } else if (goal.frequency === 'Weekly') {
      dates.push(dateStr);
    }
    curr.setDate(curr.getDate() + 1);
  }

  if (goal.frequency === 'Weekly') {
    const totalDays = dates.length;
    const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
    const targetPerWeek = goal.targetValue || 1;
    const expectedTotal = totalWeeks * targetPerWeek;

    let totalAchieved = 0;
    if (evalType === 'duration' && goal.metricKey === 'activity') {
      const totalMins = logs
        .filter(l => l.type === 'activity' && l.date >= goal.startDate && l.date <= (goal.reviewDate < referenceDate ? goal.reviewDate : referenceDate))
        .reduce((sum, l) => sum + parseMinutes(l.detail), 0);
      totalAchieved = Math.min(expectedTotal, Math.floor(totalMins / (goal.targetValue || 30)));
    } else {
      const qualifyingLogs = logs.filter(l => {
        if (l.date < goal.startDate || l.date > (goal.reviewDate < referenceDate ? goal.reviewDate : referenceDate)) return false;
        if (evalType === 'indicator' && l.type === 'food') return true;
        if (evalType === 'occurrence' && l.type === 'medication' && goal.metricKey && l.detail.toLowerCase().includes(goal.metricKey.toLowerCase())) return true;
        if (evalType === 'reflection' && goal.metricKey && l.type === goal.metricKey) return true;
        return false;
      });
      totalAchieved = qualifyingLogs.length;
    }

    const percentage = expectedTotal > 0 ? Math.min(100, Math.round((totalAchieved / expectedTotal) * 100)) : 0;
    return {
      evaluable: true,
      achievedCount: totalAchieved,
      expectedCount: expectedTotal,
      percentage,
      progressText: `${totalAchieved}/${expectedTotal} target (${percentage}%)`,
      statusReason: 'Weekly aggregate evaluation completed successfully'
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
      statusReason: 'No expected days in evaluation window'
    };
  }

  let achievedCount = 0;
  for (const d of dates) {
    const dayLogs = logs.filter(l => l.date === d);
    let met = false;

    if (evalType === 'duration') {
      if (goal.metricKey === 'activity') {
        const totalMins = dayLogs
          .filter(l => l.type === 'activity')
          .reduce((sum, l) => sum + parseMinutes(l.detail), 0);
        if (totalMins >= (goal.targetValue || 30)) {
          met = true;
        }
      } else if (goal.metricKey === 'sleep') {
        const sleepLog = dayLogs.find(l => l.type === 'sleep');
        if (sleepLog && sleepLog.extra) {
          const hours = parseSleepHours(sleepLog.extra);
          if (hours >= (goal.targetValue || 7)) {
            met = true;
          }
        }
      }
    } else if (evalType === 'indicator') {
      if (goal.metricKey === 'food' || goal.category === 'Nutrition') {
        if (dayLogs.some(l => l.type === 'food')) {
          met = true;
        }
      }
    } else if (evalType === 'occurrence') {
      if (goal.metricKey) {
        const metricKey = goal.metricKey;
        if (dayLogs.some(l => l.type === 'medication' && l.detail.toLowerCase().includes(metricKey.toLowerCase()))) {
          met = true;
        }
      }
    } else if (evalType === 'reflection') {
      if (goal.metricKey) {
        const metricKey = goal.metricKey;
        if (dayLogs.some(l => l.type === metricKey)) {
          met = true;
        }
      }
    }

    if (met) {
      achievedCount++;
    }
  }

  const percentage = Math.round((achievedCount / expectedCount) * 100);
  return {
    evaluable: true,
    achievedCount,
    expectedCount,
    percentage,
    progressText: `${achievedCount}/${expectedCount} days (${percentage}%)`,
    statusReason: 'Daily/weekday evaluation completed successfully'
  };
}
