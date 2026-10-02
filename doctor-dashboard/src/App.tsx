import { useState } from 'react'
import './App.css'
import './PrototypeExtras.css'
import './PrototypeExtras.addons.css'
import { DoctorProfileCard } from './components/DoctorProfileCard'
import { DoctorProfilePage } from './components/DoctorProfilePage'
import { DoctorSettingsPage } from './components/DoctorSettingsPage'
import DoctorPicker from './components/DoctorPicker'
import { LoginPage } from './components/LoginPage'
import type { Doctor } from './types/doctor'
import type { DoctorAccount } from './types/doctorAccount'
import type { Range } from './types/range'
import type { Patient } from './types/patient'
import RecentActivitySummary from './components/RecentActivitySummary'
import { evaluateGoal, type EvaluationType, type GoalFrequency } from './lib/goalEvaluator'

// ... (constants and types remain unchanged, assume they are present)
// Skipping replacing the whole file content due to size. I will carefully replace the imports and App function.

type ProviderGoal = {
  id: number
  patientUniqueId: string
  title: string
  category: string
  target: string
  frequency: GoalFrequency
  startDate: string
  reviewDate: string
  instructions: string
  status: 'Active' | 'Paused' | 'Completed' | 'Cancelled'
  progressPercent: number
  assignedBy: string
  evaluationType?: EvaluationType
  targetValue?: number
  targetUnit?: string
  metricKey?: string
}

const providerGoalStorageKey = 'vitalsync_provider_goals_v1'
const providerGoalTemplates = [
  { id: 'eat-veg', title: 'Eat more vegetables', category: 'Nutrition', target: '1 serving', frequency: 'Daily', evaluationType: 'indicator' as const, targetValue: 1, metricKey: 'food' },
  { id: 'drink-water', title: 'Drink more water', category: 'Nutrition', target: '8 glasses', frequency: 'Daily', evaluationType: 'indicator' as const, targetValue: 1, metricKey: 'food' },
  { id: 'walk-every-day', title: 'Walk every day', category: 'Physical Activity', target: '30 minutes', frequency: 'Daily', evaluationType: 'duration' as const, targetValue: 30, metricKey: 'activity' },
  { id: 'improve-sleep', title: 'Improve sleep schedule', category: 'Sleep', target: '7 hours', frequency: 'Daily', evaluationType: 'duration' as const, targetValue: 7, metricKey: 'sleep' },
  { id: 'stress-management', title: 'Practice stress management', category: 'Stress', target: '10 minutes', frequency: 'Daily', evaluationType: 'reflection' as const, targetValue: 1, metricKey: 'stress' },
  { id: 'social-time', title: 'Spend quality time', category: 'Social Connectedness', target: '3 times', frequency: 'Weekly', evaluationType: 'reflection' as const, targetValue: 3, metricKey: 'social' },
  { id: 'custom', title: 'Build My Own Goal', category: 'Other', target: '', frequency: 'Daily', evaluationType: 'none' as const },
]

const readProviderGoals = (): ProviderGoal[] => {
  try { return JSON.parse(localStorage.getItem(providerGoalStorageKey) ?? '[]') as ProviderGoal[] } catch { return [] }
}

