import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

type LogType = 'food' | 'medication' | 'activity' | 'sleep' | 'stress' | 'social' | 'habit';
type HealthLog = { id: number; type: LogType; date: string; time: string; title: string; detail: string; extra?: string };

const ranges = ['Last 3 Days', 'Last 7 Days', 'Last 14 Days', 'Last 30 Days', 'Custom'] as const;

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseMinutesFromActivity(detail: string) {
  const m = detail.match(/(\d+) minutes/);
  const h = detail.match(/(\d+) hr/);
  const minutes = (m ? parseInt(m[1], 10) : 0) + (h ? parseInt(h[1], 10) * 60 : 0);
  return minutes || (parseInt(detail, 10) || 0);
}

function parseSleepMinutes(extra: string) {
  const m = extra.match(/(\d+)h (\d+)m/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export default function RecentActivitySummary({ patientId, patientName }: { patientId: number; patientName: string }) {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [range, setRange] = useState<typeof ranges[number]>('Last 7 Days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    let startDate: string | undefined;
    let endDate: string | undefined;
    if (range === 'Custom') {
      if (customStart && customEnd) {
        startDate = customStart;
        endDate = customEnd;
      }
    } else {
      const days = range === 'Last 3 Days' ? 3 : range === 'Last 7 Days' ? 7 : range === 'Last 14 Days' ? 14 : 30;
      const today = new Date();
      endDate = formatLocalDate(today);
      today.setHours(0, 0, 0, 0);
      today.setDate(today.getDate() - (days - 1));
      startDate = formatLocalDate(today);
    }
    api.getPatientLogs(patientId, { startDate, endDate })
      .then(({ logs: patientLogs }) => { if (active) setLogs(patientLogs); })
      .catch((error) => { if (active) setLoadError(error instanceof Error ? error.message : 'Could not load patient logs.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [patientId, range, customStart, customEnd]);

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
    return 7;
  }, [range, customStart, customEnd]);

  const mealsMissed = Math.max(0, daysCount * 3 - mealsLogged);
  const medicationEntries = filtered.filter(l => l.type === 'medication').length;

  const activityMinutes = filtered.filter(l => l.type === 'activity').reduce((sum, l) => sum + parseMinutesFromActivity(l.detail || ''), 0);
  const activityByType = filtered.filter(l => l.type === 'activity').reduce((acc: Record<string, number>, l) => { acc[l.title] = (acc[l.title] || 0) + parseMinutesFromActivity(l.detail || ''); return acc; }, {});

  const sleepMinutesArr = filtered.filter(l => l.type === 'sleep').map(l => parseSleepMinutes(l.extra || ''));
  const avgSleepMin = sleepMinutesArr.length ? Math.round(sleepMinutesArr.reduce((a, b) => a + b, 0) / sleepMinutesArr.length) : 0;
  const avgSleep = sleepMinutesArr.length ? `${Math.floor(avgSleepMin / 60)}h ${avgSleepMin % 60}m` : 'No data';

  const topActivities = Object.entries(activityByType).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const historyForSelected = selectedDate ? filtered.filter(l => l.date === selectedDate) : filtered.slice(-5);

  const observations: string[] = [];
  if (mealsLogged >= Math.max(1, daysCount)) observations.push(`${patientName || 'Patient'} has been consistently logging meals. Great progress!`);
  if (activityMinutes > 0) observations.push("Recorded several physical activities this period. Keep moving!");
  if (filtered.some(l => l.type === 'stress' || l.type === 'social')) observations.push("Taking time to reflect on wellbeing and connections.");
  if (sleepMinutesArr.length > 0) observations.push("Tracking sleep is an important step toward healthier habits.");
  if (medicationEntries > 0) observations.push("Keeping track of medications consistently.");
  if (observations.length === 0) observations.push('Start by adding health logs.');

  return (
    <section className="summary-page">
      <div className="section-header summary-heading"><div><p className="eyebrow">SUMMARY</p><h2>Your recent activity</h2><p>See the patterns behind the small choices you are making.</p></div><span className="status-chip">{filtered.length} entries</span></div>
      {loading && <p className="muted">Loading patient logs...</p>}
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
            <p>Most frequently logged physical activities and time distribution.</p>
          </div>
        </div>
        <ul className="activity-list">
          {topActivities.map(([name, mins]) => (
            <li key={name} className="activity-item">
              <strong>{name}</strong>
              <span className="badge">{mins} min</span>
            </li>
          ))}
          {topActivities.length === 0 && <p className="muted">No physical activities logged in this timeframe.</p>}
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
          {topActivities.length === 0 && <p className="muted">No activity data to display.</p>}
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

      <section className="journey-card">
        <div className="section-header" style={{ marginBottom: '14px' }}>
          <div>
            <h3>🌱 Your Journey</h3>
            <p>Personalized observations and reflections based on recent activity.</p>
          </div>
        </div>
        <div className="journey-items">
          {observations.slice(0, 3).map((o, i) => (
            <div key={i} className="journey-item">
              <span className="journey-icon">✦</span>
              <p>{o}</p>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function Stat({ icon, label, value, note }: { icon: string; label: string; value: string; note: string }) {
  return <article className="summary-card summary-stat"><span>{icon}</span><div><p>{label}</p><strong>{value}</strong><small>{note}</small></div></article>;
}
