import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { patientApi, type NewPatientLog, type PatientLog } from '../lib/api';
import { useOutletContext } from 'react-router-dom';

type LogType = 'food' | 'medication' | 'activity' | 'sleep' | 'stress' | 'social' | 'habit';
type HealthLog = PatientLog;
type Medication = { name: string; dosage: string; unit: string };

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toTimeString().slice(0, 5);
const icons: Record<LogType, string> = { food: '🍽️', medication: '💊', activity: '🚶', sleep: '😴', stress: '🧠', social: '🤝', habit: '🌿' };
const labels: Record<LogType, string> = { food: 'Food', medication: 'Medication', activity: 'Physical Activity', sleep: 'Sleep', stress: 'Stress', social: 'Social', habit: 'Lifestyle Habits' };
const formatTime = (value: string) => new Date(`2000-01-01T${value}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function HomePage() {
  const { patientName } = useOutletContext<{ patientName: string }>();
  const firstName = patientName.trim().split(/\s+/)[0] || 'there';
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logError, setLogError] = useState('');
  const [chooserOpen, setChooserOpen] = useState(false);
  const [activeForm, setActiveForm] = useState<LogType | null>(null);
  const [customDialog, setCustomDialog] = useState(false);
  const [customActivity, setCustomActivity] = useState('');
  const [activities, setActivities] = useState(['Walking', 'Running', 'Cycling', 'Swimming', 'Hiking']);
  const [form, setForm] = useState({ date: today(), time: now(), meal: 'Breakfast', foods: [''], description: '', photo: '', medications: [{ name: '', dosage: '', unit: 'Tablet' }] as Medication[], activity: 'Walking', minutes: '30', calories: '', sleepTime: '22:30', wakeTime: '06:30', sleepQuality: 'Good' });

  const [stressOpen, setStressOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [habitOpen, setHabitOpen] = useState(false);

  useEffect(() => {
    let active = true;
    patientApi.getLogs()
      .then(({ logs: patientLogs }) => { if (active) setLogs(patientLogs); })
      .catch((error) => { if (active) setLogError(error instanceof Error ? error.message : 'Could not load health logs.'); })
      .finally(() => { if (active) setLogsLoading(false); });
    return () => { active = false; };
  }, []);

  const createLog = async (entry: NewPatientLog) => {
    setLogError('');
    try {
      const response = await patientApi.createLog(entry);
      setLogs(current => [...current, response.log]);
      return true;
    } catch (error) {
      setLogError(error instanceof Error ? error.message : 'Could not save this health log.');
      return false;
    }
  };

  const resetForm = () => setForm({ date: today(), time: now(), meal: 'Breakfast', foods: [''], description: '', photo: '', medications: [{ name: '', dosage: '', unit: 'Tablet' }], activity: activities[0], minutes: '30', calories: '', sleepTime: '22:30', wakeTime: '06:30', sleepQuality: 'Good' });
  const openForm = (type: LogType) => { resetForm(); setChooserOpen(false); setActiveForm(type); };
  const sleepDuration = useMemo(() => {
    const [sh, sm] = form.sleepTime.split(':').map(Number); const [wh, wm] = form.wakeTime.split(':').map(Number);
    let minutes = wh * 60 + wm - (sh * 60 + sm); if (minutes < 0) minutes += 1440;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }, [form.sleepTime, form.wakeTime]);
  const todayLogs = logs.filter(log => log.date === today()).sort((a, b) => a.time.localeCompare(b.time));

  const save = (event: FormEvent) => {
    event.preventDefault(); if (!activeForm) return;
    let title = ''; let detail = ''; let extra = '';
    let payload: Record<string, unknown> = {};
    if (activeForm === 'food') { const foods = form.foods.filter(Boolean); title = form.meal; detail = foods.join(' · ') || 'Food entry'; extra = form.description; payload = { mealType: form.meal, foodItems: foods, description: form.description }; }
    if (activeForm === 'medication') { const meds = form.medications.filter(m => m.name); title = 'Medication'; detail = meds.map(m => `${m.name}${m.dosage ? ` ${m.dosage} ${m.unit}` : ''}`).join(' · ') || 'Medication entry'; payload = { medications: meds }; }
    if (activeForm === 'activity') { title = form.activity; detail = `${form.minutes} minutes`; extra = form.calories ? `${form.calories} calories burned` : ''; payload = { activity: form.activity, minutes: Number(form.minutes), calories: form.calories ? Number(form.calories) : null }; }
    if (activeForm === 'sleep') { title = 'Sleep'; detail = `${formatTime(form.sleepTime)} → ${formatTime(form.wakeTime)}`; extra = `${sleepDuration} · Sleep quality: ${form.sleepQuality}`; payload = { sleepTime: form.sleepTime, wakeTime: form.wakeTime, duration: sleepDuration, quality: form.sleepQuality }; }
    void createLog({ type: activeForm, date: form.date, time: form.time, title, detail, extra, payload }).then(saved => { if (saved) setActiveForm(null); });
  };
  const set = (key: string, value: string) => setForm(current => ({ ...current, [key]: value }));
  const addCustomActivity = () => { const name = customActivity.trim(); if (name) { setActivities(current => [...current, name]); setForm(current => ({ ...current, activity: name })); } setCustomActivity(''); setCustomDialog(false); };

  // Gentle reminders
  const reminders = [
    '🍎 Try adding one extra serving of vegetables today.',
    '🚶 A short walk after meals may support healthy blood sugar.',
    '💧 Remember to stay hydrated throughout the day.',
    '😴 Consistent sleep schedules support better recovery.',
    '🧘 Even one minute of deep breathing can reduce stress.',
    '🤝 Reach out to someone you care about today.',
    '🌿 Small healthy choices repeated daily become lifelong habits.',
    '🍽️ Aim for colorful vegetables at one meal today.',
    '🚶 Try a 10-minute walk after lunch.',
    '💧 Keep a water bottle handy and sip throughout the day.',
    '🧠 Take a moment to notice one positive thing today.',
    '😌 Prioritize a consistent wind-down routine tonight.',
    '🫶 Share a kind message with a friend or family member.',
    '🌅 Morning light helps regulate sleep — get outside briefly.',
    '🫗 Consider a balanced snack if you feel low on energy.',
    '🧍 Stand and stretch for a couple minutes each hour.',
    '📅 Small planning helps reduce decision stress tomorrow.',
    '🫁 Try box breathing for one minute when stressed.',
    '🥦 Swap one processed snack for a whole-food alternative today.',
    '🎧 Listen to a short piece of music you enjoy to boost mood.'
  ];

  const [reminder, setReminder] = useState('');
  useEffect(() => {
    // choose random reminder, avoid repeating same within session if possible
    const last = sessionStorage.getItem('vitalsync_last_reminder');
    const avail = reminders.filter(r => r !== last);
    const pick = avail.length ? avail[Math.floor(Math.random() * avail.length)] : reminders[Math.floor(Math.random() * reminders.length)];
    setReminder(pick);
    sessionStorage.setItem('vitalsync_last_reminder', pick);
  }, []);

  return <section className="health-home">
    <div className="home-welcome"><div><p className="eyebrow">Your lifestyle medicine companion</p><h2>Good morning, {firstName}</h2><p>Small daily choices add up. How are you feeling today?</p></div><span className="status-chip">On your journey</span></div>
    {logError && <p className="login-error" role="alert">{logError}</p>}
    <section className="health-log-card" aria-labelledby="health-logs-title">
      <div className="health-log-header"><div><p className="eyebrow">Daily record</p><h2 id="health-logs-title">Today’s Health Logs</h2></div><button className="add-log-button" onClick={() => setChooserOpen(true)} aria-label="Add a health log">+</button></div>
      {logsLoading ? <div className="logs-empty"><h3>Loading health logs...</h3></div> : todayLogs.length === 0 ? <div className="logs-empty"><span>✦</span><h3>No logs yet for today.</h3><p>Capture a meal, medication, movement, or sleep to keep your care team informed.</p><button className="text-button" onClick={() => setChooserOpen(true)}>Add your first log</button></div> : <div className="log-timeline">{todayLogs.map(log => <article className="log-entry" key={log.id}><time>{formatTime(log.time)}</time><div className="log-entry__icon">{icons[log.type]}</div><div><p className="log-entry__type">{labels[log.type]}</p><h3>{log.title}</h3><p>{log.detail}</p>{log.extra && <small>{log.extra}</small>}</div></article>)}</div>}
    </section>
    <div className="lifestyle-tip"><span>✦</span><div><strong>Today’s gentle reminder</strong><p>{reminder}</p></div></div>

    {chooserOpen && <Modal title="What would you like to log?" onClose={() => setChooserOpen(false)}>
      <div className="chooser-section">
        <h4>Daily Health Logs</h4>
        <div className="log-options">{(['food', 'medication', 'activity', 'sleep'] as LogType[]).map(type => <button key={type} className="log-option" onClick={() => openForm(type)}><span>{icons[type]}</span><div><strong>{labels[type]}</strong><small>{type === 'food' ? 'Meals, snacks and notes' : type === 'medication' ? 'Medicine and dosage' : type === 'activity' ? 'Movement and exercise' : 'Your overnight rest'}</small></div><b>›</b></button>)}</div>
      </div>
      <div className="chooser-section">
        <h4>Lifestyle Reflections <small>Optional</small></h4>
        <div className="log-options">{(['stress','social','habit'] as LogType[]).map(type => <button key={type} className="log-option" onClick={() => { setChooserOpen(false); if (type === 'stress') setStressOpen(true); if (type === 'social') setSocialOpen(true); if (type === 'habit') setHabitOpen(true); }}><span>{type === 'stress' ? '🧠' : type === 'social' ? '🤝' : '🌿'}</span><div><strong>{type === 'stress' ? 'Stress' : type === 'social' ? 'Social Connectedness' : 'Lifestyle Habits'}</strong><small>{type === 'habit' ? 'Weekly habits questionnaire' : 'Optional reflection'}</small></div><b>›</b></button>)}</div>
      </div>
    </Modal>}

    {/* Stress reflection modal */}
    {stressOpen && <Modal title="Stress reflection" onClose={() => setStressOpen(false)}>{logError && <p className="login-error" role="alert">{logError}</p>}<StressModal onSave={async (entry) => { const saved = await createLog({ type: 'stress', date: entry.date || today(), time: entry.time || now(), title: entry.title || 'Stress reflection', detail: entry.detail || '', extra: entry.extra || '', payload: { reflection: entry.detail || '', notes: entry.extra || '' } }); if (saved) setStressOpen(false); }} onCancel={() => setStressOpen(false)} /></Modal>}

    {/* Social reflection modal */}
    {socialOpen && <Modal title="Social reflection" onClose={() => setSocialOpen(false)}>{logError && <p className="login-error" role="alert">{logError}</p>}<SocialModal onSave={async (entry) => { const saved = await createLog({ type: 'social', date: entry.date || today(), time: entry.time || now(), title: entry.title || 'Social reflection', detail: entry.detail || '', extra: entry.extra || '', payload: { reflection: entry.detail || '', notes: entry.extra || '' } }); if (saved) setSocialOpen(false); }} onCancel={() => setSocialOpen(false)} /></Modal>}

    {/* Lifestyle habits modal */}
    {habitOpen && <Modal title="Lifestyle habits" onClose={() => setHabitOpen(false)}>{logError && <p className="login-error" role="alert">{logError}</p>}<LifestyleHabitsModal onSave={async (entry) => { const saved = await createLog({ type: 'habit', date: today(), time: now(), title: 'Lifestyle habits', detail: entry.detail || '', extra: entry.extra || '', payload: { responses: entry.detail || '', notes: entry.extra || '' } }); if (saved) setHabitOpen(false); }} onCancel={() => setHabitOpen(false)} /></Modal>}
    {activeForm && <Modal title={`${labels[activeForm]} Log`} onClose={() => setActiveForm(null)}><form className="log-form" onSubmit={save}><div className="field-grid"><label>Date<input type="date" value={form.date} onChange={e => set('date', e.target.value)} /></label><label>Time<input type="time" value={form.time} onChange={e => set('time', e.target.value)} /></label></div>
      {activeForm === 'food' && <><label>Meal Type<select value={form.meal} onChange={e => set('meal', e.target.value)}>{['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(x => <option key={x}>{x}</option>)}</select></label><div className="entry-group"><div className="entry-group__heading"><label>Food Items</label><button type="button" className="text-button" onClick={() => setForm(x => ({ ...x, foods: [...x.foods, ''] }))}>+ Add Food Item</button></div>{form.foods.map((food, i) => <input key={i} type="text" value={food} placeholder="e.g. Chicken Adobo" aria-label={`Food item ${i + 1}`} onChange={e => setForm(x => ({ ...x, foods: x.foods.map((f, n) => n === i ? e.target.value : f) }))} />)}</div><label>Description<textarea value={form.description} placeholder="Portion sizes or additional notes" onChange={e => set('description', e.target.value)} /></label><label>Photo<input type="file" accept="image/*" onChange={(e: ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) set('photo', URL.createObjectURL(file)); }} /></label>{form.photo && <img className="photo-preview" src={form.photo} alt="Selected food" />}</>}
      {activeForm === 'medication' && <div className="entry-group"><div className="entry-group__heading"><label>Medication Entries</label><button type="button" className="text-button" onClick={() => setForm(x => ({ ...x, medications: [...x.medications, { name: '', dosage: '', unit: 'Tablet' }] }))}>+ Add Medication</button></div>{form.medications.map((med, i) => <div className="medication-entry" key={i}><label>Medicine Name<input type="text" value={med.name} onChange={e => setForm(x => ({ ...x, medications: x.medications.map((m, n) => n === i ? { ...m, name: e.target.value } : m) }))} /></label><label>Dosage<input type="number" min="0" value={med.dosage} onChange={e => setForm(x => ({ ...x, medications: x.medications.map((m, n) => n === i ? { ...m, dosage: e.target.value } : m) }))} /></label><label>Unit<select value={med.unit} onChange={e => setForm(x => ({ ...x, medications: x.medications.map((m, n) => n === i ? { ...m, unit: e.target.value } : m) }))}>{['Tablet','Capsule','mg','mcg','g','mL','Units','Drops','Puff','Patch','Injection','Other'].map(x => <option key={x}>{x}</option>)}</select></label>{form.medications.length > 1 && <button className="remove-entry" type="button" onClick={() => setForm(x => ({ ...x, medications: x.medications.filter((_, n) => n !== i) }))}>Remove</button>}</div>)}</div>}
      {activeForm === 'activity' && <><div className="activity-select"><label>Activity Type<select value={form.activity} onChange={e => set('activity', e.target.value)}>{activities.map(x => <option key={x}>{x}</option>)}</select></label><button type="button" className="small-add" onClick={() => setCustomDialog(true)} aria-label="Add custom activity">+</button></div><label>Minutes<input type="number" min="0" value={form.minutes} onChange={e => set('minutes', e.target.value)} /></label><label>Calories Burned <small>Optional</small><input type="number" min="0" value={form.calories} onChange={e => set('calories', e.target.value)} /></label></>}
      {activeForm === 'sleep' && <><div className="field-grid"><label>Sleep Time<input type="time" value={form.sleepTime} onChange={e => set('sleepTime', e.target.value)} /></label><label>Wake Time<input type="time" value={form.wakeTime} onChange={e => set('wakeTime', e.target.value)} /></label></div><label>Duration<input className="readonly-input" value={sleepDuration} readOnly /></label><label>Sleep Quality<select value={form.sleepQuality} onChange={e => set('sleepQuality', e.target.value)}>{['Poor', 'Fair', 'Good', 'Excellent'].map(value => <option key={value}>{value}</option>)}</select></label></>}
      {logError && <p className="login-error" role="alert">{logError}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setActiveForm(null)}>Cancel</button><button className="primary-button" disabled={logsLoading}>Save log</button></div></form></Modal>}
    {customDialog && <Modal title="Add custom activity" onClose={() => setCustomDialog(false)} compact><div className="log-form"><label>Activity name<input autoFocus type="text" value={customActivity} placeholder="e.g. Yoga" onChange={e => setCustomActivity(e.target.value)} /></label><div className="modal-actions"><button className="secondary-button" onClick={() => setCustomDialog(false)}>Cancel</button><button className="primary-button" onClick={addCustomActivity}>Add activity</button></div></div></Modal>}
  </section>;
}

function Modal({ title, onClose, children, compact = false }: { title: string; onClose: () => void; children: React.ReactNode; compact?: boolean }) { return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className={`health-modal${compact ? ' compact' : ''}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={e => e.stopPropagation()}><div className="modal-header"><h2>{title}</h2><button className="modal-close" onClick={onClose} aria-label="Close">×</button></div>{children}</section></div>; }

