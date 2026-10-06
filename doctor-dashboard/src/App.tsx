import { useState, useEffect } from 'react'
import { api, clearAuthToken, getAuthToken, type AuthUser } from './lib/api';
import './App.css'
import './PrototypeExtras.css'
import './PrototypeExtras.addons.css'
import { DoctorProfileCard } from './components/DoctorProfileCard'
import { DoctorProfilePage } from './components/DoctorProfilePage'
import { DoctorSettingsPage } from './components/DoctorSettingsPage'
import { LoginPage } from './components/LoginPage'
type Doctor = { id: number; name: string; initials: string; color?: string; specialty?: string; isCurrent?: boolean }
import type { DoctorNoteDto, DoctorProfileDto, MonitoringHistoryEpisodeDto, PatientConversationMessage, TeamMessageDto } from './lib/api'
import RecentActivitySummary from './components/RecentActivitySummary'
import { evaluateGoal, type EvaluationType, type GoalFrequency } from '../../shared/goalEvaluator'

// ... (constants and types remain unchanged, assume they are present)
// Skipping replacing the whole file content due to size. I will carefully replace the imports and App function.

type DoctorSession = { id: number; name: string; email: string; specialty: string; initials: string; color: string }
type Patient = {
  id: number; name: string; initials: string; age: number; residence: string; care: string; phone: string; email: string
  detail: string; status: 'Needs attention' | 'On track' | 'Follow up'; priority: 'High' | 'Medium' | 'Low'; type: 'Out-patient' | 'In-patient'; color: string; assignedSince?: string; followUpDate: string; uniqueId: string; active: boolean; visibility: 'Assigned Only' | 'Selected Doctors' | 'All Doctors'; selectedDoctors?: number[]
  managingDoctor?: string
}

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
  targetValue?: number | null
  targetUnit?: string
  metricKey?: string
}
type GoalLog = { id: number; type: string; date: string; time: string; title: string; detail: string; extra?: string }
type GoalTrackingMode = 'none' | 'food' | 'activity' | 'sleep' | 'medication' | 'stress' | 'social' | 'habit'

const goalTrackingOptions = {
  none: { label: 'Not automatically evaluated', evaluationType: 'none' },
  food: { label: 'Food log recorded', evaluationType: 'indicator', metricKey: 'food' },
  activity: { label: 'Activity duration', evaluationType: 'duration', metricKey: 'activity' },
  sleep: { label: 'Sleep duration', evaluationType: 'duration', metricKey: 'sleep' },
  medication: { label: 'Medication occurrence', evaluationType: 'occurrence', metricKey: 'medication' },
  stress: { label: 'Stress reflection', evaluationType: 'reflection', metricKey: 'stress' },
  social: { label: 'Social reflection', evaluationType: 'reflection', metricKey: 'social' },
  habit: { label: 'Lifestyle habits reflection', evaluationType: 'reflection', metricKey: 'habit' },
} as const

function getGoalTrackingMode(goal: ProviderGoal | null, template: typeof providerGoalTemplates[number] | null): GoalTrackingMode {
  const evaluationType = goal?.evaluationType ?? template?.evaluationType ?? 'none'
  const metricKey = goal?.metricKey ?? template?.metricKey
  if (evaluationType === 'indicator' && metricKey === 'food') return 'food'
  if (evaluationType === 'duration' && metricKey === 'activity') return 'activity'
  if (evaluationType === 'duration' && metricKey === 'sleep') return 'sleep'
  if (evaluationType === 'occurrence' && metricKey === 'medication') return 'medication'
  if (evaluationType === 'reflection' && (metricKey === 'stress' || metricKey === 'social' || metricKey === 'habit')) return metricKey
  return 'none'
}

const providerGoalTemplates = [
  { id: 'eat-veg', title: 'Eat more vegetables', category: 'Nutrition', target: '1 serving', frequency: 'Daily', evaluationType: 'indicator' as const, targetValue: 1, metricKey: 'food' },
  { id: 'drink-water', title: 'Drink more water', category: 'Nutrition', target: '8 glasses', frequency: 'Daily', evaluationType: 'none' as const },
  { id: 'walk-every-day', title: 'Walk every day', category: 'Physical Activity', target: '30 minutes', frequency: 'Daily', evaluationType: 'duration' as const, targetValue: 30, metricKey: 'activity' },
  { id: 'improve-sleep', title: 'Improve sleep schedule', category: 'Sleep', target: '7 hours', frequency: 'Daily', evaluationType: 'duration' as const, targetValue: 7, metricKey: 'sleep' },
  { id: 'stress-management', title: 'Practice stress management', category: 'Stress', target: '10 minutes', frequency: 'Daily', evaluationType: 'reflection' as const, targetValue: 1, metricKey: 'stress' },
  { id: 'social-time', title: 'Spend quality time', category: 'Social Connectedness', target: '3 times', frequency: 'Weekly', evaluationType: 'reflection' as const, targetValue: 3, metricKey: 'social' },
  { id: 'custom', title: 'Build My Own Goal', category: 'Other', target: '', frequency: 'Daily', evaluationType: 'none' as const },
]