const followUpPriority = (followUpDate: string): Patient['priority'] => {
  const days = Math.ceil((new Date(`${followUpDate}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000)
  return days < 0 ? 'High' : days <= 3 ? 'Medium' : 'Low'
}

const initialPatients: Patient[] = [
  { id: 1, name: 'Maria Santos', initials: 'MS', age: 54, residence: 'Buhangin, Davao City', care: 'Diabetic care', phone: '+63 917 123 4567', email: 'maria.santos@email.com', detail: 'Missed sleep log yesterday', status: 'Needs attention', priority: 'High', type: 'Out-patient', color: '#f1a2a1', followUpDate: '2026-08-12', uniqueId: 'VS-0001', active: true, visibility: 'Assigned Only' , managingDoctor: 'Dr. Jamie Dizon'  },
  { id: 2, name: 'John Dela Cruz', initials: 'JD', age: 47, residence: 'Matina, Davao City', care: 'Hypertension management', phone: '+63 917 234 5678', email: 'john.delacruz@email.com', detail: 'Submitted today at 8:14 AM', status: 'On track', priority: 'Low', type: 'Out-patient', color: '#9bc7bd', followUpDate: '2026-08-25', uniqueId: 'VS-0002', active: true, visibility: 'Selected Doctors' , managingDoctor: 'Dr. Rafael Lopez' },
  { id: 3, name: 'Alyssa Reyes', initials: 'AR', age: 36, residence: 'Lanang, Davao City', care: 'Post-op recovery', phone: '+63 917 345 6789', email: 'alyssa.reyes@email.com', detail: 'Low activity for 3 days', status: 'Follow up', priority: 'Medium', type: 'In-patient', color: '#c3b8e6', followUpDate: '2026-08-17', uniqueId: 'VS-0003', active: true, visibility: 'All Doctors' , managingDoctor: 'Dr. Ana Cruz' },
  { id: 4, name: 'Paolo Garcia', initials: 'PG', age: 61, residence: 'Talomo, Davao City', care: 'Cardiac rehabilitation', phone: '+63 917 456 7890', email: 'paolo.garcia@email.com', detail: 'Submitted today at 7:42 AM', status: 'On track', priority: 'Medium', type: 'Out-patient', color: '#f4ca8c', followUpDate: '2026-08-18', uniqueId: 'VS-0004', active: true, visibility: 'Assigned Only' , managingDoctor: 'Dr. Jamie Dizon' },
  { id: 5, name: 'Bianca Lim', initials: 'BL', age: 29, residence: 'Ecoland, Davao City', care: 'Weight management', phone: '+63 917 567 8901', email: 'bianca.lim@email.com', detail: 'Logged a 25-min walk today', status: 'On track', priority: 'Low', type: 'Out-patient', color: '#a9d5db', followUpDate: '2026-08-30', uniqueId: 'VS-0005', active: false, visibility: 'Assigned Only', managingDoctor: 'Dr. Jamie Dizon' },
]

const doctors: Doctor[] = [
  { id: 101, name: 'Dr. Jamie Dizon', initials: 'JD', color: '#f9c6c6' },
  { id: 102, name: 'Dr. Rafael Lopez', initials: 'RL', color: '#c6e1f9' },
  { id: 103, name: 'Dr. Ana Cruz', initials: 'AC', color: '#d6f9d6' },
]

const doctorAccountStorageKey = 'vitalsync_doctor_accounts_v1'
const defaultDoctorAccounts: DoctorAccount[] = [
  { id: 101, name: 'Dr. Jamie Dizon', email: 'jamie@vitalsync.com', password: 'clinic123', specialty: 'Lifestyle Medicine', initials: 'JD', color: '#f9c6c6' },
  { id: 102, name: 'Dr. Rafael Lopez', email: 'rafael@vitalsync.com', password: 'clinic123', specialty: 'Cardiology', initials: 'RL', color: '#c6e1f9' },
  { id: 103, name: 'Dr. Ana Cruz', email: 'ana@vitalsync.com', password: 'clinic123', specialty: 'Rehab', initials: 'AC', color: '#d6f9d6' },
]
const readDoctorAccounts = (): DoctorAccount[] => {
  try {
    const stored = localStorage.getItem(doctorAccountStorageKey)
    if (!stored) return defaultDoctorAccounts
    const parsed = JSON.parse(stored) as DoctorAccount[]
    return parsed.length ? parsed : defaultDoctorAccounts
  } catch {
    return defaultDoctorAccounts
  }
}

const activities = [
  ['John Dela Cruz', 'logged breakfast', '8:14 AM', '⌁', 'meal'], ['Paolo Garcia', 'logged 7h 30m of sleep', '7:42 AM', '☾', 'sleep'],
  ['Bianca Lim', 'logged a 25-min walk', '7:21 AM', '↗', 'walk'], ['Maria Santos', 'updated her dinner log', 'Yesterday, 8:46 PM', '⌁', 'meal'],
  ['Alyssa Reyes', 'completed a well-being check-in', 'Yesterday, 6:15 PM', '◌', 'check'], ['John Dela Cruz', 'logged a 30-min walk', 'Monday, 5:20 PM', '↗', 'walk'],
]

const monitoringHistory: Record<number, { focus: string; period: string; clinician: string; status: 'Current' | 'Completed'; note: string; adherence: string }[]> = {
  1: [{ focus: 'Diabetic care', period: 'May 12, 2026 - Present', clinician: 'Dr. Jamie Dizon', status: 'Current', note: 'Daily nutrition, sleep, and activity monitoring.', adherence: '82% average adherence' }, { focus: 'Hypertension management', period: 'Jan 08, 2026 - Apr 30, 2026', clinician: 'Dr. Rafael Lopez', status: 'Completed', note: 'Lifestyle intervention and blood-pressure habit tracking.', adherence: '88% average adherence' }],
  2: [{ focus: 'Hypertension management', period: 'Jun 02, 2026 - Present', clinician: 'Dr. Jamie Dizon', status: 'Current', note: 'Nutrition and activity monitoring plan.', adherence: '91% average adherence' }],
  3: [{ focus: 'Post-op recovery', period: 'Jul 02, 2026 - Present', clinician: 'Dr. Jamie Dizon', status: 'Current', note: 'Gradual activity and sleep recovery plan.', adherence: '68% average adherence' }],
  4: [{ focus: 'Cardiac rehabilitation', period: 'Apr 11, 2026 - Present', clinician: 'Dr. Jamie Dizon', status: 'Current', note: 'Cardiac-safe activity and nutrition follow-up.', adherence: '86% average adherence' }],
  5: [{ focus: 'Weight management', period: 'May 27, 2026 - Present', clinician: 'Dr. Jamie Dizon', status: 'Current', note: 'Balanced nutrition and activity habit building.', adherence: '79% average adherence' }],
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [active, setActive] = useState('Registry')
  const [records, setRecords] = useState<Patient[]>(initialPatients)
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null)
  const [range, setRange] = useState<Range>('Today')
  const [activityRange, setActivityRange] = useState<Range>('Today')
  const [showAllActivity, setShowAllActivity] = useState(false)
  const [contactPatient, setContactPatient] = useState<Patient | null>(null)
  const [formPatient, setFormPatient] = useState<Patient | null | 'new'>(null)
  const [showAddPatient, setShowAddPatient] = useState(false)
  const [pendingPatient, setPendingPatient] = useState<Patient | null>(null)
  const [messagePatientId, setMessagePatientId] = useState<number>(1)
  const [historyPatientId, setHistoryPatientId] = useState<number>(1)
  const [reminders, setReminders] = useState<number[]>([])
  const [copied, setCopied] = useState(false)
  const [notice, setNotice] = useState('')
  const [providerGoals, setProviderGoals] = useState<ProviderGoal[]>(readProviderGoals)
  const [doctorAccounts, setDoctorAccounts] = useState<DoctorAccount[]>(readDoctorAccounts)
  const [currentDoctor, setCurrentDoctor] = useState<DoctorAccount>(() => defaultDoctorAccounts[0])

  const notify = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2600) }
  const selectedPatient = records.find((patient) => patient.id === selectedPatientId) ?? null
  const messagePatient = records.find((patient) => patient.id === messagePatientId) ?? records[0]
  const goToPatient = (patient: Patient) => { setActive('Overview'); setSelectedPatientId(patient.id); window.scrollTo(0, 0) }
  const toggleReminder = (patient: Patient) => {
    const exists = reminders.includes(patient.id)
    setReminders(exists ? reminders.filter((id) => id !== patient.id) : [...reminders, patient.id])
    notify(exists ? `Reminder turned off for ${patient.name}.` : `Daily reminder set for ${patient.name}.`)
  }
  const openMessages = (patient: Patient) => { setMessagePatientId(patient.id); setContactPatient(null); setActive('Messages'); notify(`Opened your conversation with ${patient.name}.`) }
  const savePatient = (patient: Patient, isNew: boolean) => {
    setRecords((current) => isNew ? [...current, patient] : current.map((item) => item.id === patient.id ? patient : item))
    setSelectedPatientId(patient.id); setFormPatient(null); notify(isNew ? `${patient.name} was added to your patients.` : `${patient.name}'s profile was updated.`)
  }
  const addNewPatient = (name: string, email: string, phone?: string) => {
    const id = Math.max(...records.map((item) => item.id)) + 1
    const initials = name.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'NP'
    const patient: Patient = { id, name, initials, age: 0, residence: 'Not specified', care: 'General lifestyle care', phone: phone ?? '+63 917 000 0000', email, detail: 'Newly added patient', status: 'On track', priority: 'Low', type: 'Out-patient', color: '#b8d5c9', assignedSince: '2026-08-15', followUpDate: '2026-08-30', uniqueId: `VS-${String(id).padStart(4, '0')}`, active: true, visibility: 'Assigned Only', managingDoctor: undefined }
    setRecords((current) => [...current, patient]); setShowAddPatient(false); notify(`${patient.name} was added to active monitoring.`)
  }
  const reactivatePatient = (uniqueId: string) => {
    const patient = records.find((item) => item.uniqueId.toLowerCase() === uniqueId.trim().toLowerCase())
    if (!patient) return notify('No patient account matches that Unique ID.')
    if (patient.active) return notify(`${patient.name} is already in active monitoring.`)
    setRecords((current) => current.map((item) => item.id === patient.id ? { ...item, active: true } : item)); setShowAddPatient(false); notify(`${patient.name} was re-added to active monitoring.`)
  }

  const updateFollowUpDate = (id: number, newDate: string) => {
    setRecords((current) => current.map((item) => item.id === id ? { ...item, followUpDate: newDate, priority: followUpPriority(newDate) } : item))
    notify('Follow-up date updated.')
  }

  const updatePatientVisibility = (id: number, visibility: Patient['visibility'], selectedDoctors?: number[]) => {
    setRecords((current) => current.map((item) => item.id === id ? { ...item, visibility, ...(selectedDoctors ? { selectedDoctors } : {}) } : item))
  }
  const archivePatient = (patient: Patient) => {
    setRecords((current) => {
      const next = current.map((item) => item.id === patient.id ? { ...item, active: false } : item)
      return next
    })
    returnToRegistry(); notify(`${patient.name}'s monitoring was archived. Their account and history remain available.`)
  }
  const returnToRegistry = () => { setSelectedPatientId(null); setActive('Registry'); window.scrollTo(0, 0) }
  const handleLogout = () => { setIsLoggedIn(false); setSelectedPatientId(null); setActive('Registry') }
  const selectNav = (item: string) => { setActive(item); notify(`${item} prototype view selected`) }
  const saveProviderGoals = (goals: ProviderGoal[]) => { setProviderGoals(goals); localStorage.setItem(providerGoalStorageKey, JSON.stringify(goals)) }
  const handleDoctorLogin = (email: string, password: string): boolean => {
    const account = doctorAccounts.find((item) => item.email.toLowerCase() === email.trim().toLowerCase() && item.password === password)
    if (!account) return false
    setCurrentDoctor(account)
    setIsLoggedIn(true)
    setActive('Registry')
    return true
  }
  const handleCreateDoctorAccount = (account: { name: string; email: string; password: string; specialty: string }): boolean => {
    const trimmedName = account.name.trim()
    const trimmedEmail = account.email.trim()
    if (!trimmedName || !trimmedEmail || !account.password.trim()) return false
    const duplicate = doctorAccounts.some((item) => item.email.toLowerCase() === trimmedEmail.toLowerCase())
    if (duplicate) return false
    const newAccount: DoctorAccount = {
      id: Date.now(),
      name: trimmedName,
      email: trimmedEmail,
      password: account.password,
      specialty: account.specialty.trim() || 'Lifestyle Medicine',
      initials: trimmedName.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'DR',
      color: '#d9ecf1',
    }
    const nextAccounts = [...doctorAccounts, newAccount]
    setDoctorAccounts(nextAccounts)
    localStorage.setItem(doctorAccountStorageKey, JSON.stringify(nextAccounts))
    setCurrentDoctor(newAccount)
    return true
  }
  if (!isLoggedIn) return <LoginPage onLogin={handleDoctorLogin} onCreateDoctor={handleCreateDoctorAccount} />
  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">✦</span><span>VitalSync</span></div>
      <p className="workspace-label">CLINIC WORKSPACE</p>
      <nav className="mode-nav">
        {selectedPatient ? (
          <>
            <button className="nav-item" onClick={returnToRegistry}>Return to Registry</button>
            <button className={active === 'Overview' ? 'nav-item active' : 'nav-item'} onClick={() => setActive('Overview')}>Overview</button>
            <button className={active === 'Messages' ? 'nav-item active' : 'nav-item'} onClick={() => setActive('Messages')}>Messages</button>
            <button className={active === 'Goals' ? 'nav-item active' : 'nav-item'} onClick={() => setActive('Goals')}>Goals</button>
            <button className={active === 'History' ? 'nav-item active' : 'nav-item'} onClick={() => setActive('History')}>History</button>
          </>
        ) : (
          <>
            <button className={active === 'Registry' ? 'nav-item active' : 'nav-item'} onClick={returnToRegistry}>Patient Registry</button>
            <button className={active === 'Team' ? 'nav-item active' : 'nav-item'} onClick={() => setActive('Team')}>Team</button>
          </>
        )}
      </nav>
      <div className="sidebar-footer"><DoctorProfileCard initials={currentDoctor.initials} name={currentDoctor.name} specialty={currentDoctor.specialty} onProfile={() => selectNav('Profile')} onSettings={() => selectNav('Settings')} onLogout={handleLogout} /></div>
    </aside>
    <section className="workspace">
    {active === 'Profile' ? <DoctorProfilePage /> : active === 'Settings' ? <DoctorSettingsPage /> : active === 'Team' && !selectedPatient ? <TeamView doctors={doctors} /> : selectedPatient ? <PatientWorkspace patient={selectedPatient} active={active} providerGoals={providerGoals.filter((goal) => goal.patientUniqueId === selectedPatient.uniqueId)} currentDoctorName={currentDoctor.name} onSaveProviderGoals={saveProviderGoals} onReturn={returnToRegistry} onContact={() => setContactPatient(selectedPatient)} onReminder={() => toggleReminder(selectedPatient)} reminderSet={reminders.includes(selectedPatient.id)} onEdit={() => setFormPatient(selectedPatient)} onArchive={() => archivePatient(selectedPatient)} onMessageSelect={setMessagePatientId} onHistorySelect={setHistoryPatientId} onUpdateFollowUp={updateFollowUpDate} onUpdateVisibility={updatePatientVisibility} doctors={doctors} activities={activities} /> : <PatientRegistry patients={records} onRequestOpen={setPendingPatient} onAdd={() => setShowAddPatient(true)} />}
      {false && <>
        <header className="topbar"><div><p className="eyebrow">TUESDAY, JULY 31</p><h1>Good morning, Dr. Dizon</h1></div><div className="top-actions"><button className="icon-button" onClick={() => notify('No new notifications.')}>♧<span className="notification-dot" /></button><button className="primary" onClick={() => notify('Patient enrollment form would open here.')}>+ Add patient</button></div></header>
        {active === 'Overview' ? <Overview patients={records} range={range} setRange={setRange} activityRange={activityRange} setActivityRange={setActivityRange} onPatients={() => selectNav('Patients')} onProfile={goToPatient} onAllActivity={() => setShowAllActivity(true)} reminders={reminders} onReminder={toggleReminder} /> : active === 'Messages' ? <MessagesView patients={records} selected={messagePatient} onSelect={setMessagePatientId} /> : active === 'History' ? <HistoryView patients={records} selectedId={historyPatientId} onSelect={setHistoryPatientId} /> : <EmptyView name={active} />}
      </>}
    </section>
    {showAllActivity && <ActivityModal range={activityRange} setRange={setActivityRange} onClose={() => setShowAllActivity(false)} />}
    {contactPatient && <ContactModal patient={contactPatient} copied={copied} onMessage={() => openMessages(contactPatient)} onCopy={() => { setCopied(true); navigator.clipboard?.writeText(contactPatient.email); notify('Email address copied.'); window.setTimeout(() => setCopied(false), 1600) }} onClose={() => setContactPatient(null)} />}
    {formPatient && <PatientForm patient={formPatient === 'new' ? null : formPatient} nextId={Math.max(...records.map((item) => item.id)) + 1} onSave={savePatient} onClose={() => setFormPatient(null)} />}
    {showAddPatient && <AddPatientModal patients={records} onNew={addNewPatient} onExisting={reactivatePatient} onClose={() => setShowAddPatient(false)} />}
    {pendingPatient && <OpenPatientModal patient={pendingPatient} onOpen={() => { goToPatient(pendingPatient); setPendingPatient(null) }} onClose={() => setPendingPatient(null)} />}
    {notice && <div className="toast">{notice}</div>}
  </main>
}

function Overview({ patients, range, setRange, activityRange, setActivityRange, onPatients, onProfile, onAllActivity, reminders, onReminder }: { patients: Patient[]; range: Range; setRange: (x: Range) => void; activityRange: Range; setActivityRange: (x: Range) => void; onPatients: () => void; onProfile: (p: Patient) => void; onAllActivity: () => void; reminders: number[]; onReminder: (p: Patient) => void }) {
  const compliance = range === 'Today' ? 80 : range === 'Past 3 days' ? 77 : range === 'Past week' ? 82 : 79
  const recent = activityRange === 'Today' ? activities.slice(0, 3) : activityRange === 'Past 3 days' ? activities.slice(0, 4) : activities.slice(0, 5)
  return <>
    <section className="summary-grid" aria-label="Patient summary"><Summary icon="♙" color="blue" label="Active patients" value={String(patients.length)} detail="All currently monitored" /><Summary icon="!" color="amber" label="Needs attention" value="2" detail="1 new today" /><Summary icon="✓" color="green" label="Logged today" value="4" detail="80% completion" /><Summary icon="↗" color="violet" label="Avg. compliance" value="82%" detail="↑ 6% from last week" /></section>
    <section className="content-grid">
      <article className="panel patient-panel"><PanelTitle title="Patient overview" subtitle="Patients requiring your attention" action="View all" onAction={onPatients} /><div className="patient-list">{patients.map((patient) => <PatientRow patient={patient} onClick={() => onProfile(patient)} key={patient.id} />)}</div></article>
      <article className="panel compliance-panel"><PanelTitle title="Today’s compliance" subtitle={`${range === 'Today' ? '4 of 5' : 'Average across 5'} patients have logged`} /><RangeSelect value={range} setValue={setRange} /><div className="ring-wrap"><div className="ring" style={{ background: `conic-gradient(var(--teal) 0deg ${compliance * 3.6}deg, #e8eff1 ${compliance * 3.6}deg)` }}><div><strong>{compliance}%</strong><span>complete</span></div></div></div><div className="legend"><span><i className="legend-dot done" />Completed <b>{Math.round(compliance / 20)}</b></span><span><i className="legend-dot pending" />Pending <b>{5 - Math.round(compliance / 20)}</b></span></div></article>
      <article className="panel activity-panel"><PanelTitle title="Recent activity" subtitle={`Latest patient submissions · ${activityRange}`} action="View all" onAction={onAllActivity} /><RangeSelect value={activityRange} setValue={setActivityRange} /><div className="activity-list">{recent.slice(0, 3).map((a) => <Activity key={a[0] + a[2]} item={a} />)}</div></article>
      <article className="panel alert-panel"><div className="alert-title"><span>!</span><div><h2>Priority alerts</h2><p>2 patients need follow-up</p></div></div>{[patients[0], patients[2]].map((patient) => <div className="alert-entry" key={patient.id}><div><strong>{patient.name}</strong><p>{patient.id === 1 ? 'Missed 2 consecutive daily logs' : 'Activity has decreased this week'}</p></div><div className="alert-actions"><button onClick={() => onReminder(patient)}>{reminders.includes(patient.id) ? 'Reminder set' : 'Set reminder'}</button><button onClick={() => onProfile(patient)}>See profile</button></div></div>)}</article>
    </section>
  </>
}

export function PatientsView({ patients, selected, onSelect, onContact, onReminder, reminders, onBack, onAdd, onEdit, onUpdateFollowUp, onUpdateVisibility, doctors, activities }: { patients: Patient[]; selected: Patient | null; onSelect: (p: Patient) => void; onContact: (p: Patient) => void; onReminder: (p: Patient) => void; reminders: number[]; onBack: () => void; onAdd: () => void; onEdit: () => void; onUpdateFollowUp?: (id: number, d: string) => void; onUpdateVisibility?: (id: number, v: Patient['visibility'], s?: number[]) => void; doctors?: Doctor[]; activities?: string[][] }) {
  return <>
    <header className="patients-header"><div><p className="eyebrow">PATIENT MANAGEMENT</p><h1>Patients</h1><p className="header-copy">Monitor patient lifestyle progress and follow up when needed.</p></div><button className="primary" onClick={onAdd}>+ Add patient</button></header>
    <div className={selected ? 'patients-layout profile-open' : 'patients-layout'}>
      <aside className="patient-directory"><div className="directory-heading"><strong>All patients</strong><span>{patients.length}</span></div><div className="directory-search">⌕ <span>Search patients</span></div><div className="directory-list">{patients.map((p) => <button className={selected?.id === p.id ? 'directory-item selected' : 'directory-item'} onClick={() => onSelect(p)} key={p.id}><span className="avatar" style={{ background: p.color }}>{p.initials}</span><span><strong>{p.name}</strong><small>{p.care}</small><em className={`priority ${p.priority.toLowerCase()}`}>{p.priority}</em><em className="patient-type">{p.type}</em></span></button>)}</div></aside>
      {selected ? <PatientProfile patient={selected} onContact={() => onContact(selected)} onReminder={() => onReminder(selected)} reminderSet={reminders.includes(selected.id)} onBack={onBack} onEdit={onEdit} onArchive={() => undefined} onUpdateFollowUp={onUpdateFollowUp ?? (() => {})} onUpdateVisibility={onUpdateVisibility ?? (() => {})} doctors={doctors ?? []} activities={activities ?? []} /> : <div className="select-patient"><div className="select-icon">♙</div><h2>Select a patient</h2><p>Choose a patient from the list to view their profile and lifestyle progress.</p></div>}
    </div>
  </>
}

function PatientRegistry({ patients, onRequestOpen, onAdd }: { patients: Patient[]; onRequestOpen: (patient: Patient) => void; onAdd: () => void }) {
  const [tab, setTab] = useState<Patient['type']>('Out-patient')
  const [query, setQuery] = useState('')
  const activePatients = patients.filter((patient) => patient.active && patient.type === tab && patient.name.toLowerCase().includes(query.trim().toLowerCase())).map((patient) => ({ ...patient, priority: followUpPriority(patient.followUpDate) })).sort((a, b) => ({ High: 0, Medium: 1, Low: 2 }[a.priority] - { High: 0, Medium: 1, Low: 2 }[b.priority]))
  return <section className="registry-page"><header className="patients-header"><div><p className="eyebrow">PATIENT REGISTRY</p><h1>Active Patients</h1><p className="header-copy">Review active lifestyle-monitoring patients and open their clinical workspace.</p></div><button className="primary" onClick={onAdd}>+ Add patient</button></header><div className="registry-controls"><div className="registry-tabs"><button className={tab === 'Out-patient' ? 'active' : ''} onClick={() => setTab('Out-patient')}>Outpatient</button><button className={tab === 'In-patient' ? 'active' : ''} onClick={() => setTab('In-patient')}>Inpatient</button></div><input aria-label="Search patients by name" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patients by name" /></div><div className="registry-list">{activePatients.map((patient) => <button className={`registry-card ${patient.priority.toLowerCase()}`} key={patient.id} onClick={() => onRequestOpen(patient)}><span className="avatar" style={{ background: patient.color }}>{patient.initials}</span><span><strong>{patient.name}</strong><small>{patient.uniqueId}</small><small>{patient.email}</small></span><em>{patient.priority}</em></button>)}{activePatients.length === 0 && <div className="registry-empty">No active {tab === 'In-patient' ? 'inpatients' : 'outpatients'} match this search.</div>}</div></section>
}

function PatientWorkspace({ patient, active, providerGoals, currentDoctorName, onSaveProviderGoals, onReturn, onContact, onReminder, reminderSet, onEdit, onArchive, onMessageSelect, onHistorySelect, onUpdateFollowUp, onUpdateVisibility, doctors, activities }: { patient: Patient; active: string; providerGoals: ProviderGoal[]; currentDoctorName: string; onSaveProviderGoals: (goals: ProviderGoal[]) => void; onReturn: () => void; onContact: () => void; onReminder: () => void; reminderSet: boolean; onEdit: () => void; onArchive: () => void; onMessageSelect: (id: number) => void; onHistorySelect: (id: number) => void; onUpdateFollowUp: (id: number, newDate: string) => void; onUpdateVisibility: (id: number, v: Patient['visibility'], selected?: number[]) => void; doctors: Doctor[]; activities: string[][] }) {
  if (active === 'Messages') return <MessagesView patients={[patient]} selected={patient} onSelect={onMessageSelect} />
  if (active === 'Goals') return <PatientGoalsView patient={patient} goals={providerGoals} currentDoctorName={currentDoctorName} onSave={onSaveProviderGoals} />
  if (active === 'History') return <HistoryView patients={[patient]} selectedId={patient.id} onSelect={onHistorySelect} />
  return <PatientProfile patient={patient} onContact={onContact} onReminder={onReminder} reminderSet={reminderSet} onBack={onReturn} onEdit={onEdit} onArchive={onArchive} onUpdateFollowUp={onUpdateFollowUp} onUpdateVisibility={onUpdateVisibility} doctors={doctors} activities={activities} />
}

function PatientGoalsView({ patient, goals, currentDoctorName, onSave }: { patient: Patient; goals: ProviderGoal[]; currentDoctorName: string; onSave: (goals: ProviderGoal[]) => void }) {
  const [templateOpen, setTemplateOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<typeof providerGoalTemplates[number] | null>(null)
  const [menuGoalId, setMenuGoalId] = useState<number | null>(null)
  const [editingGoal, setEditingGoal] = useState<ProviderGoal | null>(null)
  const activeGoals = goals.filter((goal) => goal.status === 'Active' || goal.status === 'Paused')
  const updateGoal = (goalId: number, changes: Partial<ProviderGoal>) => onSave(goals.map((goal) => goal.id === goalId ? { ...goal, ...changes } : goal))

  const getPatientLogs = (patientUniqueId: string) => {
    try {
      const raw = localStorage.getItem('vitalsync_logs_v1')
      if (!raw) return []
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed.filter((l: any) => (l.patientUniqueId || 'VS-0002') === patientUniqueId)
    } catch {
      return []
    }
  }

  const patientLogs = getPatientLogs(patient.uniqueId)

  return <section className="goals-page"><header className="patients-header"><div><p className="eyebrow">PATIENT GOALS</p><h1>Goals</h1><p className="header-copy">Goals assigned to {patient.name}.</p></div><button className="primary" onClick={() => setTemplateOpen(true)}>+ Assign Goal</button></header>
    {activeGoals.length === 0 ? <div className="goals-empty"><div className="select-icon">✦</div><h2>No goals assigned yet</h2><p>Create a lifestyle goal to support this patient’s monitoring plan.</p><button className="primary" onClick={() => setTemplateOpen(true)}>+ Assign Goal</button></div> : <><div className="goals-section-heading"><h2>Active Goals</h2><span>{activeGoals.length}</span></div><div className="doctor-goals-list">{activeGoals.map((goal) => {
      const evaluation = evaluateGoal(goal, patientLogs)
      const displayPercentage = evaluation.evaluable ? evaluation.percentage : goal.progressPercent
      const displayProgressText = evaluation.evaluable ? evaluation.progressText : 'Progress not automatically evaluated'
      return (
        <article className="doctor-goal-card" key={goal.id}><div className="doctor-goal-main"><div className="goal-symbol">✦</div><div><div className="doctor-goal-title"><h3>{goal.title}</h3><span className={`goal-status ${goal.status.toLowerCase()}`}>{goal.status}</span></div><p className="goal-category">{goal.category}</p><p className="goal-target"><strong>Target:</strong> {goal.target || 'Not specified'} · <strong>Frequency:</strong> {goal.frequency}</p><div className="progress-bar-bg" style={{ marginTop: '6px' }}><div className="progress-bar-fill" style={{ width: `${displayPercentage}%` }} /></div><p className="goal-target" style={{ marginTop: '4px' }}><strong>Progress:</strong> {displayProgressText}</p><p className="goal-dates"><strong>Start:</strong> {goal.startDate} · <strong>Review:</strong> {goal.reviewDate}</p>{goal.instructions && <p className="goal-instructions">{goal.instructions}</p>}</div></div><div className="goal-actions-menu"><button aria-label={`Actions for ${goal.title}`} onClick={() => setMenuGoalId(menuGoalId === goal.id ? null : goal.id)}>•••</button>{menuGoalId === goal.id && <div className="goal-action-popover"><button onClick={() => { setEditingGoal(goal); setMenuGoalId(null) }}>Edit Goal</button><button onClick={() => { updateGoal(goal.id, { status: 'Paused' }); setMenuGoalId(null) }}>Pause Goal</button><button onClick={() => { updateGoal(goal.id, { status: 'Completed' }); setMenuGoalId(null) }}>Complete Goal</button></div>}</div></article>
      )
    })}</div></>}
    {templateOpen && <GoalTemplateModal onClose={() => setTemplateOpen(false)} onSelect={(template) => { setSelectedTemplate(template); setTemplateOpen(false) }} />}
    {(selectedTemplate || editingGoal) && <GoalConfigurationModal patient={patient} template={selectedTemplate} goal={editingGoal} currentDoctorName={currentDoctorName} onClose={() => { setSelectedTemplate(null); setEditingGoal(null) }} onSave={(goal) => { onSave(editingGoal ? goals.map((item) => item.id === goal.id ? goal : item) : [...goals, goal]); setSelectedTemplate(null); setEditingGoal(null) }} />}
  </section>
}

function GoalTemplateModal({ onClose, onSelect }: { onClose: () => void; onSelect: (template: typeof providerGoalTemplates[number]) => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal goal-template-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><h2>Choose a goal template</h2><p>Start with a focused lifestyle goal for this patient.</p></div><button onClick={onClose}>×</button></div><div className="doctor-template-grid">{providerGoalTemplates.map((template) => <button key={template.id} className="doctor-template-card" onClick={() => onSelect(template)}><strong>{template.title}</strong><small>{template.category} · {template.frequency}</small><span>›</span></button>)}</div></section></div>
}

function GoalConfigurationModal({ patient, template, goal, currentDoctorName, onClose, onSave }: { patient: Patient; template: typeof providerGoalTemplates[number] | null; goal: ProviderGoal | null; currentDoctorName: string; onClose: () => void; onSave: (goal: ProviderGoal) => void }) {
  const [title, setTitle] = useState(goal?.title ?? template?.title ?? '')
  const [category, setCategory] = useState(goal?.category ?? template?.category ?? 'Other')
  const [target, setTarget] = useState(goal?.target ?? template?.target ?? '')
  const [frequency, setFrequency] = useState<GoalFrequency>((goal?.frequency ?? template?.frequency ?? 'Daily') as GoalFrequency)
  const [startDate, setStartDate] = useState(goal?.startDate ?? new Date().toISOString().slice(0, 10))
  const [reviewDate, setReviewDate] = useState(goal?.reviewDate ?? '')
  const [instructions, setInstructions] = useState(goal?.instructions ?? '')
  const submit = (event: React.FormEvent) => { 
    event.preventDefault(); 
    onSave({ 
      id: goal?.id ?? Date.now(), 
      patientUniqueId: patient.uniqueId, 
      title, 
      category, 
      target, 
      frequency, 
      startDate, 
      reviewDate, 
      instructions, 
      status: goal?.status ?? 'Active', 
      progressPercent: goal?.progressPercent ?? 0, 
      assignedBy: goal?.assignedBy ?? currentDoctorName,
      evaluationType: goal?.evaluationType ?? template?.evaluationType ?? 'none',
      targetValue: goal?.targetValue ?? template?.targetValue,
      metricKey: goal?.metricKey ?? template?.metricKey
    }) 
  }
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal goal-config-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><h2>{goal ? 'Edit Goal' : 'Configure Goal'}</h2><p>Set the details for {patient.name}.</p></div><button type="button" onClick={onClose}>×</button></div><div className="form-grid"><label>Goal<input required value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Nutrition</option><option>Physical Activity</option><option>Sleep</option><option>Stress</option><option>Social Connectedness</option><option>Medication</option><option>Other</option></select></label><label>Target<input required value={target} onChange={(event) => setTarget(event.target.value)} placeholder="e.g. 8 glasses/day" /></label><label>Frequency<select value={frequency} onChange={(event) => setFrequency(event.target.value as GoalFrequency)}><option>Daily</option><option>Weekdays</option><option>Weekly</option></select></label><label>Start date<input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>Review date<input required type="date" value={reviewDate} onChange={(event) => setReviewDate(event.target.value)} /></label><label className="full-width">Instructions / Notes<textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Optional instructions for the patient" /></label></div><div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary" type="submit">{goal ? 'Save changes' : 'Assign Goal'}</button></div></form></div>
}

function PatientProfile({ patient, onContact, onReminder, reminderSet, onBack, onEdit, onArchive, onUpdateFollowUp, onUpdateVisibility, doctors, activities }: { patient: Patient; onContact: () => void; onReminder: () => void; reminderSet: boolean; onBack: () => void; onEdit: () => void; onArchive: () => void; onUpdateFollowUp: (id: number, newDate: string) => void; onUpdateVisibility: (id: number, v: Patient['visibility'], selected?: number[]) => void; doctors: Doctor[]; activities: string[][] }) {
  const [followUp, setFollowUp] = useState(patient.followUpDate)
  const [vis, setVis] = useState<Patient['visibility']>(patient.visibility)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedDoctors, setSelectedDoctors] = useState<number[]>(patient.selectedDoctors ?? [])
  const handleFollowUp = (val: string) => { setFollowUp(val); onUpdateFollowUp(patient.id, val) }
  const handleVisibility = (v: Patient['visibility']) => { setVis(v); if (v !== 'Selected Doctors') onUpdateVisibility(patient.id, v); else setPickerOpen(true) }
  const selectedDoctorNames = doctors.filter((doctor) => selectedDoctors.includes(doctor.id)).map((doctor) => doctor.name)
  return <section className="patient-profile"><button className="back-button" onClick={onBack}>← Return to Registry</button><article className="profile-hero"><div className="profile-person"><span className="avatar profile-avatar" style={{ background: patient.color }}>{patient.initials}</span><div><h2>{patient.name}</h2><p>{patient.age} years old · {patient.residence}</p><p className="care-label">{patient.care}</p></div></div><div className="profile-actions"><button onClick={onContact}>Contact</button><button onClick={onReminder}>{reminderSet ? 'Reminder set' : 'Set reminder'}</button><button className="edit-button" onClick={onEdit}>Manage</button><button className="archive-button" onClick={onArchive}>Archive monitoring</button></div></article>
    <div className="profile-grid">
      <article className="profile-card"><h3>Patient information</h3>
        <dl>
          <div><dt>Unique ID</dt><dd>{patient.uniqueId}</dd></div>
          <div><dt>Visibility</dt><dd>
            <select className="patient-control patient-visibility-control" aria-label="Patient visibility" value={vis} onChange={(e) => handleVisibility(e.target.value as Patient['visibility'])}>
              <option>Assigned Only</option>
              <option>Selected Doctors</option>
              <option>All Doctors</option>
            </select>
            {vis === 'Selected Doctors' && <div className="selected-doctors-summary"><span>{selectedDoctorNames.length ? selectedDoctorNames.join(', ') : 'No doctors selected'}</span><button type="button" onClick={() => setPickerOpen(true)}>Open Doctor Picker</button></div>}
          </dd></div>
          <div><dt>Patient type</dt><dd>{patient.type}</dd></div>
          <div><dt>Follow-up</dt><dd><input className="patient-control patient-follow-up-control" aria-label="Patient follow-up date" type="date" value={followUp} onChange={(e) => handleFollowUp(e.target.value)} /></dd></div>
          <div><dt>Priority level</dt><dd><span className={`priority ${followUpPriority(followUp).toLowerCase()}`}>{followUpPriority(followUp)}</span></dd></div>
          <div><dt>Care focus</dt><dd>{patient.care}</dd></div>
        </dl>
      </article>
      <article className="profile-card"><h3>Today’s log</h3><div className="log-summary"><span>🍽</span><div><strong>Breakfast submitted</strong><p>8:14 AM · On time</p></div></div><div className="log-summary"><span>☾</span><div><strong>Sleep pending</strong><p>Due by 10:00 AM</p></div></div></article>
    </div>
    <RecentActivitySummary activities={activities} patientName={patient.name} patientUniqueId={patient.uniqueId} />
    {pickerOpen && <div className="modal-backdrop" onMouseDown={() => setPickerOpen(false)}><section className="modal doctor-picker-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><h2>Select doctors</h2><p>Choose which doctors can access this patient.</p></div><button type="button" onClick={() => setPickerOpen(false)}>×</button></div><DoctorPicker doctors={doctors} selectedIds={selectedDoctors} onChange={setSelectedDoctors} /><div className="modal-actions"><button type="button" onClick={() => setPickerOpen(false)}>Cancel</button><button type="button" className="primary" onClick={() => { onUpdateVisibility(patient.id, 'Selected Doctors', selectedDoctors); setPickerOpen(false) }}>Confirm selection</button></div></section></div>}
  </section>
}

function ActivityModal({ range, setRange, onClose }: { range: Range; setRange: (x: Range) => void; onClose: () => void }) { const list = range === 'Today' ? activities.slice(0, 3) : range === 'Past 3 days' ? activities.slice(0, 5) : activities; return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal activity-modal" onMouseDown={(e) => e.stopPropagation()}><div className="modal-heading"><div><h2>Recent activity</h2><p>All patient submissions and check-ins</p></div><button onClick={onClose}>×</button></div><RangeSelect value={range} setValue={setRange} /><div className="modal-activities">{list.map((a) => <Activity key={a[0] + a[2]} item={a} />)}</div></section></div> }
function ContactModal({ patient, copied, onMessage, onCopy, onClose }: { patient: Patient; copied: boolean; onMessage: () => void; onCopy: () => void; onClose: () => void }) { return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal contact-modal" onMouseDown={(e) => e.stopPropagation()}><div className="modal-heading"><div><h2>Contact {patient.name}</h2><p>Reach them securely through VitalSync.</p></div><button onClick={onClose}>×</button></div><div className="contact-buttons single"><button onClick={onMessage}><span>◌</span>Open secure message</button></div><div className="email-row"><div><small>EMAIL ADDRESS</small><strong>{patient.email}</strong></div><button onClick={onCopy}>{copied ? 'Copied!' : 'Copy email'}</button></div></section></div> }
function OpenPatientModal({ patient, onOpen, onClose }: { patient: Patient; onOpen: () => void; onClose: () => void }) { return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><h2>Open patient workspace?</h2><p>Confirm the patient before entering their chart.</p></div><button onClick={onClose}>×</button></div><dl className="confirmation-details"><div><dt>Patient name</dt><dd>{patient.name}</dd></div><div><dt>Unique ID</dt><dd>{patient.uniqueId}</dd></div><div><dt>Email</dt><dd>{patient.email}</dd></div><div><dt>Priority</dt><dd>{patient.priority}</dd></div></dl><div className="modal-actions"><button onClick={onClose}>Cancel</button><button className="primary" onClick={onOpen}>Open Patient</button></div></section></div> }
function AddPatientModal({ onNew, onExisting, onClose, patients }: { onNew: (name: string, email: string, phone?: string) => void; onExisting: (uniqueId: string) => void; onClose: () => void; patients: Patient[] }) {
  const [mode, setMode] = useState<'new' | 'existing'>('new')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [uniqueId, setUniqueId] = useState('')
  const [query, setQuery] = useState('')
  const [confirm, setConfirm] = useState<Patient | null>(null)
  const results = patients.filter((p) => !p.active && p.name.toLowerCase().includes(query.trim().toLowerCase()))
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === 'new') onNew(name, email);
    else onExisting(uniqueId);
  };
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}><div className="modal-heading"><div><h2>Add patient</h2><p>Start monitoring a new patient or reactivate an existing account.</p></div><button type="button" onClick={onClose}>×</button></div><div className="registry-tabs add-tabs"><button type="button" className={mode === 'new' ? 'active' : ''} onClick={() => setMode('new')}>Add New Patient</button><button type="button" className={mode === 'existing' ? 'active' : ''} onClick={() => setMode('existing')}>Add Existing Patient</button></div>
    {mode === 'new' ? <div className="form-grid single"><label>Name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label></div> : <div className="form-grid single">
      <label>Search inactive patients<input placeholder="Search inactive patients by name" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      {query.trim() !== '' && <div className="search-results">
        {results.map((p) => <button key={p.id} type="button" className="search-result" onClick={() => { setConfirm(p); setName(p.name); setUniqueId(p.uniqueId); setQuery(''); }}>
          <div className="result-left">
            <strong>{p.name}</strong>
            <small>{p.uniqueId}</small>
          </div>
          <div className="result-right"><span className={`status-chip ${p.active ? 'active' : 'inactive'}`}>{p.active ? '🟢 Active' : '⚪ Inactive'}</span>{p.active && p.managingDoctor && <small className="muted">{p.managingDoctor}</small>}</div>
        </button>)}
        {results.length === 0 && <div className="search-empty">No inactive patients match.</div>}
      </div>}
      <label>Patient Name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Select an inactive patient" readOnly /></label>
      <label>Unique ID<input required value={uniqueId} onChange={(event) => setUniqueId(event.target.value)} placeholder="e.g. VS-0005" readOnly /></label>
      {confirm && <div className="selection-confirm" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-heading"><h3>Confirm patient selection</h3><p>Choose this patient to auto-fill the matching Patient Name and Unique ID.</p></div>
        <dl className="confirmation-details"><div><dt>Patient name</dt><dd>{confirm.name}</dd></div><div><dt>Unique ID</dt><dd>{confirm.uniqueId}</dd></div></dl>
        <div className="confirm-actions"><button type="button" onClick={() => setConfirm(null)}>Cancel</button><button type="button" className="primary" onClick={() => { setName(confirm.name); setUniqueId(confirm.uniqueId); setConfirm(null); }}>Confirm Reactivation</button></div>
      </div>}
    </div>}<div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary" type="submit">{mode === 'new' ? 'Add Patient' : 'Reactivate Monitoring'}</button></div></form></div>
}
function PatientForm({ patient, nextId, onSave, onClose }: { patient: Patient | null; nextId: number; onSave: (p: Patient, isNew: boolean) => void; onClose: () => void }) {
  const isNew = patient === null
  const [name, setName] = useState(patient?.name ?? '')
  const [dob, setDob] = useState(patient ? `${new Date().getFullYear() - patient.age}-01-01` : '')
  const [residence, setResidence] = useState(patient?.residence ?? '')
  const [care, setCare] = useState(patient?.care ?? '')
  const [type, setType] = useState<Patient['type']>(patient?.type ?? 'Out-patient')
  const [priority, setPriority] = useState<Patient['priority']>(patient?.priority ?? 'Low')
  const [visibility, setVisibility] = useState<Patient['visibility']>(patient?.visibility ?? 'Assigned Only')
  void setVisibility
  const [assigned, setAssigned] = useState(patient?.assignedSince ?? '2026-07-31')
  const submit = (e: React.FormEvent) => { e.preventDefault(); const birth = new Date(dob); const age = dob ? new Date().getFullYear() - birth.getFullYear() : 0; const initials = name.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'NP'; onSave({ id: patient?.id ?? nextId, name: name || 'New patient', initials, age, residence: residence || 'Not specified', care: care || 'General lifestyle care', phone: patient?.phone ?? '+63 917 000 0000', email: patient?.email ?? 'patient@email.com', detail: 'Newly added patient', status: 'On track', priority, type, color: patient?.color ?? '#b8d5c9', assignedSince: assigned, followUpDate: patient?.followUpDate ?? '2026-08-30', uniqueId: patient?.uniqueId ?? `VS-${String(nextId).padStart(4, '0')}`, active: patient?.active ?? true, managingDoctor: patient?.managingDoctor ?? undefined, visibility }, isNew) }
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal patient-form" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}><div className="modal-heading"><div><h2>{isNew ? 'Add patient' : 'Edit patient profile'}</h2><p>{isNew ? 'Create a patient profile for monitoring.' : 'Update the patient’s monitoring information.'}</p></div><button type="button" onClick={onClose}>×</button></div><div className="form-grid"><label>Full name<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maria Santos" /></label><label>Date of birth<input required type="date" value={dob} onChange={(e) => setDob(e.target.value)} /></label><label>Residence<input required value={residence} onChange={(e) => setResidence(e.target.value)} placeholder="Barangay, Davao City" /></label><label>Patient problem / care focus<input required value={care} onChange={(e) => setCare(e.target.value)} placeholder="e.g. Post-op recovery" /></label><label>Patient type<select value={type} onChange={(e) => setType(e.target.value as Patient['type'])}><option>Out-patient</option><option>In-patient</option></select></label><label>Priority level<select value={priority} onChange={(e) => setPriority(e.target.value as Patient['priority'])}><option>High</option><option>Medium</option><option>Low</option></select></label><label>Assignment date<input type="date" value={assigned} onChange={(e) => setAssigned(e.target.value)} /></label></div><div className="form-footer"><span>Age will be calculated from date of birth.</span><button className="primary" type="submit">{isNew ? 'Add patient' : 'Save changes'}</button></div></form></div>
}
function MessagesView({ patients, selected, onSelect }: { patients: Patient[]; selected: Patient; onSelect: (id: number) => void }) {
  const [draft, setDraft] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [conversationStatus, setConversationStatus] = useState('Messages are private and recorded in the patient’s communication history.')
  const [pinned, setPinned] = useState(false)
  const [notificationPreference, setNotificationPreference] = useState('All messages')
  const [patientInfoOpen, setPatientInfoOpen] = useState(false)
  const [importantNext, setImportantNext] = useState(false)
  const [messages, setMessages] = useState<Record<number, { text: string; side: 'doctor' | 'patient'; time: string; important?: boolean }[]>>({ 
    1: [{ text: 'Good morning, Maria. How are you feeling today?', side: 'doctor', time: '9:02 AM', important: true }, { text: 'Good morning, Doctor. I am feeling better, but I was unable to sleep well last night.', side: 'patient', time: '9:08 AM', important: false }, { text: 'Thank you for letting me know. Please try to complete your sleep log when you can.', side: 'doctor', time: '9:10 AM', important: false }], 
    2: [{ text: 'I have submitted my breakfast and walk today.', side: 'patient', time: '8:14 AM', important: false }, { text: 'Great work, John. Keep it up.', side: 'doctor', time: '8:20 AM', important: true }], 
    3: [{ text: 'My activity has been lower this week.', side: 'patient', time: 'Yesterday', important: false }, { text: 'Thank you for sharing. Let us review this during your check-in.', side: 'doctor', time: 'Yesterday', important: true }], 
    4: [{ text: 'I completed my sleep log this morning.', side: 'patient', time: '7:42 AM', important: true }], 
    5: [{ text: 'Nice walk today, Bianca!', side: 'doctor', time: '7:25 AM', important: false }] 
  })
  const current = messages[selected.id] ?? []
  const filteredMessages = notificationPreference === 'Important only' ? current.filter((message) => message.important) : notificationPreference === 'Muted' ? current.filter((message) => !message.important) : current
  const send = () => {
    if (!draft.trim()) return
    const nextMessage = { text: draft.trim(), side: 'doctor' as const, time: 'Just now', important: importantNext }
    setMessages((all) => {
      const thread = all[selected.id] ?? []
      return { ...all, [selected.id]: [...thread, nextMessage] }
    })
    setDraft('')
    setImportantNext(false)
  }
  return <>
    <header className="patients-header"><div><p className="eyebrow">SECURE COMMUNICATION</p><h1>Messages</h1><p className="header-copy">Private conversations between you and your assigned patients.</p></div></header>
    <div className="messages-layout">
      <aside className="message-directory"><div className="directory-heading"><strong>Conversations</strong><span>{patients.length}</span></div><div className="directory-list">{patients.map((p) => <button key={p.id} className={selected.id === p.id ? 'directory-item selected' : 'directory-item'} onClick={() => onSelect(p.id)}><span className="avatar" style={{ background: p.color }}>{p.initials}</span><span><strong>{p.name}</strong><small>{p.id === 1 ? 'Sleep log follow-up' : p.id === 2 ? 'Great work, John...' : p.id === 3 ? 'Activity has been lower...' : p.id === 4 ? 'Sleep log submitted' : 'Nice walk today!'}</small></span>{p.id === 1 && <i className="unread-dot" />}</button>)}</div></aside>
      <section className="chat-panel"><header className="chat-header"><span className="avatar" style={{ background: selected.color }}>{selected.initials}</span><div><h2>{selected.name}</h2><p><i className="online-dot" />Active today</p></div><div className="conversation-menu-wrap"><button type="button" aria-label="Conversation settings" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>•••</button>{menuOpen && <div className="conversation-menu"><button type="button" onClick={() => { setPinned(!pinned); setConversationStatus(pinned ? 'Conversation unpinned.' : 'Conversation pinned for quick access.'); setMenuOpen(false) }}>{pinned ? 'Unpin conversation' : 'Pin conversation'}</button><label className="notification-choice">Notifications<select aria-label="Notification preference" value={notificationPreference} onChange={(event) => { const value = event.target.value; setNotificationPreference(value); setConversationStatus(value === 'Important only' ? 'Showing only important messages.' : value === 'Muted' ? 'Showing non-priority messages.' : 'Showing all messages in this conversation.') }}><option>All messages</option><option>Important only</option><option>Muted</option></select></label><button type="button" onClick={() => { setPatientInfoOpen(true); setMenuOpen(false) }}>View patient information</button></div>}</div></header>
        <div className="chat-notice">{conversationStatus}</div><div className="messages">{filteredMessages.map((message, index) => <div className={`bubble-row ${message.side}`} key={`${message.time}-${index}`}><div className={`bubble ${message.important ? 'important' : ''}`} title={message.important ? 'Important message' : undefined} tabIndex={message.important ? 0 : undefined}>{message.text}<small>{message.time}</small></div></div>)}</div><div className="message-compose"><button type="button" className={importantNext ? 'important-toggle active' : 'important-toggle'} onClick={() => setImportantNext((value) => !value)}>Important</button><input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder={`Message ${selected.name.split(' ')[0]}...`} /><button type="button" onClick={send}>Send ↑</button></div>
      </section>
    </div>
    {patientInfoOpen && <div className="modal-backdrop" onMouseDown={() => setPatientInfoOpen(false)}><section className="modal contact-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><h2>{selected.name}</h2><p>Patient contact information</p></div><button type="button" onClick={() => setPatientInfoOpen(false)}>×</button></div><dl className="confirmation-details"><div><dt>Unique ID</dt><dd>{selected.uniqueId || 'Not available'}</dd></div><div><dt>Email</dt><dd>{selected.email || 'Not available'}</dd></div><div><dt>Phone</dt><dd>{selected.phone || 'Not available'}</dd></div><div><dt>Care focus</dt><dd>{selected.care}</dd></div></dl></section></div>}
  </>
}
function TeamMessagesView({ doctors }: { doctors: Doctor[] }) {
  const [teamThreads, setTeamThreads] = useState<Record<number, { text: string; side: 'doctor' | 'team'; time: string; important?: boolean }[]>>({
    101: [{ text: 'Morning huddle is at 8:30 AM.', side: 'doctor', time: 'Today', important: true }, { text: 'I will review the patient notes before rounds.', side: 'team', time: 'Today', important: false }],
    102: [{ text: 'Nurse handoff checklist is updated.', side: 'doctor', time: 'Yesterday', important: true }, { text: 'Thanks, I have the latest values.', side: 'team', time: 'Yesterday', important: false }],
    103: [{ text: 'Cardiology follow-up is scheduled for Friday.', side: 'doctor', time: 'Mon', important: true }],
  })
  const [selectedId, setSelectedId] = useState(doctors[0]?.id ?? 0)
  const [draft, setDraft] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [notificationPreference, setNotificationPreference] = useState('All messages')
  const [teamInfoOpen, setTeamInfoOpen] = useState(false)
  const [importantNext, setImportantNext] = useState(false)
  const [conversationStatus, setConversationStatus] = useState('Messages are private and recorded in the team communication history.')

  const chatData = doctors.map((doctor) => ({ ...doctor, role: doctor.id === 101 ? 'Primary care' : doctor.id === 102 ? 'Nurse' : 'Specialist' }))
  const matches = chatData.filter((doctor) => doctor.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) || doctor.role.toLowerCase().includes(searchQuery.trim().toLowerCase()))
  const safeSelected = matches.find((doctor) => doctor.id === selectedId) ?? matches[0] ?? chatData[0]
  const selected = safeSelected ?? chatData[0]
  const current = teamThreads[selected.id] ?? []
  const filteredMessages = notificationPreference === 'Important only' ? current.filter((message) => message.important) : notificationPreference === 'Muted' ? current.filter((message) => !message.important) : current

  const send = () => { 
    if (!draft.trim()) return; 
    const next: { text: string; side: 'doctor'; time: string; important?: boolean } = { text: draft.trim(), side: 'doctor', time: 'Just now', important: importantNext }; 
    setTeamThreads((all) => ({ ...all, [selected.id]: [...(all[selected.id] ?? []), next] })); 
    setDraft(''); 
    setImportantNext(false);
  }
  return <section className="team-messages-view"><header className="patients-header"><div><p className="eyebrow">TEAM COMMUNICATION</p><h1>Team messaging</h1><p className="header-copy">Message the care team directly using the clinic’s active team channels.</p></div></header><div className="messages-layout"><aside className="message-directory"><div className="directory-heading"><strong>Care team</strong><span>{chatData.length}</span></div><label className="directory-search"><span>⌕</span><input aria-label="Search team contacts" type="search" placeholder="Search team contacts" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} /></label><div className="directory-list">{matches.map((doctor) => <button key={doctor.id} type="button" className={selected.id === doctor.id ? 'directory-item selected' : 'directory-item'} onClick={() => setSelectedId(doctor.id)}><span className="avatar" style={{ background: doctor.color }}>{doctor.initials}</span><span><strong>{doctor.name}</strong><small>{doctor.role}</small></span></button>)}</div>{matches.length === 0 && <div className="search-empty">No team members match this search.</div>}</aside><section className="chat-panel"><header className="chat-header"><span className="avatar" style={{ background: selected.color }}>{selected.initials}</span><div><h2>{selected.name}</h2><p>{selected.role}</p></div><div className="conversation-menu-wrap"><button type="button" aria-label="Conversation settings" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>•••</button>{menuOpen && <div className="conversation-menu"><button type="button" onClick={() => { setPinned(!pinned); setConversationStatus(pinned ? 'Conversation unpinned.' : 'Conversation pinned for quick access.'); setMenuOpen(false) }}>{pinned ? 'Unpin conversation' : 'Pin conversation'}</button><label className="notification-choice">Notifications<select aria-label="Notification preference" value={notificationPreference} onChange={(event) => { const value = event.target.value; setNotificationPreference(value); setConversationStatus(value === 'Important only' ? 'Showing only important messages.' : value === 'Muted' ? 'Showing non-priority messages.' : 'Showing all messages in this conversation.') }}><option>All messages</option><option>Important only</option><option>Muted</option></select></label><button type="button" onClick={() => { setTeamInfoOpen(true); setMenuOpen(false) }}>View team member information</button></div>}</div></header><div className="chat-notice">{conversationStatus}</div><div className="messages">{filteredMessages.map((message, index) => <div className={`bubble-row ${message.side}`} key={`${message.time}-${index}`}><div className={`bubble ${message.important ? 'important' : ''}`} title={message.important ? 'Important message' : undefined} tabIndex={message.important ? 0 : undefined}>{message.text}<small>{message.time}</small></div></div>)}</div><div className="message-compose"><button type="button" className={importantNext ? 'important-toggle active' : 'important-toggle'} onClick={() => setImportantNext((value) => !value)}>Important</button><input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder={`Message ${selected.name.split(' ')[0]}...`} /><button type="button" onClick={send}>Send ↑</button></div></section></div>
    {teamInfoOpen && <div className="modal-backdrop" onMouseDown={() => setTeamInfoOpen(false)}><section className="modal contact-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><h2>{selected.name}</h2><p>Team member information</p></div><button type="button" onClick={() => setTeamInfoOpen(false)}>×</button></div><dl className="confirmation-details"><div><dt>Role</dt><dd>{selected.role}</dd></div><div><dt>Status</dt><dd>Active team channel</dd></div></dl></section></div>}
  </section>
}
function TeamView({ doctors }: { doctors: Doctor[] }) {
  return <TeamMessagesView doctors={doctors} />
}
function HistoryView({ patients, selectedId, onSelect }: { patients: Patient[]; selectedId: number; onSelect: (id: number) => void }) {
  const selected = patients.find((patient) => patient.id === selectedId) ?? patients[0]
  const episodes = monitoringHistory[selected.id] ?? [{ focus: selected.care, period: `${selected.assignedSince ?? 'Jul 31, 2026'} - Present`, clinician: 'Dr. Jamie Dizon', status: 'Current' as const, note: 'Lifestyle monitoring initiated for this patient.', adherence: 'No adherence data yet' }]
  return <><header className="patients-header"><div><p className="eyebrow">LONGITUDINAL RECORD</p><h1>Monitoring history</h1><p className="header-copy">Review relevant past and current lifestyle-monitoring episodes for assigned patients.</p></div></header><div className="history-layout"><aside className="history-directory"><div className="directory-heading"><strong>Assigned patients</strong><span>{patients.length}</span></div><div className="directory-search">⌕ <span>Search patients</span></div><div className="directory-list">{patients.map((patient) => <button key={patient.id} className={patient.id === selected.id ? 'directory-item selected' : 'directory-item'} onClick={() => onSelect(patient.id)}><span className="avatar" style={{ background: patient.color }}>{patient.initials}</span><span><strong>{patient.name}</strong><small>{patient.care}</small></span></button>)}</div></aside><section className="history-panel"><div className="history-privacy"><span>⌁</span><p><b>Restricted clinical history</b> · Access is limited to assigned clinicians and authorized clinic staff.</p></div><article className="history-patient"><span className="avatar profile-avatar" style={{ background: selected.color }}>{selected.initials}</span><div><h2>{selected.name}</h2><p>{selected.age} years old · {selected.residence}</p><span className="patient-type">{selected.type}</span></div></article><div className="timeline-heading"><div><h2>Monitoring episodes</h2><p>Current and previous lifestyle-monitoring care</p></div><span>{episodes.length} record{episodes.length > 1 ? 's' : ''}</span></div><div className="timeline">{episodes.map((episode, index) => <article className="episode" key={episode.focus + episode.period}><div className="timeline-marker"><i className={episode.status === 'Current' ? 'current' : ''} />{index < episodes.length - 1 && <b />}</div><div className="episode-card"><div className="episode-top"><div><h3>{episode.focus}</h3><p>{episode.period}</p></div><span className={episode.status === 'Current' ? 'episode-status current' : 'episode-status'}>{episode.status}</span></div><p className="episode-note">{episode.note}</p><footer><span>Assigned clinician: <b>{episode.clinician}</b></span><span>{episode.adherence}</span></footer></div></article>)}</div><p className="history-footnote">This view contains only monitoring records relevant to the assigned patient and authorized care workflow.</p></section></div></>
}
function EmptyView({ name }: { name: string }) { return <div className="empty-view"><div className="select-icon">◌</div><h2>{name}</h2><p>This section is next in the prototype sequence.</p></div> }
function Summary({ icon, color, label, value, detail }: { icon: string; color: string; label: string; value: string; detail: string }) { return <article className="summary-card"><span className={`card-icon ${color}`}>{icon}</span><div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div></article> }
function PanelTitle({ title, subtitle, action, onAction }: { title: string; subtitle: string; action?: string; onAction?: () => void }) { return <div className="panel-heading"><div><h2>{title}</h2><p>{subtitle}</p></div>{action && <button className="text-button" onClick={onAction}>{action} <span>→</span></button>}</div> }
function RangeSelect({ value, setValue }: { value: Range; setValue: (x: Range) => void }) { return <select className="period" value={value} onChange={(e) => setValue(e.target.value as Range)}>{(['Today', 'Past 3 days', 'Past week', 'Past month'] as Range[]).map((item) => <option key={item}>{item}</option>)}</select> }
function PatientRow({ patient, onClick }: { patient: Patient; onClick: () => void }) { return <button className="patient-row" onClick={onClick}><span className="avatar" style={{ background: patient.color }}>{patient.initials}</span><span className="patient-info"><strong>{patient.name}</strong><small>{patient.detail}</small></span><span className={`status ${patient.status.replaceAll(' ', '-').toLowerCase()}`}>{patient.status}</span><span className="chevron">›</span></button> }
function Activity({ item }: { item: string[] }) { return <div className="activity"><span className={`activity-icon ${item[4]}`}>{item[3]}</span><p><b>{item[0]}</b> {item[1]} <small>{item[2]}</small></p></div> }
export default App
