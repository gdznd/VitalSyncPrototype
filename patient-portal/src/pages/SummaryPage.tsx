import { useEffect, useMemo, useState } from 'react';
import { patientApi, type PatientLog } from '../lib/api';
import { getActivityMinutes, getSleepMinutes } from '../../../shared/logMetrics';
import YourJourney from '../components/YourJourney';
import { deriveJourneyObservations, type StressClassification } from '../lib/journey';

type Log = PatientLog;

const ranges = ['Last 3 Days', 'Last 7 Days', 'Last 14 Days', 'Last 30 Days', 'Custom'] as const;

export default function SummaryPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [range, setRange] = useState<typeof ranges[number]>('Last 7 Days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [loadError, setLoadError] = useState('');
  const [stressClassification] = useState<StressClassification>(null);

  useEffect(() => {
    let active = true;
    patientApi.getLogs()
      .then(({ logs: patientLogs }) => { if (active) setLogs(patientLogs); })
      .catch((error) => { if (active) setLoadError(error instanceof Error ? error.message : 'Could not load health logs.'); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const all = logs.slice().sort((a, b) => a.date.localeCompare(b.date));
    if (range !== 'Custom') {
      const days = range === 'Last 3 Days' ? 3 : range === 'Last 7 Days' ? 7 : range === 'Last 14 Days' ? 14 : 30;
      const now = new Date();
      const since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
      return all.filter(l => new Date(l.date) >= since);
    }
    if (customStart && customEnd) {
      const s = new Date(customStart);
      const e = new Date(customEnd);
      return all.filter(l => {
        const d = new Date(l.date);
        return d >= s && d <= e;
      });
    }
    return all;
  }, [logs, range, customStart, customEnd]);

  const mealsLogged = filtered.filter(l => l.type === 'food').length;
  const daysCount = useMemo(() => {
    if (range !== 'Custom') {
      return range === 'Last 3 Days' ? 3 : range === 'Last 7 Days' ? 7 : range === 'Last 14 Days' ? 14 : 30;
    }
    if (customStart && customEnd) {
      const s = new Date(customStart);
      const e = new Date(customEnd);
      return Math.max(1, Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }
    return 0;
  }, [range, customStart, customEnd]);

  const mealsMissed = Math.max(0, daysCount * 3 - mealsLogged);
  const medicationEntries = filtered.filter(l => l.type === 'medication').length;

  const activities = filtered
    .filter((log) => log.type === 'activity')
    .map((log) => ({
      name: typeof log.payload?.activity === 'string' && log.payload.activity.trim()
        ? log.payload.activity.trim()
        : log.title,
      minutes: getActivityMinutes(log.payload),
    }))
    .filter((activity): activity is { name: string; minutes: number } => activity.minutes !== null);
  const activityMinutes = activities.reduce((sum, activity) => sum + activity.minutes, 0);
  const activityByType = activities.reduce((acc: Record<string, number>, activity) => {
    acc[activity.name] = (acc[activity.name] || 0) + activity.minutes;
    return acc;
  }, {});

  const sleepMinutesArr = filtered
    .filter((log) => log.type === 'sleep')
    .map((log) => getSleepMinutes(log.payload))
    .filter((minutes): minutes is number => minutes !== null);
  const avgSleepMin = sleepMinutesArr.length ? Math.round(sleepMinutesArr.reduce((a, b) => a + b, 0) / sleepMinutesArr.length) : 0;

  const avgSleep = sleepMinutesArr.length
    ? `${Math.floor(avgSleepMin / 60)}h ${avgSleepMin % 60}m`
    : 'No data';

  const topActivities = Object.entries(activityByType).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const historyForSelected = selectedDate ? filtered.filter(l => l.date === selectedDate) : [];

  const observations = useMemo(() => deriveJourneyObservations(filtered), [filtered]);

  return (
    <section className="summary-page">
      <div className="section-header summary-heading"><div><p className="eyebrow">Summary</p><h2>Your recent activity</h2><p>See the patterns behind the small choices you are making.</p></div><span className="status-chip">{filtered.length} entries</span></div>
      {loadError && <p className="login-error" role="alert">{loadError}</p>}

      <div className="timeframe-select">
        <label>Timeframe<select value={range} onChange={e => setRange(e.target.value as any)}>{ranges.map(r => <option key={r}>{r}</option>)}</select></label>
        {range === 'Custom' && <div className="field-grid"><label>Start Date<input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} /></label><label>End Date<input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} /></label></div>}
      </div>

      <div className="cards-grid">
        <Stat icon="🍽️" label="Meals logged" value={String(mealsLogged)} note="Captured this period" />
        <Stat icon="◌" label="Meals remaining" value={String(mealsMissed)} note="Based on 3 meals per day" />
        <Stat icon="💊" label="Medication entries" value={String(medicationEntries)} note="Recorded this period" />
        <Stat icon="🚶" label="Activity minutes" value={String(activityMinutes)} note="Time spent moving" />
        <Stat icon="😴" label="Average sleep" value={avgSleep} note="Recommended: 7–9 hours" />
        <Stat icon="🧠" label="Stress reflections" value={String(filtered.filter(l => l.type === 'stress').length)} note="Moments checked in" />
        <Stat icon="🤝" label="Social reflections" value={String(filtered.filter(l => l.type === 'social').length)} note="Connections recorded" />
        <Stat icon="🌱" label="Habit entries" value={String(filtered.filter(l => l.type === 'habit').length)} note="Lifestyle routines" />
      </div>

      <section className="activity-analytics">
        <div className="section-header" style={{ marginBottom: '14px' }}>
          <div>
            <h3>Favorite Activities</h3>
            <p>Your most frequently logged physical activities and time distribution.</p>
          </div>
        </div>
        <ul className="activity-list">
          {topActivities.map(([name, mins]) => (
            <li key={name} className="activity-item">
              <strong>{name}</strong>
              <span className="badge">{mins} min</span>
            </li>
          ))}
        </ul>
        <h4 style={{ margin: '20px 0 10px', fontSize: '15px' }}>Time Spent Per Activity</h4>
        <div className="activity-bars">
          {topActivities.map(([name, mins]) => (
            <div key={name} className="bar-row">
              <div className="bar-label">{name}</div>
              <div className="bar">
                <div className="bar-fill" style={{ width: `${Math.min(100, (mins / (activityMinutes || 1)) * 100)}%` }} />
              </div>
              <div className="bar-value">{mins}m</div>
            </div>
          ))}
        </div>
      </section>

      <section className="history-section">
        <div className="section-header" style={{ marginBottom: '14px' }}>
          <div>
            <h3>History</h3>
            <p>Review past health logs filtered by date.</p>
          </div>
          <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
            <span>Select date:</span>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ minHeight: '36px' }} />
          </label>
        </div>
        <div className="timeline">
          {historyForSelected.length === 0 ? (
            <p className="muted" style={{ padding: '12px 0' }}>No logs for selected date. Choose a date above to review entries.</p>
          ) : (
            historyForSelected.map((l, i) => (
              <article className="log-entry" key={i}>
                <time>{l.time}</time>
                <div className="log-entry__icon">
                  {l.type === 'food' ? '🍽️' : l.type === 'medication' ? '💊' : l.type === 'activity' ? '🚶' : l.type === 'sleep' ? '😴' : l.type === 'stress' ? '🧠' : l.type === 'social' ? '🤝' : '🌿'}
                </div>
                <div>
                  <p className="log-entry__type">{l.type}</p>
                  <h3>{l.title}</h3>
                  <p>{l.detail}</p>
                  {l.extra && <small>{l.extra}</small>}
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <YourJourney observations={observations} stressClassification={stressClassification} />
    </section>
  );
}

function Stat({ icon, label, value, note }: { icon: string; label: string; value: string; note: string }) {
  return <article className="summary-card summary-stat"><span>{icon}</span><div><p>{label}</p><strong>{value}</strong><small>{note}</small></div></article>;
}