const followUpPriority = (followUpDate: string): Patient['priority'] => {
  if (!followUpDate) return 'Low'
  const days = Math.ceil((new Date(`${followUpDate}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000)
  return days < 0 ? 'High' : days <= 3 ? 'Medium' : 'Low'
}

const defaultDoctorSession: DoctorSession = { id: 0, name: 'Doctor', email: '', specialty: 'VitalSync clinician', initials: 'DR', color: '#d9ecf1' }

const toDoctorSession = (user: AuthUser): DoctorSession => {
  const name = user.name?.trim() || user.email
  return {
    id: user.id,
    name,
    email: user.email,
    specialty: user.specialty?.trim() || 'VitalSync clinician',
    initials: user.initials?.trim() || name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase(),
    color: user.display_color || '#d9ecf1',
  }
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [active, setActive] = useState('Registry')
  const [records, setRecords] = useState<Patient[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null)
  const [contactPatient, setContactPatient] = useState<Patient | null>(null)
  const [formPatient, setFormPatient] = useState<Patient | null>(null)
  const [showAddPatient, setShowAddPatient] = useState(false)
  const [pendingPatient, setPendingPatient] = useState<Patient | null>(null)
  const [reminders, setReminders] = useState<number[]>([])
  const [copied, setCopied] = useState(false)
  const [notice, setNotice] = useState('')
  const [providerGoals, setProviderGoals] = useState<ProviderGoal[]>([])
  const [directoryDoctors, setDirectoryDoctors] = useState<Doctor[]>([])
  const [currentDoctor, setCurrentDoctor] = useState<DoctorSession>(defaultDoctorSession)

// 1. Feature State
  const [quickNote, setQuickNote] = useState('')
  const [doctorNotes, setDoctorNotes] = useState<DoctorNoteDto[]>([])
  const [notesLoading, setNotesLoading] = useState(false)

useEffect(() => {
  let active = true

  async function restoreSession() {
    if (!getAuthToken()) {
      setSessionReady(true)
      return
    }

    try {
      const { user } = await api.getMe()
      if (user.role !== 'doctor') {
        clearAuthToken()
        return
      }
      if (active) {
        setCurrentDoctor(toDoctorSession(user))
        setIsLoggedIn(true)
      }
    } catch {
      if (active) setIsLoggedIn(false)
    } finally {
      if (active) setSessionReady(true)
    }
  }

  void restoreSession()
  return () => { active = false }
}, [])

useEffect(() => {
  if (!isLoggedIn) return;

  async function loadPatients() {
    try {
      const [activeResponse, inactiveResponse] = await Promise.all([api.getPatients(true), api.getPatients(false)]);
      const mappedPatients = [...activeResponse.patients, ...inactiveResponse.patients].map((p: any) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        uniqueId: p.unique_id,
        age: p.age,
        initials: p.name.split(/\s+/).filter(Boolean).map((part: string) => part[0]).slice(0, 2).join('').toUpperCase(),
        type: p.patient_type || 'Out-patient',
        visibility: p.visibility || 'Assigned Only',
        selectedDoctors: p.selected_doctor_ids || [],
        priority: p.priority || 'Medium',
        status: p.status || 'On track',
        active: p.monitoring_active,
        phone: p.phone || '',
        care: p.care_focus || 'General lifestyle care',
        followUpDate: p.follow_up_date || '',
        detail: p.monitoring_active ? 'No activity recorded yet' : 'Monitoring archived',
        residence: 'Not specified',
        color: '#b8d5c9',
        managingDoctor: p.managing_doctor_name,
      }));
      setRecords(mappedPatients);
    } catch (err) {
      console.error('Failed to fetch patients:', err);
    }
  }

  loadPatients();
  api.getDoctors()
    .then(({ doctors: profileDoctors }) => setDirectoryDoctors(profileDoctors.map((doctor) => ({
      id: doctor.id,
      name: doctor.name,
      initials: doctor.initials,
      color: doctor.color,
      specialty: doctor.specialty,
      isCurrent: doctor.is_current,
    }))))
    .catch((err) => console.error('Failed to fetch doctor directory:', err));
}, [isLoggedIn]);

useEffect(() => {
  if (!isLoggedIn) {
    setDoctorNotes([])
    return
  }
  let active = true
  setNotesLoading(true)
  api.getDoctorNotes()
    .then(({ notes }) => { if (active) setDoctorNotes(notes) })
    .catch((error) => { if (active) notify(`Could not load doctor notes: ${error.message}`) })
    .finally(() => { if (active) setNotesLoading(false) })
  return () => { active = false }
}, [isLoggedIn])

useEffect(() => {
  if (!isLoggedIn) {
    setReminders([])
    return
  }
  let active = true
  api.getDoctorReminders()
    .then(({ patientIds }) => { if (active) setReminders(patientIds) })
    .catch((error) => { if (active) notify(`Could not load reminders: ${error.message}`) })
  return () => { active = false }
}, [isLoggedIn])

useEffect(() => {
  if (!isLoggedIn || selectedPatientId === null) return;
  let active = true;

  api.getProviderGoals(selectedPatientId)
    .then(({ goals }) => { if (active) setProviderGoals(goals); })
    .catch((err) => { if (active) notify(`Could not load assigned goals: ${err.message}`); });

  return () => { active = false; };
}, [isLoggedIn, selectedPatientId]);

  const notify = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2600) }
  const selectedPatient = records.find((patient) => patient.id === selectedPatientId) ?? null
  const goToPatient = (patient: Patient) => { setActive('Overview'); setSelectedPatientId(patient.id); window.scrollTo(0, 0) }
  const toggleReminder = async (patient: Patient) => {
    const enabled = !reminders.includes(patient.id)
    try {
      const result = await api.setPatientReminder(patient.id, enabled)
      setReminders((current) => result.enabled
        ? current.includes(patient.id) ? current : [...current, patient.id]
        : current.filter((id) => id !== patient.id))
      notify(`Reminder preference saved for ${patient.name}. Push notifications are not enabled.`)
    } catch (error) {
      notify(`Could not update reminder: ${error instanceof Error ? error.message : 'Server error'}`)
    }
  }
  const openMessages = (patient: Patient) => { setContactPatient(null); setActive('Messages'); notify(`Opened your conversation with ${patient.name}.`) }
  const savePatient = async (patientId: number, changes: { name: string; careFocus: string; patientType: Patient['type']; priority: Patient['priority'] }) => {
    try {
      const { patient: updated } = await api.updatePatient(patientId, changes)
      setRecords((current) => current.map((item) => item.id === patientId ? {
        ...item,
        name: updated.name,
        initials: updated.name.split(/\s+/).filter(Boolean).map((part: string) => part[0]).slice(0, 2).join('').toUpperCase(),
        care: updated.care_focus || 'General lifestyle care',
        type: updated.patient_type,
        priority: updated.priority,
      } : item))
      setFormPatient(null)
      notify(`${updated.name}'s profile was updated.`)
    } catch (error) {
      notify(`Could not update patient: ${error instanceof Error ? error.message : 'Server error'}`)
      throw error
    }
  }
  const addNewPatient = async (name: string, email: string, phone?: string) => {
    const response = await api.createPatient({ name, email, phone })
    const created = response.patient
    const initials = created.name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'NP'
    const patient: Patient = {
      id: created.id,
      name: created.name,
      initials,
      age: created.age ?? 0,
      residence: 'Not specified',
      care: created.care_focus || 'General lifestyle care',
      phone: created.phone || '',
      email: created.email,
      detail: 'No activity recorded yet',
      status: created.status,
      priority: created.priority,
      type: created.patient_type,
      color: '#b8d5c9',
      followUpDate: created.follow_up_date || '',
      uniqueId: created.unique_id,
      active: created.monitoring_active,
      visibility: 'Assigned Only',
      managingDoctor: currentDoctor.name,
    }
    setRecords((current) => [...current, patient])
    setShowAddPatient(false)
    notify(response.message)
  }
  const reactivatePatient = async (uniqueId: string) => {
    const patient = records.find((item) => item.uniqueId.toLowerCase() === uniqueId.trim().toLowerCase())
    if (!patient) return notify('No patient account matches that Unique ID.')
    if (patient.active) return notify(`${patient.name} is already in active monitoring.`)
    try {
      const response = await api.reactivatePatient(uniqueId)
      setRecords((current) => current.map((item) => item.id === patient.id ? { ...item, active: true } : item))
      setShowAddPatient(false)
      notify(response.message)
    } catch (error) {
      notify(`Could not reactivate monitoring: ${error instanceof Error ? error.message : 'Server error'}`)
    }
  }

  const updateFollowUpDate = async (id: number, newDate: string) => {
    try {
      await api.updatePatientFollowUp(id, newDate)
      setRecords((current) => current.map((item) => item.id === id ? { ...item, followUpDate: newDate, priority: followUpPriority(newDate) } : item))
      notify('Follow-up date updated.')
    } catch (error) {
      notify(`Could not update follow-up date: ${error instanceof Error ? error.message : 'Server error'}`)
    }
  }

  const updatePatientVisibility = async (id: number, visibility: Patient['visibility'], selectedDoctors: number[] = []): Promise<boolean> => {
    try {
      const { patient: updated } = await api.updatePatientVisibility(id, visibility, selectedDoctors)
      setRecords((current) => current.map((item) => item.id === id ? { ...item, visibility: updated.visibility, selectedDoctors: updated.selected_doctor_ids } : item))
      return true
    } catch (error) {
      notify(`Could not update visibility: ${error instanceof Error ? error.message : 'Server error'}`)
      return false
    }
  }
  const archivePatient = async (patient: Patient) => {
    try {
      const response = await api.archivePatient(patient.id)
      setRecords((current) => current.map((item) => item.id === patient.id ? { ...item, active: false } : item))
      returnToRegistry()
      notify(response.message)
    } catch (error) {
      notify(`Could not archive monitoring: ${error instanceof Error ? error.message : 'Server error'}`)
    }
  }
  const returnToRegistry = () => { setSelectedPatientId(null); setActive('Registry'); window.scrollTo(0, 0) }
  const handleLogout = () => { clearAuthToken(); setIsLoggedIn(false); setSelectedPatientId(null); setActive('Registry') }
  const selectNav = (item: string) => { setActive(item); notify(`${item} prototype view selected`) }
  const saveProviderGoals = async (goals: ProviderGoal[]) => {
    if (selectedPatientId === null) return;
    try {
      const response = await api.saveProviderGoals(selectedPatientId, goals);
      setProviderGoals(response.goals);
      notify('Assigned goals saved.')
    } catch (err) {
      notify(`Could not save assigned goals: ${err instanceof Error ? err.message : 'Server error'}`)
    }
  }
// ✅ UPDATED CODE
const handleDoctorLogin = (user: AuthUser): void => {
  setCurrentDoctor(toDoctorSession(user))
  setIsLoggedIn(true)
  setActive('Registry')
}
const handleDoctorProfileUpdated = (profile: DoctorProfileDto) => {
  setCurrentDoctor((current) => ({
    ...current,
    name: profile.name,
    specialty: profile.specialty || 'VitalSync clinician',
    initials: profile.initials || 'DR',
    color: profile.color,
    email: profile.email,
  }))
}

  // 3. Action Handlers
  const handleAddNote = () => {
    if (!quickNote.trim()) return
    api.createDoctorNote(quickNote)
      .then(({ note }) => {
        setDoctorNotes((previous) => [note, ...previous])
        setQuickNote('')
        notify('Note saved successfully!')
      })
      .catch((error) => notify(`Could not save note: ${error instanceof Error ? error.message : 'Server error'}`))
  }

  const handleDeleteNote = (noteId: number) => {
    api.deleteDoctorNote(noteId)
      .then(() => {
        setDoctorNotes((previous) => previous.filter((note) => note.id !== noteId))
        notify('Note deleted.')
      })
      .catch((error) => notify(`Could not delete note: ${error instanceof Error ? error.message : 'Server error'}`))
  }

  if (!sessionReady) return <main aria-busy="true">Restoring session...</main>
  if (!isLoggedIn) return <LoginPage onLogin={handleDoctorLogin} />
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
            <button className={active === 'Notes' ? 'nav-item active' : 'nav-item'} onClick={() => setActive('Notes')}>Notes</button>
          </>
        )}
      </nav>
      <div className="sidebar-footer"><DoctorProfileCard initials={currentDoctor.initials} name={currentDoctor.name} specialty={currentDoctor.specialty} onProfile={() => selectNav('Profile')} onSettings={() => selectNav('Settings')} onLogout={handleLogout} /></div>
    </aside>
    <section className="workspace">
    {/* 4. Render Feature UI View */}
    {active === 'Notes' && (
      <NotesWidget 
        currentNote={quickNote} 
        notes={doctorNotes} 
        loading={notesLoading}
        onNoteChange={setQuickNote} 
        onAdd={handleAddNote} 
        onDelete={handleDeleteNote} 
      />
    )}
    {active !== 'Notes' && (active === 'Profile' ? <DoctorProfilePage onProfileUpdated={handleDoctorProfileUpdated} /> : active === 'Settings' ? <DoctorSettingsPage /> : active === 'Team' && !selectedPatient ? <TeamView doctors={directoryDoctors} /> : selectedPatient ? <PatientWorkspace patient={selectedPatient} active={active} providerGoals={providerGoals.filter((goal) => goal.patientUniqueId === selectedPatient.uniqueId)} currentDoctorName={currentDoctor.name} onSaveProviderGoals={saveProviderGoals} onReturn={returnToRegistry} onContact={() => setContactPatient(selectedPatient)} onReminder={() => toggleReminder(selectedPatient)} reminderSet={reminders.includes(selectedPatient.id)} onEdit={() => setFormPatient(selectedPatient)} onArchive={() => archivePatient(selectedPatient)} onUpdateFollowUp={updateFollowUpDate} onUpdateVisibility={updatePatientVisibility} doctors={directoryDoctors} /> : <PatientRegistry patients={records} onRequestOpen={setPendingPatient} onAdd={() => setShowAddPatient(true)} />)}
    </section>
    {contactPatient && <ContactModal patient={contactPatient} copied={copied} onMessage={() => openMessages(contactPatient)} onCopy={() => { setCopied(true); navigator.clipboard?.writeText(contactPatient.email); notify('Email address copied.'); window.setTimeout(() => setCopied(false), 1600) }} onClose={() => setContactPatient(null)} />}
    {formPatient && <PatientForm patient={formPatient} onSave={savePatient} onClose={() => setFormPatient(null)} />}
    {showAddPatient && <AddPatientModal patients={records} onNew={addNewPatient} onExisting={reactivatePatient} onClose={() => setShowAddPatient(false)} />}
    {pendingPatient && <OpenPatientModal patient={pendingPatient} onOpen={() => { goToPatient(pendingPatient); setPendingPatient(null) }} onClose={() => setPendingPatient(null)} />}
    {notice && <div className="toast">{notice}</div>}
  </main>
}

