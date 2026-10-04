import { useState } from 'react'
import type { Patient } from '../types/patient'
import type { ProviderGoal } from '../types/providerGoal'
import { evaluateGoal, type GoalFrequency } from '../lib/goalEvaluator'

const providerGoalTemplates = [
  { id: 'eat-veg', title: 'Eat more vegetables', category: 'Nutrition', target: '1 serving', frequency: 'Daily', evaluationType: 'indicator' as const, targetValue: 1, metricKey: 'food' },
  { id: 'drink-water', title: 'Drink more water', category: 'Nutrition', target: '8 glasses', frequency: 'Daily', evaluationType: 'indicator' as const, targetValue: 1, metricKey: 'food' },
  { id: 'walk-every-day', title: 'Walk every day', category: 'Physical Activity', target: '30 minutes', frequency: 'Daily', evaluationType: 'duration' as const, targetValue: 30, metricKey: 'activity' },
  { id: 'improve-sleep', title: 'Improve sleep schedule', category: 'Sleep', target: '7 hours', frequency: 'Daily', evaluationType: 'duration' as const, targetValue: 7, metricKey: 'sleep' },
  { id: 'stress-management', title: 'Practice stress management', category: 'Stress', target: '10 minutes', frequency: 'Daily', evaluationType: 'reflection' as const, targetValue: 1, metricKey: 'stress' },
  { id: 'social-time', title: 'Spend quality time', category: 'Social Connectedness', target: '3 times', frequency: 'Weekly', evaluationType: 'reflection' as const, targetValue: 3, metricKey: 'social' },
  { id: 'custom', title: 'Build My Own Goal', category: 'Other', target: '', frequency: 'Daily', evaluationType: 'none' as const },
]

export function PatientGoalsView({ patient, goals, currentDoctorName, onSave }: { patient: Patient; goals: ProviderGoal[]; currentDoctorName: string; onSave: (goals: ProviderGoal[]) => void }) {
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
      return parsed.filter((log: any) => (log.patientUniqueId || 'VS-0002') === patientUniqueId)
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
      return <article className="doctor-goal-card" key={goal.id}><div className="doctor-goal-main"><div className="goal-symbol">✦</div><div><div className="doctor-goal-title"><h3>{goal.title}</h3><span className={`goal-status ${goal.status.toLowerCase()}`}>{goal.status}</span></div><p className="goal-category">{goal.category}</p><p className="goal-target"><strong>Target:</strong> {goal.target || 'Not specified'} · <strong>Frequency:</strong> {goal.frequency}</p><div className="progress-bar-bg" style={{ marginTop: '6px' }}><div className="progress-bar-fill" style={{ width: `${displayPercentage}%` }} /></div><p className="goal-target" style={{ marginTop: '4px' }}><strong>Progress:</strong> {displayProgressText}</p><p className="goal-dates"><strong>Start:</strong> {goal.startDate} · <strong>Review:</strong> {goal.reviewDate}</p>{goal.instructions && <p className="goal-instructions">{goal.instructions}</p>}</div></div><div className="goal-actions-menu"><button aria-label={`Actions for ${goal.title}`} onClick={() => setMenuGoalId(menuGoalId === goal.id ? null : goal.id)}>•••</button>{menuGoalId === goal.id && <div className="goal-action-popover"><button onClick={() => { setEditingGoal(goal); setMenuGoalId(null) }}>Edit Goal</button><button onClick={() => { updateGoal(goal.id, { status: 'Paused' }); setMenuGoalId(null) }}>Pause Goal</button><button onClick={() => { updateGoal(goal.id, { status: 'Completed' }); setMenuGoalId(null) }}>Complete Goal</button></div>}</div></article>
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
  const submit = (event: React.FormEvent) => { event.preventDefault(); onSave({ id: goal?.id ?? Date.now(), patientUniqueId: patient.uniqueId, title, category, target, frequency, startDate, reviewDate, instructions, status: goal?.status ?? 'Active', progressPercent: goal?.progressPercent ?? 0, assignedBy: goal?.assignedBy ?? currentDoctorName, evaluationType: goal?.evaluationType ?? template?.evaluationType ?? 'none', targetValue: goal?.targetValue ?? template?.targetValue, metricKey: goal?.metricKey ?? template?.metricKey }) }
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal goal-config-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><h2>{goal ? 'Edit Goal' : 'Configure Goal'}</h2><p>Set the details for {patient.name}.</p></div><button type="button" onClick={onClose}>×</button></div><div className="form-grid"><label>Goal<input required value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Nutrition</option><option>Physical Activity</option><option>Sleep</option><option>Stress</option><option>Social Connectedness</option><option>Medication</option><option>Other</option></select></label><label>Target<input required value={target} onChange={(event) => setTarget(event.target.value)} placeholder="e.g. 8 glasses/day" /></label><label>Frequency<select value={frequency} onChange={(event) => setFrequency(event.target.value as GoalFrequency)}><option>Daily</option><option>Weekdays</option><option>Weekly</option></select></label><label>Start date<input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>Review date<input required type="date" value={reviewDate} onChange={(event) => setReviewDate(event.target.value)} /></label><label className="full-width">Instructions / Notes<textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Optional instructions for the patient" /></label></div><div className="modal-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary" type="submit">{goal ? 'Save changes' : 'Assign Goal'}</button></div></form></div>
}