function StressModal({ onSave, onCancel }: { onSave: (entry: any) => void; onCancel: () => void }) {
  const [mode, setMode] = useState<'express' | 'guided'>('express');
  const [expressText, setExpressText] = useState('');
  const [answers, setAnswers] = useState(['', '', '', '', '']);
  const save = () => {
    if (mode === 'express') onSave({ detail: expressText }); else onSave({ detail: answers.join(' || ') });
  };
  return <div className="log-form"><div className="segmented"><button className={`seg ${mode==='express'?'active':''}`} onClick={() => setMode('express')}>Express Yourself</button><button className={`seg ${mode==='guided'?'active':''}`} onClick={() => setMode('guided')}>Guided Reflection</button></div>{mode === 'express' ? <label>Share<textarea value={expressText} placeholder="Describe anything that has been stressful recently..." onChange={e => setExpressText(e.target.value)} /></label> : <div><label>What has been your biggest source of stress recently?<input value={answers[0]} onChange={e => setAnswers(a => a.map((v,i)=>i===0?e.target.value:v))} /></label><label>How has this affected your daily life?<input value={answers[1]} onChange={e => setAnswers(a => a.map((v,i)=>i===1?e.target.value:v))} /></label><label>What helped you cope?<input value={answers[2]} onChange={e => setAnswers(a => a.map((v,i)=>i===2?e.target.value:v))} /></label><label>Is there anything you wish had gone differently?<input value={answers[3]} onChange={e => setAnswers(a => a.map((v,i)=>i===3?e.target.value:v))} /></label><label>Is there anything you would like your healthcare team to know?<input value={answers[4]} onChange={e => setAnswers(a => a.map((v,i)=>i===4?e.target.value:v))} /></label></div>}<div className="modal-actions"><button className="secondary-button" onClick={onCancel}>Cancel</button><button className="primary-button" onClick={save}>Save</button></div></div>;
}