export function PatientsView({ patients, selected, onSelect, onContact, onReminder, reminders, onBack, onAdd, onEdit, onUpdateFollowUp, onUpdateVisibility, doctors }: { patients: Patient[]; selected: Patient | null; onSelect: (p: Patient) => void; onContact: (p: Patient) => void; onReminder: (p: Patient) => void; reminders: number[]; onBack: () => void; onAdd: () => void; onEdit: () => void; onUpdateFollowUp?: (id: number, d: string) => void; onUpdateVisibility?: (id: number, v: Patient['visibility'], s?: number[]) => Promise<boolean>; doctors?: Doctor[] }) {
  return <>
    <header className="patients-header"><div><p className="eyebrow">PATIENT MANAGEMENT</p><h1>Patients</h1><p className="header-copy">Monitor patient lifestyle progress and follow up when needed.</p></div><button className="primary" onClick={onAdd}>+ Add patient</button></header>
    <div className={selected ? 'patients-layout profile-open' : 'patients-layout'}>
      <aside className="patient-directory"><div className="directory-heading"><strong>All patients</strong><span>{patients.length}</span></div><div className="directory-search">⌕ <span>Search patients</span></div><div className="directory-list">{patients.map((p) => <button className={selected?.id === p.id ? 'directory-item selected' : 'directory-item'} onClick={() => onSelect(p)} key={p.id}><span className="avatar" style={{ background: p.color }}>{p.initials}</span><span><strong>{p.name}</strong><small>{p.care}</small><em className={`priority ${p.priority.toLowerCase()}`}>{p.priority}</em><em className="patient-type">{p.type}</em></span></button>)}</div></aside>
      {selected ? <PatientProfile patient={selected} onContact={() => onContact(selected)} onReminder={() => onReminder(selected)} reminderSet={reminders.includes(selected.id)} onBack={onBack} onEdit={onEdit} onArchive={() => undefined} onUpdateFollowUp={onUpdateFollowUp ?? (() => {})} onUpdateVisibility={onUpdateVisibility ?? (async () => false)} doctors={doctors ?? []} /> : <div className="select-patient"><div className="select-icon">♙</div><h2>Select a patient</h2><p>Choose a patient from the list to view their profile and lifestyle progress.</p></div>}
    </div>
  </>
}

