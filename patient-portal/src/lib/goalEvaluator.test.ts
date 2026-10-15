import { evaluateGoal, resolveGoalTargetValue, StructuredGoal, HealthLog } from '../../../shared/goalEvaluator';
import { getActivityMinutes, getMedicationNames, getSleepMinutes } from '../../../shared/logMetrics';

function runTests() {
  console.log('Running VitalSync Goal Evaluator Tests (Phase 1)...');

  // 1. Daily duration goal met
  const goal1: StructuredGoal = {
    id: 1,
    title: 'Walk 30 mins',
    category: 'Physical Activity',
    target: '30 minutes',
    frequency: 'Daily',
    startDate: '2026-09-01',
    reviewDate: '2026-09-03',
    evaluationType: 'duration',
    targetValue: 30,
    metricKey: 'activity'
  };
  const logs1: HealthLog[] = [
    { id: 1, type: 'activity', date: '2026-09-01', time: '10:00', title: 'Walking', detail: '30 minutes', payload: { activity: 'Walking', minutes: 30 } },
    { id: 2, type: 'activity', date: '2026-09-02', time: '10:00', title: 'Walking', detail: '35 minutes', payload: { activity: 'Walking', minutes: 35 } },
    { id: 3, type: 'activity', date: '2026-09-03', time: '10:00', title: 'Walking', detail: '30 minutes', payload: { activity: 'Walking', minutes: 30 } }
  ];
  const res1 = evaluateGoal(goal1, logs1, '2026-09-03');
  assert(res1.achievedCount === 3 && res1.percentage === 100, 'Test 1 Failed: Daily duration goal met');

  // 2. Daily duration goal partially met
  const logs2: HealthLog[] = [
    { id: 1, type: 'activity', date: '2026-09-01', time: '10:00', title: 'Walking', detail: '30 minutes', payload: { activity: 'Walking', minutes: 30 } },
    { id: 2, type: 'activity', date: '2026-09-02', time: '10:00', title: 'Walking', detail: '15 minutes', payload: { activity: 'Walking', minutes: 15 } },
    { id: 3, type: 'activity', date: '2026-09-03', time: '10:00', title: 'Walking', detail: '30 minutes', payload: { activity: 'Walking', minutes: 30 } }
  ];
  const res2 = evaluateGoal(goal1, logs2, '2026-09-03');
  assert(res2.achievedCount === 2 && res2.percentage === 67, 'Test 2 Failed: Daily duration goal partially met');

  // 3. Weekday goal excluding weekends (2026-09-04 Fri, 05 Sat, 06 Sun)
  const goal3: StructuredGoal = {
    id: 3,
    title: 'Weekday Walk',
    category: 'Physical Activity',
    target: '30 minutes',
    frequency: 'Weekdays',
    startDate: '2026-09-04',
    reviewDate: '2026-09-06',
    evaluationType: 'duration',
    targetValue: 30,
    metricKey: 'activity'
  };
  const logs3: HealthLog[] = [
    { id: 1, type: 'activity', date: '2026-09-04', time: '10:00', title: 'Walking', detail: '30 minutes', payload: { minutes: 30 } },
    { id: 2, type: 'activity', date: '2026-09-05', time: '10:00', title: 'Walking', detail: '30 minutes', payload: { minutes: 30 } },
    { id: 3, type: 'activity', date: '2026-09-06', time: '10:00', title: 'Walking', detail: '30 minutes', payload: { minutes: 30 } }
  ];
  const res3 = evaluateGoal(goal3, logs3, '2026-09-06');
  assert(res3.expectedCount === 1 && res3.achievedCount === 1 && res3.percentage === 100, 'Test 3 Failed: Weekday goal excluding weekends');

  // 4. Weekly aggregate goal
  const goal4: StructuredGoal = {
    id: 4,
    title: 'Weekly Exercise',
    category: 'Physical Activity',
    target: '150 minutes',
    frequency: 'Weekly',
    startDate: '2026-09-01',
    reviewDate: '2026-09-07',
    evaluationType: 'duration',
    targetValue: 30,
    metricKey: 'activity'
  };
  const logs4: HealthLog[] = [
    { id: 1, type: 'activity', date: '2026-09-02', time: '10:00', title: 'Running', detail: '120 minutes', payload: { minutes: 120 } }
  ];
  const res4 = evaluateGoal(goal4, logs4, '2026-09-07');
  assert(
    res4.evaluable === true
      && res4.achievedCount === 4
      && res4.expectedCount === 30
      && res4.percentage === 13,
    'Test 4 Failed: Weekly activity aggregate behavior changed',
  );

  // 5. Food indicator goal
  const goal5: StructuredGoal = {
    id: 5,
    title: 'Eat vegetables',
    category: 'Nutrition',
    target: '5 servings',
    frequency: 'Daily',
    startDate: '2026-09-01',
    reviewDate: '2026-09-01',
    evaluationType: 'indicator',
    metricKey: 'food'
  };
  const logs5: HealthLog[] = [
    { id: 1, type: 'food', date: '2026-09-01', time: '12:00', title: 'Lunch', detail: 'Salad · Vegetables' }
  ];
  const res5 = evaluateGoal(goal5, logs5, '2026-09-01');
  assert(res5.achievedCount === 1 && res5.percentage === 100, 'Test 5 Failed: Food indicator goal');

  // 6. Medication occurrence goal
  const goal6: StructuredGoal = {
    id: 6,
    title: 'Take Metformin',
    category: 'Medication',
    target: '1 tablet',
    frequency: 'Daily',
    startDate: '2026-09-01',
    reviewDate: '2026-09-01',
    evaluationType: 'occurrence',
    metricKey: 'Metformin'
  };
  const logs6: HealthLog[] = [
    { id: 1, type: 'medication', date: '2026-09-01', time: '09:00', title: 'Medication', detail: 'Metformin 500 mg Tablet', payload: { medications: [{ name: 'Metformin', dosage: '500 mg', unit: 'Tablet' }] } }
  ];
  const res6 = evaluateGoal(goal6, logs6, '2026-09-01');
  assert(res6.achievedCount === 1 && res6.percentage === 100, 'Test 6 Failed: Medication occurrence goal');

  // 7. Assigned reflection goal
  const goal7: StructuredGoal = {
    id: 7,
    title: 'Stress reflection',
    category: 'Stress',
    target: '1 entry',
    frequency: 'Daily',
    startDate: '2026-09-01',
    reviewDate: '2026-09-01',
    evaluationType: 'reflection',
    metricKey: 'stress'
  };
  const logs7: HealthLog[] = [
    { id: 1, type: 'stress', date: '2026-09-01', time: '20:00', title: 'Stress reflection', detail: 'Felt calm' }
  ];
  const res7 = evaluateGoal(goal7, logs7, '2026-09-01');
  assert(res7.achievedCount === 1 && res7.percentage === 100, 'Test 7 Failed: Assigned reflection goal');

  // 8. Unsupported/custom goal
  const goal8: StructuredGoal = {
    id: 8,
    title: 'Custom build my own',
    category: 'Other',
    target: '',
    frequency: 'Daily',
    startDate: '2026-09-01',
    reviewDate: '2026-09-01',
    evaluationType: 'none'
  };
  const res8 = evaluateGoal(goal8, [], '2026-09-01');
  assert(res8.evaluable === false, 'Test 8 Failed: Unsupported/custom goal');
  assert(res8.progressText === 'Progress not automatically evaluated', 'Test 8 Failed: Unsupported goal display text');
  const unsupportedMetric = evaluateGoal({ ...goal1, metricKey: 'unstructured' }, [], '2026-09-03');
  assert(unsupportedMetric.evaluable === false, 'Test 8 Failed: Unsupported metric must not be evaluated');

  // 9. Goal date boundaries
  const goal9: StructuredGoal = {
    id: 9,
    title: 'Window test',
    category: 'Physical Activity',
    target: '30 mins',
    frequency: 'Daily',
    startDate: '2026-09-05',
    reviewDate: '2026-09-05',
    evaluationType: 'duration',
    targetValue: 30,
    metricKey: 'activity'
  };
  const logs9: HealthLog[] = [
    { id: 1, type: 'activity', date: '2026-09-01', time: '10:00', title: 'Walking', detail: '30 minutes', payload: { minutes: 30 } }
  ];
  const res9 = evaluateGoal(goal9, logs9, '2026-09-05');
  assert(res9.achievedCount === 0, 'Test 9 Failed: Goal date boundaries');

  // 10. No qualifying log data
  const goal10: StructuredGoal = {
    id: 10,
    title: 'Empty log test',
    category: 'Sleep',
    target: '7 hours',
    frequency: 'Daily',
    startDate: '2026-09-01',
    reviewDate: '2026-09-03',
    evaluationType: 'duration',
    targetValue: 7,
    metricKey: 'sleep'
  };
  const res10 = evaluateGoal(goal10, [], '2026-09-03');
  assert(res10.achievedCount === 0 && res10.percentage === 0, 'Test 10 Failed: No qualifying log data');

  const malformedSleep = evaluateGoal(
    goal10,
    [{ id: 2, type: 'sleep', date: '2026-09-02', time: '22:00', title: 'Sleep', detail: 'unknown', extra: 'unknown' }],
    '2026-09-03',
  );
  assert(malformedSleep.achievedCount === 0, 'Malformed sleep strings must not imply an 8-hour value');
  assert(getSleepMinutes({ sleepTime: '22:30', wakeTime: '06:30' }) === 480, 'Sleep duration should derive from structured times');
  assert(getSleepMinutes({ sleepTime: 'invalid', wakeTime: '06:30' }) === null, 'Invalid sleep times must be unavailable');
  assert(getActivityMinutes({ minutes: 42 }) === 42, 'Activity minutes should come from the structured payload');
  assert(getActivityMinutes({ minutes: '42' }) === null, 'String activity durations must not be parsed');
  assert(getMedicationNames({ medications: [{ name: 'Metformin' }] })[0] === 'Metformin', 'Medication names should come from structured payload');

  const sleepGoal = evaluateGoal(
    goal10,
    [{ id: 3, type: 'sleep', date: '2026-09-02', time: '22:00', title: 'Sleep', detail: 'display text', payload: { durationMinutes: 480 } }],
    '2026-09-03',
  );
  assert(sleepGoal.achievedCount === 1, 'Structured sleep duration should count toward the goal');

  const editedSleepGoal: StructuredGoal = {
    ...goal10,
    startDate: '2026-09-02',
    reviewDate: '2026-09-02',
    target: '9 hours',
    targetValue: resolveGoalTargetValue('9 hours', goal10.targetValue),
  };
  const eightHoursAgainstNine = evaluateGoal(
    editedSleepGoal,
    [{ id: 4, type: 'sleep', date: '2026-09-02', time: '22:00', title: 'Sleep', detail: 'display text', payload: { durationMinutes: 480 } }],
    '2026-09-02',
  );
  assert(
    eightHoursAgainstNine.achievedCount === 0
      && eightHoursAgainstNine.expectedCount === 1
      && eightHoursAgainstNine.percentage === 0,
    'An 8-hour log must not meet an edited 9-hour daily sleep target',
  );

  const nineHoursAgainstNine = evaluateGoal(
    editedSleepGoal,
    [{ id: 5, type: 'sleep', date: '2026-09-02', time: '22:00', title: 'Sleep', detail: 'display text', payload: { durationMinutes: 540 } }],
    '2026-09-02',
  );
  assert(
    nineHoursAgainstNine.achievedCount === 1 && nineHoursAgainstNine.percentage === 100,
    'A 9-hour log must meet an edited 9-hour daily sleep target',
  );

  const weeklySleepGoal: StructuredGoal = { ...goal10, frequency: 'Weekly' };
  const weeklySleepResult = evaluateGoal(
    weeklySleepGoal,
    [{ id: 6, type: 'sleep', date: '2026-09-02', time: '22:00', title: 'Sleep', detail: 'display text', payload: { durationMinutes: 480 } }],
    '2026-09-03',
  );
  assert(
    !weeklySleepResult.evaluable
      && weeklySleepResult.progressText === 'Progress not automatically evaluated',
    'Weekly sleep goals must not display misleading zero progress',
  );

  console.log('All VitalSync Goal Evaluator Tests passed successfully!');
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

runTests();