function SocialModal({ onSave, onCancel }: { onSave: (entry: any) => void; onCancel: () => void }) {
  const [mode, setMode] = useState<'express' | 'guided'>('express');
  const [expressText, setExpressText] = useState('');
  const [answers, setAnswers] = useState(['', '', '', '', '']);
  const save = () => {
    if (mode === 'express') onSave({ detail: expressText }); else onSave({ detail: answers.join(' || ') });
  };
  return <div className="log-form"><div className="segmented"><button className={`seg ${mode==='express'?'active':''}`} onClick={() => setMode('express')}>Express Yourself</button><button className={`seg ${mode==='guided'?'active':''}`} onClick={() => setMode('guided')}>Guided Reflection</button></div>{mode === 'express' ? <label>Share<textarea value={expressText} placeholder="Share anything about your relationships or social life..." onChange={e => setExpressText(e.target.value)} /></label> : <div><label>Who have you spent meaningful time with recently?<input value={answers[0]} onChange={e => setAnswers(a => a.map((v,i)=>i===0?e.target.value:v))} /></label><label>Have you felt emotionally supported?<input value={answers[1]} onChange={e => setAnswers(a => a.map((v,i)=>i===1?e.target.value:v))} /></label><label>Have you participated in any social activities?<input value={answers[2]} onChange={e => setAnswers(a => a.map((v,i)=>i===2?e.target.value:v))} /></label><label>Is there anyone you would like to reconnect with?<input value={answers[3]} onChange={e => setAnswers(a => a.map((v,i)=>i===3?e.target.value:v))} /></label><label>Is there anything affecting your relationships that you'd like to share?<input value={answers[4]} onChange={e => setAnswers(a => a.map((v,i)=>i===4?e.target.value:v))} /></label></div>}<div className="modal-actions"><button className="secondary-button" onClick={onCancel}>Cancel</button><button className="primary-button" onClick={save}>Save</button></div></div>;
}

function LifestyleHabitsModal({ onSave, onCancel }: { onSave: (entry: any) => void; onCancel: () => void }) {
  const habits = ['Alcohol', 'Cigarettes', 'Vape', 'Gambling', 'Recreational drugs'];
  const options = ['Never', 'Once', 'Occasionally', 'Frequently'];
  const [values, setValues] = useState<string[]>(habits.map(() => 'Never'));
  const [otherChecked, setOtherChecked] = useState(false);
  const [otherText, setOtherText] = useState('');
  const save = () => {
    const detail = habits.map((h, i) => `${h}: ${values[i]}`).join(' · ');
    const extra = otherChecked ? `Other: ${otherText}` : '';
    onSave({ detail, extra });
  };
  return <div className="log-form"><p className="form-note">During the past week...</p>{habits.map((h, i) => <div className="habit-row" key={h}><label>{h}</label><div className="habit-options">{options.map(opt => <label key={opt}><input type="radio" name={`habit-${i}`} checked={values[i]===opt} onChange={() => setValues(v => v.map((x,idx)=>idx===i?opt:x))} /> {opt}</label>)}</div></div>)}<label className="other-check"><input type="checkbox" checked={otherChecked} onChange={e => setOtherChecked(e.target.checked)} /> Is there another lifestyle habit you would like your healthcare team to know about?</label>{otherChecked && <label>Describe<textarea value={otherText} onChange={e => setOtherText(e.target.value)} /></label>}<div className="modal-actions"><button className="secondary-button" onClick={onCancel}>Cancel</button><button className="primary-button" onClick={save}>Save</button></div></div>;
}