function PatientRegistry({ patients, onRequestOpen, onAdd }: { patients: Patient[]; onRequestOpen: (patient: Patient) => void; onAdd: () => void }) {
  const [tab, setTab] = useState<Patient['type']>('Out-patient')
  const [query, setQuery] = useState('')
  const activePatients = patients.filter((patient) => patient.active && patient.type === tab && patient.name.toLowerCase().includes(query.trim().toLowerCase())).map((patient) => ({ ...patient, priority: followUpPriority(patient.followUpDate) })).sort((a, b) => ({ High: 0, Medium: 1, Low: 2 }[a.priority] - { High: 0, Medium: 1, Low: 2 }[b.priority]))
  return <section className="registry-page"><header className="patients-header"><div><p className="eyebrow">PATIENT REGISTRY</p><h1>Active Patients</h1><p className="header-copy">Review active lifestyle-monitoring patients and open their clinical workspace.</p></div><button className="primary" onClick={onAdd}>+ Add patient</button></header><div className="registry-controls"><div className="registry-tabs"><button className={tab === 'Out-patient' ? 'active' : ''} onClick={() => setTab('Out-patient')}>Outpatient</button><button className={tab === 'In-patient' ? 'active' : ''} onClick={() => setTab('In-patient')}>Inpatient</button></div><input aria-label="Search patients by name" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patients by name" /></div><div className="registry-list">{activePatients.map((patient) => <button className={`registry-card ${patient.priority.toLowerCase()}`} key={patient.id} onClick={() => onRequestOpen(patient)}><span className="avatar" style={{ background: patient.color }}>{patient.initials}</span><span><strong>{patient.name}</strong><small>{patient.uniqueId}</small><small>{patient.email}</small></span><em>{patient.priority}</em></button>)}{activePatients.length === 0 && <div className="registry-empty">No active {tab === 'In-patient' ? 'inpatients' : 'outpatients'} match this search.</div>}</div></section>
}

function PatientWorkspace({ patient, active, providerGoals, currentDoctorName, onSaveProviderGoals, onReturn, onContact, onReminder, reminderSet, onEdit, onArchive, onUpdateFollowUp, onUpdateVisibility, doctors }: { patient: Patient; active: string; providerGoals: ProviderGoal[]; currentDoctorName: string; onSaveProviderGoals: (goals: ProviderGoal[]) => void; onReturn: () => void; onContact: () => void; onReminder: () => void; reminderSet: boolean; onEdit: () => void; onArchive: () => void; onUpdateFollowUp: (id: number, newDate: string) => void; onUpdateVisibility: (id: number, v: Patient['visibility'], selected?: number[]) => Promise<boolean>; doctors: Doctor[] }) {
  if (active === 'Messages') return <MessagesView patients={[patient]} selected={patient} onSelect={() => undefined} />
  if (active === 'Goals') return <PatientGoalsView patient={patient} goals={providerGoals} currentDoctorName={currentDoctorName} onSave={onSaveProviderGoals} />
  if (active === 'History') return <HistoryView patient={patient} />
  return <PatientProfile patient={patient} onContact={onContact} onReminder={onReminder} reminderSet={reminderSet} onBack={onReturn} onEdit={onEdit} onArchive={onArchive} onUpdateFollowUp={onUpdateFollowUp} onUpdateVisibility={onUpdateVisibility} doctors={doctors} />
}

function PatientGoalsView({ patient, goals, currentDoctorName, onSave }: { patient: Patient; goals: ProviderGoal[]; currentDoctorName: string; onSave: (goals: ProviderGoal[]) => void }) {
  const [templateOpen, setTemplateOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<typeof providerGoalTemplates[number] | null>(null)
  const [menuGoalId, setMenuGoalId] = useState<number | null>(null)
  const [editingGoal, setEditingGoal] = useState<ProviderGoal | null>(null)
  const activeGoals = goals.filter((goal) => goal.status === 'Active' || goal.status === 'Paused')
  const updateGoal = (goalId: number, changes: Partial<ProviderGoal>) => onSave(goals.map((goal) => goal.id === goalId ? { ...goal, ...changes } : goal))

  const [patientLogs, setPatientLogs] = useState<GoalLog[]>([])
  const [logLoadError, setLogLoadError] = useState('')

  useEffect(() => {
    let active = true
    api.getPatientLogs(patient.id)
      .then(({ logs }) => { if (active) setPatientLogs(logs); })
      .catch((error) => { if (active) setLogLoadError(error instanceof Error ? error.message : 'Could not load patient logs.'); })
    return () => { active = false }
  }, [patient.id])

  return <section className="goals-page"><header className="patients-header"><div><p className="eyebrow">PATIENT GOALS</p><h1>Goals</h1><p className="header-copy">Goals assigned to {patient.name}.</p></div><button className="primary" onClick={() => setTemplateOpen(true)}>+ Assign Goal</button></header>
    {logLoadError && <p className="inline-note error" role="alert">{logLoadError}</p>}
    {activeGoals.length === 0 ? <div className="goals-empty"><div className="select-icon">✦</div><h2>No goals assigned yet</h2><p>Create a lifestyle goal to support this patient’s monitoring plan.</p><button className="primary" onClick={() => setTemplateOpen(true)}>+ Assign Goal</button></div> : <><div className="goals-section-heading"><h2>Active Goals</h2><span>{activeGoals.length}</span></div><div className="doctor-goals-list">{activeGoals.map((goal) => {
      const evaluation = evaluateGoal({ ...goal, targetValue: goal.targetValue ?? undefined }, patientLogs)
      return (
        <article className="doctor-goal-card" key={goal.id}><div className="doctor-goal-main"><div className="goal-symbol">✦</div><div><div className="doctor-goal-title"><h3>{goal.title}</h3><span className={`goal-status ${goal.status.toLowerCase()}`}>{goal.status}</span></div><p className="goal-category">{goal.category}</p><p className="goal-target"><strong>Target:</strong> {goal.target || 'Not specified'} · <strong>Frequency:</strong> {goal.frequency}</p>{evaluation.evaluable ? <><div className="progress-bar-bg" style={{ marginTop: '6px' }}><div className="progress-bar-fill" style={{ width: `${evaluation.percentage}%` }} /></div><p className="goal-target" style={{ marginTop: '4px' }}><strong>Progress:</strong> {evaluation.progressText}</p></> : <p className="goal-target" style={{ marginTop: '8px' }}>Progress not automatically evaluated</p>}<p className="goal-dates"><strong>Start:</strong> {goal.startDate} · <strong>Review:</strong> {goal.reviewDate}</p>{goal.instructions && <p className="goal-instructions">{goal.instructions}</p>}</div></div><div className="goal-actions-menu"><button aria-label={`Actions for ${goal.title}`} onClick={() => setMenuGoalId(menuGoalId === goal.id ? null : goal.id)}>•••</button>{menuGoalId === goal.id && <div className="goal-action-popover"><button onClick={() => { setEditingGoal(goal); setMenuGoalId(null) }}>Edit Goal</button><button onClick={() => { updateGoal(goal.id, { status: 'Paused' }); setMenuGoalId(null) }}>Pause Goal</button><button onClick={() => { updateGoal(goal.id, { status: 'Completed' }); setMenuGoalId(null) }}>Complete Goal</button></div>}</div></article>
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
  const [trackingMode, setTrackingMode] = useState<GoalTrackingMode>(() => getGoalTrackingMode(goal, template))
  const submit = (event: React.FormEvent) => { 
    event.preventDefault(); 
    const tracking = goalTrackingOptions[trackingMode]
    const previousTrackingMode = getGoalTrackingMode(goal, template)
    const targetValueText = target.match(/\d+(?:\.\d+)?/)?.[0]
    const targetValue = trackingMode === 'none'
      ? undefined
      : goal && trackingMode === previousTrackingMode
        ? goal.targetValue ?? undefined
        : template?.targetValue ?? (targetValueText ? Number(targetValueText) : undefined)
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
      evaluationType: tracking.evaluationType,
      targetValue,
      targetUnit: goal?.targetUnit,
      metricKey: 'metricKey' in tracking ? tracking.metricKey : undefined
    }) 
  }
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal goal-config-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><h2>{goal ? 'Edit Goal' : 'Configure Goal'}</h2><p>Set the details for {patient.name}.</p></div><button type="button" onClick={onClose}>×</button></div><div className="form-grid"><label>Goal<input required value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Nutrition</option><option>Physical Activity</option><option>Sleep</option><option>Stress</option><option>Social Connectedness</option><option>Medication</option><option>Other</option></select></label><label>Target<input required value={target} onChange={(event) => setTarget(event.target.value)} placeholder="e.g. 8 glasses/day" /></label><label>Frequency<select value={frequency} onChange={(event) => setFrequency(event.target.value as GoalFrequency)}><option>Daily</option><option>Weekdays</option><option>Weekly</option></select></label><label className="full-width">Progress measurement<select value={trackingMode} onChange={(event) => setTrackingMode(event.target.value as GoalTrackingMode)}>{Object.entries(goalTrackingOptions).map(([value, option]) => <option key={value} value={value}>{option.label}</option>)}</select></label><label>Start date<input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>Review date<input required type="date" value={reviewDate} onChange={(event) => setReviewDate(event.target.value)} /></label><label className="full-width">Instructions / Notes<textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Optional instructions for the patient" /></label></div><div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary" type="submit">{goal ? 'Save changes' : 'Assign Goal'}</button></div></form></div>
}

function PatientProfile({ patient, onContact, onReminder, reminderSet, onBack, onEdit, onArchive, onUpdateFollowUp, onUpdateVisibility, doctors }: { patient: Patient; onContact: () => void; onReminder: () => void; reminderSet: boolean; onBack: () => void; onEdit: () => void; onArchive: () => void; onUpdateFollowUp: (id: number, newDate: string) => void; onUpdateVisibility: (id: number, v: Patient['visibility'], selected?: number[]) => Promise<boolean>; doctors: Doctor[] }) {
  const [followUp, setFollowUp] = useState(patient.followUpDate)
  const [vis, setVis] = useState<Patient['visibility']>(patient.visibility)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedDoctors, setSelectedDoctors] = useState<number[]>(patient.selectedDoctors ?? [])
  const [visibilitySaving, setVisibilitySaving] = useState(false)
  const handleFollowUp = (val: string) => { setFollowUp(val); onUpdateFollowUp(patient.id, val) }
  const saveVisibility = async (visibility: Patient['visibility'], doctorIds: number[] = []) => {
    setVisibilitySaving(true)
    const saved = await onUpdateVisibility(patient.id, visibility, doctorIds)
    setVisibilitySaving(false)
    if (saved) {
      setVis(visibility)
      setSelectedDoctors(doctorIds)
      if (visibility === 'Selected Doctors') setPickerOpen(false)
    }
  }
  const handleVisibility = (visibility: Patient['visibility']) => {
    if (visibility === 'Selected Doctors') {
      setPickerOpen(true)
      return
    }
    void saveVisibility(visibility)
  }
  const selectedDoctorNames = doctors.filter((doctor) => selectedDoctors.includes(doctor.id)).map((doctor) => doctor.name)
  return <section className="patient-profile"><button className="back-button" onClick={onBack}>← Return to Registry</button><article className="profile-hero"><div className="profile-person"><span className="avatar profile-avatar" style={{ background: patient.color }}>{patient.initials}</span><div><h2>{patient.name}</h2><p>{patient.age} years old · {patient.residence}</p><p className="care-label">{patient.care}</p></div></div><div className="profile-actions"><button onClick={onContact}>Contact</button><button onClick={onReminder}>{reminderSet ? 'Reminder enabled' : 'Enable reminder'}</button><button className="edit-button" onClick={onEdit}>Manage</button><button className="archive-button" onClick={onArchive}>Archive monitoring</button></div></article>
    <div className="profile-grid">
      <article className="profile-card"><h3>Patient information</h3>
        <dl>
          <div><dt>Unique ID</dt><dd>{patient.uniqueId}</dd></div>
          <div><dt>Visibility</dt><dd>
            <select className="patient-control patient-visibility-control" aria-label="Patient visibility" value={vis} disabled={visibilitySaving} onChange={(e) => handleVisibility(e.target.value as Patient['visibility'])}>
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
      <article className="profile-card"><h3>Today’s log</h3><PatientTodayLogSummary patientId={patient.id} /></article>
    </div>
    <RecentActivitySummary patientId={patient.id} patientName={patient.name} />
    {pickerOpen && <div className="modal-backdrop" onMouseDown={() => { if (!visibilitySaving) setPickerOpen(false) }}><section className="modal doctor-picker-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><h2>Select doctors</h2><p>Choose which doctors can access this patient.</p></div><button type="button" disabled={visibilitySaving} onClick={() => setPickerOpen(false)}>×</button></div><DoctorPicker doctors={doctors} selectedIds={selectedDoctors} onChange={setSelectedDoctors} /><div className="modal-actions"><button type="button" disabled={visibilitySaving} onClick={() => setPickerOpen(false)}>Cancel</button><button type="button" className="primary" disabled={visibilitySaving} onClick={() => void saveVisibility('Selected Doctors', selectedDoctors)}>{visibilitySaving ? 'Saving...' : 'Confirm selection'}</button></div></section></div>}
  </section>
}

function ContactModal({ patient, copied, onMessage, onCopy, onClose }: { patient: Patient; copied: boolean; onMessage: () => void; onCopy: () => void; onClose: () => void }) { return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal contact-modal" onMouseDown={(e) => e.stopPropagation()}><div className="modal-heading"><div><h2>Contact {patient.name}</h2><p>Reach them securely through VitalSync.</p></div><button onClick={onClose}>×</button></div><div className="contact-buttons single"><button onClick={onMessage}><span>◌</span>Open secure message</button></div><div className="email-row"><div><small>EMAIL ADDRESS</small><strong>{patient.email}</strong></div><button onClick={onCopy}>{copied ? 'Copied!' : 'Copy email'}</button></div></section></div> }
function OpenPatientModal({ patient, onOpen, onClose }: { patient: Patient; onOpen: () => void; onClose: () => void }) { return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><h2>Open patient workspace?</h2><p>Confirm the patient before entering their chart.</p></div><button onClick={onClose}>×</button></div><dl className="confirmation-details"><div><dt>Patient name</dt><dd>{patient.name}</dd></div><div><dt>Unique ID</dt><dd>{patient.uniqueId}</dd></div><div><dt>Email</dt><dd>{patient.email}</dd></div><div><dt>Priority</dt><dd>{patient.priority}</dd></div></dl><div className="modal-actions"><button onClick={onClose}>Cancel</button><button className="primary" onClick={onOpen}>Open Patient</button></div></section></div> }

function PatientTodayLogSummary({ patientId }: { patientId: number }) {
  const [logs, setLogs] = useState<GoalLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    api.getPatientLogs(patientId)
      .then(({ logs: patientLogs }: { logs: GoalLog[] }) => {
        if (active) setLogs(patientLogs.filter((log) => log.date === new Date().toISOString().slice(0, 10)).sort((a, b) => a.time.localeCompare(b.time)))
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Could not load today’s logs.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [patientId])

  if (loading) return <p className="muted">Loading today’s logs...</p>
  if (error) return <p className="inline-note error" role="alert">{error}</p>
  if (logs.length === 0) return <p className="muted">No logs recorded today.</p>

  const labels: Record<string, string> = {
    food: 'Food', medication: 'Medication', activity: 'Physical activity', sleep: 'Sleep',
    stress: 'Stress reflection', social: 'Social reflection', habit: 'Lifestyle habits',
  }
  return <div>{logs.map((log) => <div className="log-summary" key={log.id}><span>•</span><div><strong>{labels[log.type] ?? log.type}: {log.title}</strong><p>{log.time} · {log.detail}</p></div></div>)}</div>
}

function AddPatientModal({ onNew, onExisting, onClose, patients }: { onNew: (name: string, email: string, phone?: string) => void; onExisting: (uniqueId: string) => void; onClose: () => void; patients: Patient[] }) {
  const [mode, setMode] = useState<'new' | 'existing'>('new')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [uniqueId, setUniqueId] = useState('')
  const [query, setQuery] = useState('')
  const [confirm, setConfirm] = useState<Patient | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const results = patients.filter((p) => !p.active && p.name.toLowerCase().includes(query.trim().toLowerCase()))
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === 'new') {
      setSubmitting(true)
      setError('')
      try {
        await onNew(name, email)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not create the patient account.')
      } finally {
        setSubmitting(false)
      }
    } else {
      onExisting(uniqueId)
    }
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
    </div>}{error && <div className="inline-note error" role="alert">{error}</div>}<div className="modal-actions"><button type="button" onClick={onClose} disabled={submitting}>Cancel</button><button className="primary" type="submit" disabled={submitting}>{submitting ? 'Creating account…' : mode === 'new' ? 'Add Patient' : 'Reactivate Monitoring'}</button></div></form></div>
}
function PatientForm({ patient, onSave, onClose }: { patient: Patient; onSave: (patientId: number, changes: { name: string; careFocus: string; patientType: Patient['type']; priority: Patient['priority'] }) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState(patient.name)
  const [careFocus, setCareFocus] = useState(patient.care)
  const [patientType, setPatientType] = useState<Patient['type']>(patient.type)
  const [priority, setPriority] = useState<Patient['priority']>(patient.priority)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(patient.id, { name, careFocus, patientType, priority })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not update patient.')
    } finally {
      setSaving(false)
    }
  }
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal patient-form" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><h2>Edit patient monitoring</h2><p>Update the patient’s care focus and monitoring details.</p></div><button type="button" disabled={saving} onClick={onClose}>×</button></div><div className="form-grid"><label>Full name<input required maxLength={255} value={name} onChange={(event) => setName(event.target.value)} /></label><label>Care focus<input required maxLength={255} value={careFocus} onChange={(event) => setCareFocus(event.target.value)} /></label><label>Patient type<select value={patientType} onChange={(event) => setPatientType(event.target.value as Patient['type'])}><option>Out-patient</option><option>In-patient</option></select></label><label>Priority level<select value={priority} onChange={(event) => setPriority(event.target.value as Patient['priority'])}><option>High</option><option>Medium</option><option>Low</option></select></label></div>{error && <p className="inline-note error" role="alert">{error}</p>}<div className="form-footer"><span>Contact details and date of birth are managed in the patient’s own profile.</span><button className="primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button></div></form></div>
}
function formatConversationTime(value: string) {
  const timestamp = new Date(value)
  return Number.isNaN(timestamp.getTime()) ? value : timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function MessagesView({ patients, selected, onSelect }: { patients: Patient[]; selected: Patient; onSelect: (id: number) => void }) {
  const [draft, setDraft] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [conversationStatus, setConversationStatus] = useState('Messages are private and recorded in the patient’s communication history.')
  const [pinned, setPinned] = useState(false)
  const [notificationPreference, setNotificationPreference] = useState('All messages')
  const [patientInfoOpen, setPatientInfoOpen] = useState(false)
  const [importantNext, setImportantNext] = useState(false)
  const [messages, setMessages] = useState<Record<number, PatientConversationMessage[]>>({})
  const [messagesLoading, setMessagesLoading] = useState(true)
  const [messagesError, setMessagesError] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    let active = true
    setMessagesLoading(true)
    setMessagesError('')
    api.getPatientMessages(selected.id)
      .then(({ messages: thread }) => { if (active) setMessages((current) => ({ ...current, [selected.id]: thread })); })
      .catch((error) => { if (active) setMessagesError(error instanceof Error ? error.message : 'Could not load messages.'); })
      .finally(() => { if (active) setMessagesLoading(false); })
    return () => { active = false }
  }, [selected.id])

  useEffect(() => {
    let active = true
    setPinned(false)
    setNotificationPreference('All messages')
    api.getConversationPreferences('patient', selected.id)
      .then(({ preferences }) => {
        if (!active) return
        setPinned(preferences.pinned)
        setNotificationPreference(preferences.notificationPreference)
      })
      .catch((error) => {
        if (active) setMessagesError(error instanceof Error ? error.message : 'Could not load conversation preferences.')
      })
    return () => { active = false }
  }, [selected.id])

  const current = messages[selected.id] ?? []
  const filteredMessages = notificationPreference === 'Important only' ? current.filter((message) => message.important) : notificationPreference === 'Muted' ? current.filter((message) => !message.important) : current
  const send = async () => {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setMessagesError('')
    try {
      const { message } = await api.sendPatientMessage(selected.id, text, importantNext)
      setMessages((all) => ({ ...all, [selected.id]: [...(all[selected.id] ?? []), message] }))
      setDraft('')
      setImportantNext(false)
    } catch (error) {
      setMessagesError(error instanceof Error ? error.message : 'Could not send message.')
    } finally {
      setSending(false)
    }
  }
  const saveConversationPreferences = async (changes: { pinned?: boolean; notificationPreference?: 'All messages' | 'Important only' | 'Muted' }) => {
    try {
      const { preferences } = await api.updateConversationPreferences('patient', selected.id, changes)
      setPinned(preferences.pinned)
      setNotificationPreference(preferences.notificationPreference)
      setMessagesError('')
    } catch (error) {
      setMessagesError(error instanceof Error ? error.message : 'Could not save conversation preferences.')
    }
  }
  return <>
    <header className="patients-header"><div><p className="eyebrow">SECURE COMMUNICATION</p><h1>Messages</h1><p className="header-copy">Private conversations between you and your assigned patients.</p></div></header>
    <div className="messages-layout">
      <aside className="message-directory"><div className="directory-heading"><strong>Conversations</strong><span>{patients.length}</span></div><div className="directory-list">{patients.map((p) => { const latest = messages[p.id]?.at(-1); return <button key={p.id} className={selected.id === p.id ? 'directory-item selected' : 'directory-item'} onClick={() => onSelect(p.id)}><span className="avatar" style={{ background: p.color }}>{p.initials}</span><span><strong>{p.name}</strong><small>{latest?.text || 'No messages yet'}</small></span></button> })}</div></aside>
      <section className="chat-panel"><header className="chat-header"><span className="avatar" style={{ background: selected.color }}>{selected.initials}</span><div><h2>{selected.name}</h2><p><i className="online-dot" />Active today</p></div><div className="conversation-menu-wrap"><button type="button" aria-label="Conversation settings" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>•••</button>{menuOpen && <div className="conversation-menu"><button type="button" onClick={() => { void saveConversationPreferences({ pinned: !pinned }); setConversationStatus(pinned ? 'Conversation unpinned.' : 'Conversation pinned for quick access.'); setMenuOpen(false) }}>{pinned ? 'Unpin conversation' : 'Pin conversation'}</button><label className="notification-choice">Notifications<select aria-label="Notification preference" value={notificationPreference} onChange={(event) => { const value = event.target.value as 'All messages' | 'Important only' | 'Muted'; void saveConversationPreferences({ notificationPreference: value }); setConversationStatus(value === 'Important only' ? 'Showing only important messages.' : value === 'Muted' ? 'Showing non-priority messages.' : 'Showing all messages in this conversation.') }}><option>All messages</option><option>Important only</option><option>Muted</option></select></label><button type="button" onClick={() => { setPatientInfoOpen(true); setMenuOpen(false) }}>View patient information</button></div>}</div></header>
        <div className="chat-notice">{conversationStatus}</div>{messagesLoading && <p className="muted">Loading messages...</p>}{messagesError && <p className="inline-note error" role="alert">{messagesError}</p>}<div className="messages">{filteredMessages.map((message) => <div className={`bubble-row ${message.sender}`} key={message.id}><div className={`bubble ${message.important ? 'important' : ''}`} title={message.important ? 'Important message' : undefined} tabIndex={message.important ? 0 : undefined}>{message.text}<small>{formatConversationTime(message.time)}</small></div></div>)}</div><div className="message-compose"><button type="button" className={importantNext ? 'important-toggle active' : 'important-toggle'} onClick={() => setImportantNext((value) => !value)}>Important</button><input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void send()} placeholder={`Message ${selected.name.split(' ')[0]}...`} /><button type="button" disabled={sending || !draft.trim()} onClick={() => void send()}>{sending ? 'Sending...' : 'Send ↑'}</button></div>
      </section>
    </div>
    {patientInfoOpen && <div className="modal-backdrop" onMouseDown={() => setPatientInfoOpen(false)}><section className="modal contact-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><h2>{selected.name}</h2><p>Patient contact information</p></div><button type="button" onClick={() => setPatientInfoOpen(false)}>×</button></div><dl className="confirmation-details"><div><dt>Unique ID</dt><dd>{selected.uniqueId || 'Not available'}</dd></div><div><dt>Email</dt><dd>{selected.email || 'Not available'}</dd></div><div><dt>Phone</dt><dd>{selected.phone || 'Not available'}</dd></div><div><dt>Care focus</dt><dd>{selected.care}</dd></div></dl></section></div>}
  </>
}
function TeamMessagesView({ doctors }: { doctors: Doctor[] }) {
  const [messages, setMessages] = useState<TeamMessageDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [selectedId, setSelectedId] = useState(doctors[0]?.id ?? 0)
  const [draft, setDraft] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [notificationPreference, setNotificationPreference] = useState('All messages')
  const [preferenceError, setPreferenceError] = useState('')
  const [teamInfoOpen, setTeamInfoOpen] = useState(false)
  const [importantNext, setImportantNext] = useState(false)
  const [conversationStatus, setConversationStatus] = useState('Messages are private and recorded in the team communication history.')
  const [reloadKey, setReloadKey] = useState(0)

  const chatData = doctors.filter((doctor) => !doctor.isCurrent).map((doctor) => ({ ...doctor, role: doctor.specialty || 'Doctor' }))
  const matches = chatData.filter((doctor) => doctor.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) || doctor.role.toLowerCase().includes(searchQuery.trim().toLowerCase()))
  const safeSelected = matches.find((doctor) => doctor.id === selectedId) ?? matches[0] ?? chatData[0]
  const selected = safeSelected ?? chatData[0]
  const selectedDoctorId = selected?.id
  useEffect(() => {
    if (selectedDoctorId === undefined) {
      setMessages([])
      return
    }
    let active = true
    setLoading(true)
    setError('')
    api.getTeamMessages(selectedDoctorId)
      .then(({ messages: conversation }) => { if (active) setMessages(conversation) })
      .catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Could not load team messages.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [selectedDoctorId, reloadKey])

  useEffect(() => {
    if (selectedDoctorId === undefined) return
    let active = true
    setPreferenceError('')
    setPinned(false)
    setNotificationPreference('All messages')
    api.getConversationPreferences('doctor', selectedDoctorId)
      .then(({ preferences }) => {
        if (!active) return
        setPinned(preferences.pinned)
        setNotificationPreference(preferences.notificationPreference)
      })
      .catch((requestError) => {
        if (active) setPreferenceError(requestError instanceof Error ? requestError.message : 'Could not load conversation preferences.')
      })
    return () => { active = false }
  }, [selectedDoctorId])

  const filteredMessages = notificationPreference === 'Important only' ? messages.filter((message) => message.important) : notificationPreference === 'Muted' ? messages.filter((message) => !message.important) : messages

  const send = async () => {
    const text = draft.trim()
    if (!selected || !text || sending) return
    setSending(true)
    setError('')
    try {
      const { message } = await api.sendTeamMessage(selected.id, text, importantNext)
      setMessages((current) => [...current, message])
      setDraft('')
      setImportantNext(false)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not send team message.')
    } finally {
      setSending(false)
    }
  }
  const saveConversationPreferences = async (changes: { pinned?: boolean; notificationPreference?: 'All messages' | 'Important only' | 'Muted' }) => {
    if (!selected) return
    try {
      const { preferences } = await api.updateConversationPreferences('doctor', selected.id, changes)
      setPinned(preferences.pinned)
      setNotificationPreference(preferences.notificationPreference)
      setPreferenceError('')
    } catch (requestError) {
      setPreferenceError(requestError instanceof Error ? requestError.message : 'Could not save conversation preferences.')
    }
  }
  if (!selected) return <section className="team-messages-view"><h1>Team messaging</h1><p className="muted">No other doctor accounts are available.</p></section>
  if (loading) return <section className="team-messages-view"><h1>Team messaging</h1><p className="muted">Loading messages...</p></section>
  if (error) return <section className="team-messages-view"><h1>Team messaging</h1><p className="inline-note error" role="alert">{error}</p><button type="button" onClick={() => setReloadKey((key) => key + 1)}>Retry</button></section>
  return <section className="team-messages-view"><header className="patients-header"><div><p className="eyebrow">TEAM COMMUNICATION</p><h1>Team messaging</h1><p className="header-copy">Message the care team directly using the clinic’s active team channels.</p></div></header><div className="messages-layout"><aside className="message-directory"><div className="directory-heading"><strong>Care team</strong><span>{chatData.length}</span></div><label className="directory-search"><span>⌕</span><input aria-label="Search team contacts" type="search" placeholder="Search team contacts" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} /></label><div className="directory-list">{matches.map((doctor) => <button key={doctor.id} type="button" className={selected.id === doctor.id ? 'directory-item selected' : 'directory-item'} onClick={() => setSelectedId(doctor.id)}><span className="avatar" style={{ background: doctor.color }}>{doctor.initials}</span><span><strong>{doctor.name}</strong><small>{doctor.role}</small></span></button>)}</div>{matches.length === 0 && <div className="search-empty">No team members match this search.</div>}</aside><section className="chat-panel"><header className="chat-header"><span className="avatar" style={{ background: selected.color }}>{selected.initials}</span><div><h2>{selected.name}</h2><p>{selected.role}</p></div><div className="conversation-menu-wrap"><button type="button" aria-label="Conversation settings" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>•••</button>{menuOpen && <div className="conversation-menu"><button type="button" onClick={() => { void saveConversationPreferences({ pinned: !pinned }); setConversationStatus(pinned ? 'Conversation unpinned.' : 'Conversation pinned for quick access.'); setMenuOpen(false) }}>{pinned ? 'Unpin conversation' : 'Pin conversation'}</button><label className="notification-choice">Notifications<select aria-label="Notification preference" value={notificationPreference} onChange={(event) => { const value = event.target.value as 'All messages' | 'Important only' | 'Muted'; void saveConversationPreferences({ notificationPreference: value }); setConversationStatus(value === 'Important only' ? 'Showing only important messages.' : value === 'Muted' ? 'Showing non-priority messages.' : 'Showing all messages in this conversation.') }}><option>All messages</option><option>Important only</option><option>Muted</option></select></label><button type="button" onClick={() => { setTeamInfoOpen(true); setMenuOpen(false) }}>View team member information</button></div>}</div></header><div className="chat-notice">{preferenceError || conversationStatus}</div><div className="messages">{filteredMessages.map((message, index) => <div className={`bubble-row ${message.side}`} key={`${message.time}-${index}`}><div className={`bubble ${message.important ? 'important' : ''}`} title={message.important ? 'Important message' : undefined} tabIndex={message.important ? 0 : undefined}>{message.text}<small>{message.time}</small></div></div>)}</div><div className="message-compose"><button type="button" className={importantNext ? 'important-toggle active' : 'important-toggle'} onClick={() => setImportantNext((value) => !value)}>Important</button><input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder={`Message ${selected.name.split(' ')[0]}...`} /><button type="button" onClick={send}>Send ↑</button></div></section></div>
    {teamInfoOpen && <div className="modal-backdrop" onMouseDown={() => setTeamInfoOpen(false)}><section className="modal contact-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><h2>{selected.name}</h2><p>Team member information</p></div><button type="button" onClick={() => setTeamInfoOpen(false)}>×</button></div><dl className="confirmation-details"><div><dt>Role</dt><dd>{selected.role}</dd></div><div><dt>Status</dt><dd>Active team channel</dd></div></dl></section></div>}
  </section>
}
function TeamView({ doctors }: { doctors: Doctor[] }) {
  return <TeamMessagesView doctors={doctors} />
}
function HistoryView({ patient }: { patient: Patient }) {
  const [episodes, setEpisodes] = useState<MonitoringHistoryEpisodeDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    api.getMonitoringHistory(patient.id)
      .then(({ episodes: history }) => { if (active) setEpisodes(history) })
      .catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Could not load monitoring history.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [patient.id])

  const formatDate = (value: string | null) => value
    ? new Date(`${value}T12:00:00`).toLocaleDateString()
    : 'Date not recorded'

  return <><header className="patients-header"><div><p className="eyebrow">LONGITUDINAL RECORD</p><h1>Monitoring history</h1><p className="header-copy">Recorded changes in this patient’s monitoring relationship.</p></div></header><section className="history-panel">
    <div className="history-privacy"><span>⌁</span><p><b>Restricted clinical history</b> · Access is limited to authorized clinicians.</p></div>
    <article className="history-patient"><span className="avatar profile-avatar" style={{ background: patient.color }}>{patient.initials}</span><div><h2>{patient.name}</h2><p>{patient.age} years old</p><span className="patient-type">{patient.type}</span></div></article>
    <div className="timeline-heading"><div><h2>Monitoring episodes</h2><p>Episode dates are recorded when monitoring starts or ends.</p></div><span>{episodes.length} record{episodes.length === 1 ? '' : 's'}</span></div>
    {loading && <p className="muted">Loading monitoring history...</p>}
    {error && <p className="inline-note error" role="alert">{error}</p>}
    {!loading && !error && episodes.length === 0 && <p className="muted">No monitoring history has been recorded.</p>}
    <div className="timeline">{episodes.map((episode, index) => <article className="episode" key={episode.id}><div className="timeline-marker"><i className={episode.status === 'Current' ? 'current' : ''} />{index < episodes.length - 1 && <b />}</div><div className="episode-card"><div className="episode-top"><div><h3>{episode.careFocus}</h3><p>{formatDate(episode.startedAt)} – {episode.endedAt ? formatDate(episode.endedAt) : 'Ongoing'}</p></div><span className={episode.status === 'Current' ? 'episode-status current' : 'episode-status'}>{episode.status}</span></div><footer><span>Managing doctor: <b>{episode.managingDoctor || 'Not available'}</b></span></footer></div></article>)}</div>
  </section></>
}
// 5. Standalone React Component
function NotesWidget({
  currentNote,
  notes,
  loading,
  onNoteChange,
  onAdd,
  onDelete
}: {
  currentNote: string
  notes: DoctorNoteDto[]
  loading: boolean
  onNoteChange: (val: string) => void
  onAdd: () => void
  onDelete: (noteId: number) => void
}) {
  return (
    <div style={{ padding: '1.5rem', background: '#fff', borderRadius: '8px' }}>
      <h2>Doctor Reminders & Notes</h2>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          value={currentNote}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Type a clinical note or reminder..."
          style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button onClick={onAdd} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
          Add Note
        </button>
      </div>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {loading ? (
          <p className="muted">Loading notes...</p>
        ) : notes.length === 0 ? (
          <p style={{ color: '#888' }}>No notes saved yet.</p>
        ) : (
          notes.map((note) => (
            <li
              key={note.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.5rem 0',
                borderBottom: '1px solid #eee'
              }}
            >
              <span>{note.text}</span>
              <button onClick={() => onDelete(note.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>
                Remove
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

export default App
